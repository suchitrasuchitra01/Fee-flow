import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type StudentInput = {
  id?: string;
  student_id: string;
  name: string;
  email: string;
  total_fee: number;
  paid_fee: number;
  fine_fee: number;
};

const defaultPassword = process.env.STUDENT_DEFAULT_PASSWORD || "SITS@2024";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseStudent(value: unknown): StudentInput {
  const record = value as Record<string, unknown>;
  const text = (key: string) => String(record?.[key] ?? "").trim();
  const money = (key: string) => Number(record?.[key] ?? 0);
  const student = {
    id: text("id") || undefined,
    student_id: text("student_id"),
    name: text("name"),
    email: text("email").toLowerCase(),
    total_fee: money("total_fee"),
    paid_fee: money("paid_fee"),
    fine_fee: money("fine_fee"),
  };

  if (!student.student_id || !student.name || !/^\S+@\S+\.\S+$/.test(student.email)) {
    throw new Error("Each student needs a student_id, name, and valid email address.");
  }
  if ([student.total_fee, student.paid_fee, student.fine_fee].some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new Error("Fee amounts must be zero or positive numbers.");
  }
  return student;
}

async function assertAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("You must sign in as an administrator.");

  const service = serviceClient();
  const { data: { user }, error: authError } = await service.auth.getUser(token);
  if (!user) {
    console.error("Student management session validation failed:", authError);
    throw new Error("Your administrator session could not be verified. Please sign out and sign in again.");
  }
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Only administrators can manage student accounts.");
  return service;
}

async function findUserByEmail(service: ReturnType<typeof serviceClient>, email: string) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

async function saveStudent(service: ReturnType<typeof serviceClient>, student: StudentInput) {
  let user = await findUserByEmail(service, student.email);
  let created = false;

  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email: student.email,
      password: defaultPassword,
      email_confirm: true,
    });
    if (error || !data.user) throw error || new Error("Could not create the student login.");
    user = data.user;
    created = true;
  }

  const due_fee = Math.max(0, student.total_fee - student.paid_fee);
  const { error: profileError } = await service.from("profiles").upsert({ id: user.id, role: "student" });
  if (profileError) throw profileError;

  const { error: studentError } = await service.from("students").upsert({
    id: user.id,
    student_id: student.student_id,
    name: student.name,
    email: student.email,
    total_fee: student.total_fee,
    paid_fee: student.paid_fee,
    due_fee,
    fine_fee: student.fine_fee,
  });
  if (studentError) throw studentError;

  return { created, id: user.id };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = await assertAdmin(request);
    const records = Array.isArray(body.students) ? body.students : [body];
    if (!records.length) return NextResponse.json({ error: "No student rows were provided." }, { status: 400 });

    const results = await Promise.all(records.map(async (record: unknown, index: number) => {
      try {
        const result = await saveStudent(service, parseStudent(record));
        return { row: index + 1, ...result };
      } catch (error) {
        return { row: index + 1, error: error instanceof Error ? error.message : "Could not save this student." };
      }
    }));
    const failed = results.filter((result) => "error" in result);
    const created = results.filter((result) => "created" in result && result.created).length;
    const updated = results.length - failed.length - created;
    return NextResponse.json({ created, updated, failed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not manage student accounts." }, { status: 400 });
  }
}
