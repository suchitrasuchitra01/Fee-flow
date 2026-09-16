"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Student } from "@/lib/types";
import { currency, feeStatus } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      const { data } = await supabase.from("students").select("*").eq("email", user.email).maybeSingle();
      if (!data) return router.replace("/login");
      setStudent(data);
      setLoading(false);
      try {
        const result = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            total: data.total_fee,
            paid: data.paid_fee,
            due: data.due_fee,
            fine: data.fine_fee
          })
        });
        const json = await result.json();
        setSummary(json.summary);
      } catch {
        setSummary("Your fee summary is currently unavailable.");
      }
    };
    load();
  }, [router]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  if (loading || !student) {
    return (
      <div className="loading-screen animate-fade-in">
        <div className="loading-spinner" />
        <p>Loading your account...</p>
      </div>
    );
  }

  const upi = `upi://pay?pa=${process.env.NEXT_PUBLIC_UPI_ID || "college@upi"}&pn=${encodeURIComponent(process.env.NEXT_PUBLIC_PAYEE_NAME || "College Fee")}&am=${student.due_fee + student.fine_fee}&cu=INR&tn=${encodeURIComponent(`Fee payment ${student.student_id}`)}`;

  return (
    <main className="dashboard-shell">
      <header className="topbar animate-fade-in">
        <Brand />
        <div className="account-chip">
          <div className="avatar">{student.name.charAt(0)}</div>
          <div>
            <strong>{student.name}</strong>
            <small>Student</small>
          </div>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="animate-fade-up">
          <p className="eyebrow">YOUR FEE ACCOUNT</p>
          <h1>Good to see you, {student.name.split(" ")[0]}.</h1>
          <p className="muted">Here is the latest overview of your academic fee account.</p>
        </div>

        <section className="student-overview">
          <div className="profile-card animate-fade-up stagger-1">
            <div className="card-label">STUDENT DETAILS</div>
            <h2>{student.name}</h2>
            <div className="detail-grid">
              <span>H.T.No <b>{student.student_id}</b></span>
              <span>Email <b>{student.email}</b></span>
            </div>
          </div>
          <div className={`balance-card animate-fade-up stagger-2 ${student.due_fee > 0 ? "has-due" : "settled"}`}>
            <div className="card-label">CURRENT BALANCE</div>
            <span className="balance-amount">{currency(student.due_fee + student.fine_fee)}</span>
            <span className="balance-caption">{student.due_fee > 0 ? "Amount payable" : "All payments completed"}</span>
            <span className="status-pill">{feeStatus(student.due_fee + student.fine_fee)}</span>
          </div>
        </section>

        <section className="fee-card animate-fade-up stagger-3">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FEE BREAKDOWN</p>
              <h2>Academic year 2026–27</h2>
            </div>
            <span className="status-pill neutral">Updated today</span>
          </div>
          <div className="fee-grid">
            <Fee label="Total fee" value={student.total_fee} />
            <Fee label="Paid fee" value={student.paid_fee} tone="success" />
            <Fee label="Due fee" value={student.due_fee} tone="warning" />
            <Fee label="Fine fee" value={student.fine_fee} tone="danger" />
          </div>
        </section>

        <section className="bottom-grid">
          <article className="insight-card animate-fade-up stagger-4">
            <p className="eyebrow">GEMINI INSIGHT</p>
            <h2>Your fee summary</h2>
            {summary ? (
              <p className="animate-fade-in">{summary}</p>
            ) : (
              <div className="shimmer-box">
                <div className="shimmer-line" />
                <div className="shimmer-line" />
                <div className="shimmer-line short" />
              </div>
            )}
          </article>
          <article className="pay-card animate-fade-up stagger-5">
            <div>
              <p className="eyebrow">PAY ONLINE</p>
              <h2>Pay with UPI</h2>
              <p>Scan using any UPI app. Your payment will be verified by the administration office.</p>
              {student.due_fee + student.fine_fee > 0 && (
                <a className="primary-button" href={upi}>
                  Open UPI app
                </a>
              )}
            </div>
            <div className="qr-wrap">
              <QRCodeSVG value={upi} size={132} includeMargin />
              <small>Scan to pay</small>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function Fee({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`fee-item ${tone}`}>
      <span>{label}</span>
      <strong>{currency(value)}</strong>
    </div>
  );
}
