"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Student } from "@/lib/types";
import { currency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

type FormData = Omit<Student, "created_at">;
const initialForm: FormData = { id: "", student_id: "", name: "", email: "", total_fee: 0, paid_fee: 0, due_fee: 0, fine_fee: 0 };

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => students.reduce((a, s) => ({ total: a.total + s.total_fee, paid: a.paid + s.paid_fee, due: a.due + s.due_fee + s.fine_fee }), { total: 0, paid: 0, due: 0 }), [students]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");
    const { data: profile } = await supabase.from("profiles").select("role").single();
    if (profile?.role !== "admin") return router.replace("/student");
    const { data } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    setStudents(data || []);
  }
  useEffect(() => { load(); }, []);

  const update = (key: keyof FormData, value: string) => {
    const numeric = ["total_fee", "paid_fee", "due_fee", "fine_fee"].includes(key);
    setForm((old) => ({ ...old, [key]: numeric ? Number(value) : value }));
  };
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const calculatedDue = Math.max(0, form.total_fee - form.paid_fee);
    const payload = { ...form, due_fee: calculatedDue };
    const { error } = await createClient().from("students").upsert(payload);
    setSaving(false);
    if (error) return setMessage(error.message);
    setMessage("Student fee record saved."); setForm(initialForm); load();
  }
  async function logout() { await createClient().auth.signOut(); router.replace("/login"); }

  return <main className="dashboard-shell admin-shell">
    <header className="topbar"><Brand admin /><div className="account-chip"><div className="avatar admin-avatar">A</div><div><strong>Administration</strong><small>Fee manager</small></div><button onClick={logout}>Sign out</button></div></header>
    <div className="dashboard-content">
      <p className="eyebrow">ADMIN CONSOLE</p><h1>Fee collection, at a glance.</h1><p className="muted">Add student fee details and keep every account accurate.</p>
      <section className="admin-metrics"><Metric label="Students" value={String(students.length)} /><Metric label="Total fees" value={currency(totals.total)} /><Metric label="Collected" value={currency(totals.paid)} success/><Metric label="Outstanding" value={currency(totals.due)} warning/></section>
      <section className="admin-layout"><form className="student-form" onSubmit={save}><div className="section-heading"><div><p className="eyebrow">ADD OR UPDATE</p><h2>Student fee record</h2></div></div><p className="form-note">Create the student in Supabase Auth first, then paste that user’s UUID below. The total, paid and fine amounts are in INR.</p><div className="form-grid"><label>Supabase Auth UUID<input required value={form.id} onChange={e => update("id", e.target.value)} placeholder="e.g. 3d4..." /></label><label>H.T.No<input required value={form.student_id} onChange={e => update("student_id", e.target.value)} placeholder="21A91A0501" /></label><label>Student name<input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Student name" /></label><label>Email ID<input required type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="student@example.com" /></label><label>Total fee<input required min="0" type="number" value={form.total_fee} onChange={e => update("total_fee", e.target.value)} /></label><label>Paid fee<input required min="0" type="number" value={form.paid_fee} onChange={e => update("paid_fee", e.target.value)} /></label><label>Fine fee<input required min="0" type="number" value={form.fine_fee} onChange={e => update("fine_fee", e.target.value)} /></label><div className="calculated-field"><span>Due fee (automatic)</span><strong>{currency(Math.max(0, form.total_fee - form.paid_fee))}</strong></div></div>{message && <p className="form-message">{message}</p>}<button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save student record"}</button></form>
      <section className="records-card"><div className="section-heading"><div><p className="eyebrow">ALL RECORDS</p><h2>Student accounts</h2></div><span className="record-count">{students.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Student</th><th>H.T.No</th><th>Total</th><th>Paid</th><th>Due + fine</th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.email}</small></td><td>{s.student_id}</td><td>{currency(s.total_fee)}</td><td className="success-text">{currency(s.paid_fee)}</td><td className={s.due_fee + s.fine_fee > 0 ? "warning-text" : "success-text"}>{currency(s.due_fee + s.fine_fee)}</td></tr>)}{students.length === 0 && <tr><td colSpan={5} className="empty-state">No student records yet.</td></tr>}</tbody></table></div></section></section>
    </div>
  </main>;
}
function Metric({ label, value, success, warning }: { label: string; value: string; success?: boolean; warning?: boolean }) { return <div className={`metric ${success ? "metric-success" : ""} ${warning ? "metric-warning" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
