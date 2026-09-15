"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Student } from "@/lib/types";
import { currency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

type StudentForm = Pick<Student, "student_id" | "name" | "email" | "total_fee" | "paid_fee" | "fine_fee">;
const initialForm: StudentForm = { student_id: "", name: "", email: "", total_fee: 0, paid_fee: 0, fine_fee: 0 };

function importStudentRow(row: Record<string, unknown>): StudentForm {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value]));
  const text = (...keys: string[]) => String(keys.map((key) => normalized[key]).find((value) => value !== undefined) ?? "").trim();
  const money = (...keys: string[]) => {
    const value = text(...keys).replace(/[^0-9.-]/g, "");
    return value ? Number(value) : 0;
  };

  return {
    student_id: text("studentid", "htno"),
    name: text("name"),
    email: text("email", "emailid").toLowerCase(),
    total_fee: money("totalfee"),
    paid_fee: money("paidfee"),
    fine_fee: money("finefee"),
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<StudentForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => students.reduce((a, s) => ({ total: a.total + s.total_fee, paid: a.paid + s.paid_fee, due: a.due + s.due_fee + s.fine_fee }), { total: 0, paid: 0, due: 0 }), [students]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return router.replace("/student");
    const { data } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    setStudents(data || []);
  }
  useEffect(() => { load(); }, []);

  const update = (key: keyof StudentForm, value: string) => {
    const numeric = ["total_fee", "paid_fee", "fine_fee"].includes(key);
    setForm((old) => ({ ...old, [key]: numeric ? Number(value) : value }));
  };

  async function submitStudents(records: StudentForm[]) {
    return saveFromBrowser(records);
  }

  async function saveFromBrowser(records: StudentForm[]) {
    const adminClient = createClient();
    const temporaryAuthClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "fee-flow-provisioning" } }
    );

    const results: ({ row: number; created: boolean } | { row: number; error: string })[] = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      try {
        const existing = students.find((student) => student.email.toLowerCase() === record.email.trim().toLowerCase());
        let id = existing?.id || crypto.randomUUID();
        let created = false;

        if (!existing) {
          const { data, error } = await temporaryAuthClient.auth.signUp({
            email: record.email.trim().toLowerCase(), password: "SITS@2024",
          });
          if (error || !data.user) throw error || new Error("Could not create the student login.");
          created = Boolean(data.user.identities?.length);
        }

        const total_fee = Number(record.total_fee);
        const paid_fee = Number(record.paid_fee);
        const fine_fee = Number(record.fine_fee);
        if (!record.student_id.trim() || !record.name.trim() || !record.email.trim()) throw new Error("Each student needs H.T.No, name, and email.");
        if ([total_fee, paid_fee, fine_fee].some((amount) => !Number.isFinite(amount) || amount < 0)) throw new Error("Fee amounts must be zero or positive.");
        const { error: recordError } = await adminClient.from("students").upsert({
          id, student_id: record.student_id.trim(), name: record.name.trim(), email: record.email.trim().toLowerCase(),
          total_fee, paid_fee, fine_fee, due_fee: Math.max(0, total_fee - paid_fee),
        });
        if (recordError) throw recordError;
        results.push({ row: index + 1, created });
      } catch (error) {
        results.push({ row: index + 1, error: error instanceof Error ? error.message : "Could not save this student." });
      }
    }
    const failed = results.filter((result): result is { row: number; error: string } => "error" in result);
    const created = results.filter((result) => "created" in result && result.created).length;
    return { created, updated: results.length - failed.length - created, failed };
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const result = await submitStudents([form]);
      if (result.failed.length) throw new Error(result.failed[0].error);
      setMessage(result.created ? "Student account created. Default password: SITS@2024" : "Student fee record updated.");
      setForm(initialForm); setEditingId(null); load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the student record.");
    } finally {
      setSaving(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true); setMessage("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }).map(importStudentRow);
      if (!rows.length) throw new Error("The selected file has no student rows.");
      const result = await submitStudents(rows);
      const failed = result.failed.length ? ` ${result.failed.length} row(s) failed: ${result.failed.slice(0, 2).map((item) => `row ${item.row}: ${item.error}`).join("; ")}` : "";
      setMessage(`Import complete: ${result.created} account(s) created and ${result.updated} record(s) updated.${failed}`);
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import the file.");
    } finally {
      setImporting(false);
    }
  }

  function edit(student: Student) {
    setEditingId(student.id);
    setForm({ student_id: student.student_id, name: student.name, email: student.email, total_fee: student.total_fee, paid_fee: student.paid_fee, fine_fee: student.fine_fee });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() { await createClient().auth.signOut(); router.replace("/login"); }
  const due = Math.max(0, form.total_fee - form.paid_fee);

  return <main className="dashboard-shell admin-shell">
    <header className="topbar"><Brand admin /><div className="account-chip"><div className="avatar admin-avatar">A</div><div><strong>Administration</strong><small>Fee manager</small></div><button onClick={logout}>Sign out</button></div></header>
    <div className="dashboard-content">
      <p className="eyebrow">ADMIN CONSOLE</p><h1>Fee collection, at a glance.</h1><p className="muted">Create student logins, import fee records, and keep every account accurate.</p>
      <section className="admin-metrics"><Metric label="Students" value={String(students.length)} /><Metric label="Total fees" value={currency(totals.total)} /><Metric label="Collected" value={currency(totals.paid)} success/><Metric label="Outstanding" value={currency(totals.due)} warning/></section>
      <section className="admin-layout"><form className="student-form" onSubmit={save}><div className="section-heading"><div><p className="eyebrow">{editingId ? "UPDATE STUDENT" : "ADD STUDENT"}</p><h2>{editingId ? "Update fee record" : "Student fee record"}</h2></div></div><p className="form-note">New students receive a login using their email and the default password <b>SITS@2024</b>. Select a record below to update its fees.</p><div className="form-grid"><label>H.T.No<input required readOnly={Boolean(editingId)} value={form.student_id} onChange={e => update("student_id", e.target.value)} placeholder="21A91A0501" /></label><label>Student name<input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Student name" /></label><label>Email ID<input required readOnly={Boolean(editingId)} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="student@example.com" /></label><label>Total fee<input required min="0" type="number" value={form.total_fee} onChange={e => update("total_fee", e.target.value)} /></label><label>Paid fee<input required min="0" type="number" value={form.paid_fee} onChange={e => update("paid_fee", e.target.value)} /></label><label>Fine fee<input required min="0" type="number" value={form.fine_fee} onChange={e => update("fine_fee", e.target.value)} /></label><div className="calculated-field"><span>Due fee (automatic)</span><strong>{currency(due)}</strong></div></div>{message && <p className="form-message">{message}</p>}<div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? "Saving..." : editingId ? "Update fee record" : "Create student account"}</button>{editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button>}</div><div className="import-box"><strong>Bulk import</strong><span>Accepted headers: H.T.No / student_id, Name, Email ID / email, Total Fee, Paid Fee, Fine Fee. Rupee-formatted amounts are supported.</span><label className="file-button">{importing ? "Importing..." : "Choose Excel / CSV"}<input disabled={importing} type="file" accept=".xlsx,.xls,.csv" onChange={importFile} /></label></div></form>
      <section className="records-card"><div className="section-heading"><div><p className="eyebrow">ALL RECORDS</p><h2>Student accounts</h2></div><span className="record-count">{students.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Student</th><th>H.T.No</th><th>Total</th><th>Paid</th><th>Due + fine</th><th></th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.email}</small></td><td>{s.student_id}</td><td>{currency(s.total_fee)}</td><td className="success-text">{currency(s.paid_fee)}</td><td className={s.due_fee + s.fine_fee > 0 ? "warning-text" : "success-text"}>{currency(s.due_fee + s.fine_fee)}</td><td><button className="table-button" onClick={() => edit(s)}>Edit</button></td></tr>)}{students.length === 0 && <tr><td colSpan={6} className="empty-state">No student records yet.</td></tr>}</tbody></table></div></section></section>
    </div>
  </main>;
}

function Metric({ label, value, success, warning }: { label: string; value: string; success?: boolean; warning?: boolean }) { return <div className={`metric ${success ? "metric-success" : ""} ${warning ? "metric-warning" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
