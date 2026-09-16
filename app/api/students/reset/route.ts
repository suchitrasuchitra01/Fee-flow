import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, due_fee = 45000, paid_fee = 55000, total_fee = 100000, fine_fee = 0 } = body;

    if (!student_id) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 });
    }

    const service = serviceClient();
    const { data: updated, error } = await service
      .from("students")
      .update({
        total_fee: Number(total_fee),
        paid_fee: Number(paid_fee),
        due_fee: Number(due_fee),
        fine_fee: Number(fine_fee),
      })
      .eq("student_id", student_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, student: updated });
  } catch (err: any) {
    console.error("Reset fee error:", err);
    return NextResponse.json({ error: err?.message || "Failed to reset fees" }, { status: 500 });
  }
}
