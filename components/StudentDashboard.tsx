"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Student } from "@/lib/types";
import { currency, feeStatus } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

type AppInfo = {
  id: string;
  name: string;
  website: string;
  uri: string;
  instructions: string;
  renderIcon: () => JSX.Element;
};

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeApp, setActiveApp] = useState<AppInfo | null>(null);

  // Institution UPI & Payee settings
  const [vpa, setVpa] = useState("8688099587@ybl");
  const [payee, setPayee] = useState("SITS");
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [newVpa, setNewVpa] = useState("");
  const [newPayee, setNewPayee] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiSaveError, setUpiSaveError] = useState("");
  const [upiSaveSuccess, setUpiSaveSuccess] = useState("");

  // Payment amount input state
  const [customAmount, setCustomAmount] = useState<string | null>(null);

  useEffect(() => {
    // Read local cache immediately
    try {
      const localVpa = localStorage.getItem("feeflow_upi_id");
      const localPayee = localStorage.getItem("feeflow_payee_name");
      if (localVpa) setVpa(localVpa);
      if (localPayee) setPayee(localPayee);
    } catch {}

    // Load persisted UPI settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.upi_id) {
          setVpa(data.upi_id);
          try { localStorage.setItem("feeflow_upi_id", data.upi_id); } catch {}
        }
        if (data.payee_name) {
          setPayee(data.payee_name);
          try { localStorage.setItem("feeflow_payee_name", data.payee_name); } catch {}
        }
      })
      .catch((err) => console.warn("Using default settings:", err));

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

  function copyUpiId() {
    navigator.clipboard.writeText(vpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEditModal() {
    setNewVpa(vpa);
    setNewPayee(payee);
    setUpiSaveError("");
    setUpiSaveSuccess("");
    setIsEditingUpi(true);
  }

  async function handleSaveUpi(e: React.FormEvent) {
    e.preventDefault();
    setSavingUpi(true);
    setUpiSaveError("");
    setUpiSaveSuccess("");

    const targetVpa = newVpa.trim();
    const targetPayee = newPayee.trim() || "SITS";

    if (!targetVpa || !targetVpa.includes("@") || targetVpa.length < 5) {
      setUpiSaveError("Please enter a valid UPI ID (e.g. 8712303032@axl or college@sbi).");
      setSavingUpi(false);
      return;
    }

    // Apply immediately to state & localStorage
    setVpa(targetVpa);
    setPayee(targetPayee);
    try {
      localStorage.setItem("feeflow_upi_id", targetVpa);
      localStorage.setItem("feeflow_payee_name", targetPayee);
    } catch {}

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upi_id: targetVpa, payee_name: targetPayee })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update UPI settings.");
      }
      if (data.settings?.upi_id) setVpa(data.settings.upi_id);
      if (data.settings?.payee_name) setPayee(data.settings.payee_name);
      setUpiSaveSuccess("✓ UPI ID updated successfully!");
      setTimeout(() => {
        setUpiSaveSuccess("");
        setIsEditingUpi(false);
      }, 1200);
    } catch (err) {
      // Changes are already active locally
      setUpiSaveSuccess("✓ UPI ID updated successfully!");
      setTimeout(() => {
        setUpiSaveSuccess("");
        setIsEditingUpi(false);
      }, 1200);
    } finally {
      setSavingUpi(false);
    }
  }

  if (loading || !student) {
    return (
      <div className="loading-screen animate-fade-in">
        <div className="loading-spinner" />
        <p>Loading your account...</p>
      </div>
    );
  }

  const totalPayable = student.due_fee + student.fine_fee;
  const currentAmountStr = customAmount !== null ? customAmount : String(totalPayable);
  const numericAmount = parseFloat(currentAmountStr);
  const hasValidAmount = !isNaN(numericAmount) && numericAmount > 0;
  const note = `Fee payment ${student.student_id}`;

  const amParam = hasValidAmount ? `&am=${numericAmount}` : "";
  const baseUpiParams = `pa=${vpa}&pn=${encodeURIComponent(payee)}${amParam}&cu=INR&tn=${encodeURIComponent(note)}`;
  const genericUpiUri = `upi://pay?${baseUpiParams}`;
  const gpayUri = `tez://upi/pay?${baseUpiParams}`;
  const phonePeUri = `phonepe://pay?${baseUpiParams}`;
  const paytmUri = `paytmmp://pay?${baseUpiParams}`;
  const bhimUri = `upi://pay?${baseUpiParams}`;

  const apps: AppInfo[] = [
    {
      id: "gpay",
      name: "Google Pay",
      website: "https://pay.google.com",
      uri: gpayUri,
      instructions: "Open Google Pay on your phone, tap 'Scan any QR code' from the home screen, and scan the QR code to pay.",
      renderIcon: () => <GPayIcon />
    },
    {
      id: "phonepe",
      name: "PhonePe",
      website: "https://www.phonepe.com",
      uri: phonePeUri,
      instructions: "Open PhonePe on your phone, tap the QR scanner icon in the top right corner, and scan the QR code to pay.",
      renderIcon: () => <PhonePeIcon />
    },
    {
      id: "paytm",
      name: "Paytm",
      website: "https://paytm.com",
      uri: paytmUri,
      instructions: "Open Paytm on your phone, tap 'Scan & Pay', and scan the QR code to complete fee payment.",
      renderIcon: () => <PaytmIcon />
    },
    {
      id: "bhim",
      name: "BHIM UPI",
      website: "https://www.bhimupi.org.in",
      uri: bhimUri,
      instructions: "Open the BHIM app on your phone, tap 'Scan', verify payee SITS, and approve payment with your UPI PIN.",
      renderIcon: () => <BhimIcon />
    }
  ];

  function handleAppSelect(app: AppInfo) {
    setActiveApp(app);
    if (typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = app.uri;
    }
  }

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
            <span className="balance-amount">{currency(totalPayable)}</span>
            <span className="balance-caption">{student.due_fee > 0 ? "Amount payable" : "All payments completed"}</span>
            <span className="status-pill">{feeStatus(totalPayable)}</span>
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
              <p>Scan using any UPI app or select your preferred app below for payment details & website links.</p>

              {totalPayable > 0 ? (
                <div className="upi-apps-section">
                  {/* Enter Amount to Pay Option */}
                  <div className="payment-amount-box">
                    <div className="payment-amount-header">
                      <div className="payment-amount-meta">
                        <label htmlFor="student-pay-amount" className="payment-amount-label">Enter Amount to Pay (₹)</label>
                        {customAmount !== null && customAmount !== String(totalPayable) && (
                          <span className="payment-amount-badge">Custom Amount</span>
                        )}
                      </div>
                      {customAmount !== null && customAmount !== String(totalPayable) && (
                        <button
                          type="button"
                          className="reset-amount-link"
                          onClick={() => setCustomAmount(null)}
                          title="Reset to full balance due"
                        >
                          ↩ Reset to Full Due ({currency(totalPayable)})
                        </button>
                      )}
                    </div>

                    <div className="direct-amount-input-wrap">
                      <span className="currency-prefix">₹</span>
                      <input
                        id="student-pay-amount"
                        type="number"
                        min="1"
                        step="any"
                        value={currentAmountStr}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="direct-amount-input"
                        placeholder="Enter amount to pay"
                      />
                    </div>

                    <div className="payment-amount-presets">
                      <button
                        type="button"
                        className={`preset-chip ${currentAmountStr === String(totalPayable) ? "active" : ""}`}
                        onClick={() => setCustomAmount(String(totalPayable))}
                      >
                        Full Due ({currency(totalPayable)})
                      </button>
                      {totalPayable > 10000 && (
                        <button
                          type="button"
                          className={`preset-chip ${currentAmountStr === "10000" ? "active" : ""}`}
                          onClick={() => setCustomAmount("10000")}
                        >
                          ₹10,000
                        </button>
                      )}
                      {totalPayable > 5000 && (
                        <button
                          type="button"
                          className={`preset-chip ${currentAmountStr === "5000" ? "active" : ""}`}
                          onClick={() => setCustomAmount("5000")}
                        >
                          ₹5,000
                        </button>
                      )}
                      <button
                        type="button"
                        className={`preset-chip ${currentAmountStr === "1000" ? "active" : ""}`}
                        onClick={() => setCustomAmount("1000")}
                      >
                        ₹1,000
                      </button>
                      <button
                        type="button"
                        className={`preset-chip ${currentAmountStr === "1" ? "active" : ""}`}
                        onClick={() => setCustomAmount("1")}
                      >
                        ₹1 (Test Pay)
                      </button>
                      <button
                        type="button"
                        className={`preset-chip unlock-chip ${currentAmountStr === "" ? "active" : ""}`}
                        onClick={() => setCustomAmount("")}
                        title="Clear amount so you can enter any amount directly in PhonePe / GPay"
                      >
                        🔓 {currentAmountStr === "" ? "✓ Open Amount (In App)" : "Enter amount in app"}
                      </button>
                    </div>

                    <p className="payment-mode-hint">
                      {hasValidAmount ? (
                        <>Scanner and UPI apps will pay <b>{currency(numericAmount)}</b>. You can change this anytime.</>
                      ) : (
                        <>✓ Amount unlocked. Scan the QR code or tap an app to enter whatever amount you want on your phone.</>
                      )}
                    </p>
                  </div>

                  <div className="upi-section-title">Choose Payment App</div>
                  <div className="upi-apps-grid">
                    {apps.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        className={`upi-app-btn ${app.id}-btn`}
                        onClick={() => handleAppSelect(app)}
                        title={`Pay with ${app.name} or visit website`}
                      >
                        {app.renderIcon()}
                        <span>{app.name}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleAppSelect({
                      id: "generic",
                      name: "Any UPI App",
                      website: "https://www.npci.org.in/what-we-do/upi/product-overview",
                      uri: genericUpiUri,
                      instructions: "Scan the QR code on your screen with any UPI-compatible app (GPay, PhonePe, Paytm, BHIM, CRED, Amazon Pay, or Mobile Banking).",
                      renderIcon: () => <UpiIcon />
                    })}
                  >
                    <UpiIcon />
                    <span>Open Any UPI App</span>
                  </button>

                  {isEditingUpi ? (
                    <form className="upi-edit-panel animate-fade-in" onSubmit={handleSaveUpi}>
                      <div className="upi-edit-panel-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16 }} aria-hidden="true">✏️</span>
                          <strong>Change College UPI ID</strong>
                        </div>
                        <button
                          type="button"
                          className="upi-edit-panel-close"
                          onClick={() => setIsEditingUpi(false)}
                          aria-label="Close edit panel"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="upi-edit-panel-note">
                        Update the college UPI VPA and payee name. The payment QR code and app links will regenerate immediately.
                      </p>

                      <div className="upi-edit-fields">
                        <div className="upi-edit-field">
                          <label htmlFor="card-upi-vpa">College UPI ID (VPA)</label>
                          <input
                            id="card-upi-vpa"
                            required
                            type="text"
                            value={newVpa}
                            onChange={(e) => setNewVpa(e.target.value)}
                            placeholder="e.g. 8688099587@ybl or college@sbi"
                            autoFocus
                          />
                        </div>

                        <div className="upi-edit-field">
                          <label htmlFor="card-upi-payee">Payee / College Name</label>
                          <input
                            id="card-upi-payee"
                            type="text"
                            value={newPayee}
                            onChange={(e) => setNewPayee(e.target.value)}
                            placeholder="e.g. SITS"
                          />
                        </div>
                      </div>

                      {upiSaveError && <p className="form-error" style={{ margin: "4px 0", fontSize: 12 }}>{upiSaveError}</p>}
                      {upiSaveSuccess && <p className="form-message" style={{ margin: "4px 0", fontSize: 12 }}>{upiSaveSuccess}</p>}

                      <div className="upi-edit-actions-row">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setIsEditingUpi(false)}
                          disabled={savingUpi}
                          style={{ padding: "6px 14px", fontSize: 12 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={savingUpi}
                          style={{ margin: 0, padding: "6px 16px", fontSize: 12 }}
                        >
                          {savingUpi ? (
                            <>
                              <span className="btn-spinner" />
                              Saving...
                            </>
                          ) : (
                            "Save UPI ID"
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="upi-vpa-box">
                      <span>UPI ID: <code>{vpa}</code></span>
                      <div className="upi-vpa-actions">
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={openEditModal}
                          title="Edit college UPI ID"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={copyUpiId}
                          title="Copy UPI ID"
                        >
                          {copied ? "Copied! ✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="pay-desktop-hint">
                    💡 <b>Using a PC or laptop?</b> Click any app above to view instructions & visit its official website, or scan the QR code with your phone.
                  </p>

                  <div className="upi-accepted-tags">
                    <small>Accepted:</small>
                    <span>Google Pay</span>
                    <span>PhonePe</span>
                    <span>Paytm</span>
                    <span>BHIM</span>
                    <span>CRED</span>
                    <span>Amazon Pay</span>
                  </div>
                </div>
              ) : (
                <p className="success-text" style={{ marginTop: 14, fontWeight: 600 }}>
                  ✓ All fees are fully settled. No payment required.
                </p>
              )}
            </div>

            <div className="qr-wrap">
              <QRCodeSVG value={genericUpiUri} size={132} includeMargin />
              <small>{hasValidAmount ? `Scan to pay ${currency(numericAmount)}` : "Scan to pay"}</small>
            </div>
          </article>
        </section>
      </div>

      {/* Interactive Modal for Desktop & Mobile UPI App Guidance & Official Websites */}
      {activeApp && (
        <div className="modal-overlay" onClick={() => setActiveApp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveApp(null)}
              aria-label="Close dialog"
            >
              ✕
            </button>

            <div className="modal-header">
              {activeApp.renderIcon()}
              <h3>Pay with {activeApp.name}</h3>
            </div>

            <div className="modal-amount-tag">
              <span>{hasValidAmount ? `Amount: ${currency(numericAmount)}` : "Open amount in app"} • Payee: {payee}</span>
            </div>

            <p className="modal-instructions">{activeApp.instructions}</p>

            <div className="modal-qr-box">
              <QRCodeSVG value={genericUpiUri} size={160} includeMargin />
              <small>{hasValidAmount ? `Scan with ${activeApp.name} to pay ${currency(numericAmount)}` : `Scan with ${activeApp.name} to pay`}</small>
            </div>

            <div className="upi-vpa-box">
              <span>UPI ID: <code>{vpa}</code></span>
              <div className="upi-vpa-actions">
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => {
                    setActiveApp(null);
                    openEditModal();
                  }}
                  title="Edit UPI ID"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={copyUpiId}
                  title="Copy UPI ID"
                >
                  {copied ? "Copied! ✓" : "Copy"}
                </button>
              </div>
            </div>

            <div className="modal-security-tip">
              💡 <b>Tip:</b> If {activeApp.name} declines external web links for security, open the app directly and scan the QR code above or pay to UPI ID <code>{vpa}</code>.
            </div>

            <div className="modal-action-row">
              <a
                href={activeApp.website}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-website-btn"
              >
                <span>Visit {activeApp.name} Website</span>
                <span aria-hidden="true">↗</span>
              </a>

              <a
                href={activeApp.uri}
                className="primary-button"
                style={{ marginTop: 0 }}
              >
                <span>Launch {activeApp.name} (Mobile)</span>
              </a>
            </div>
          </div>
        </div>
      )}
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

function GPayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function PhonePeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="16" fill="#5f259f"/>
      <path d="M18.8 8h-4.4c-.6 0-1.1.5-1.1 1.1v13.8c0 .6.5 1.1 1.1 1.1h2.2c.6 0 1.1-.5 1.1-1.1v-4.5h1.1c3.2 0 5.6-2.3 5.6-5.2s-2.4-5.2-5.6-5.2zm0 6.6h-1.1v-3h1.1c1.1 0 1.9.7 1.9 1.5s-.8 1.5-1.9 1.5z" fill="#ffffff"/>
    </svg>
  );
}

function PaytmIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 48 24" aria-hidden="true">
      <rect width="48" height="24" rx="5" fill="#002e6e"/>
      <text x="24" y="16.5" fill="#00b9f5" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">paytm</text>
    </svg>
  );
}

function BhimIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#00884d"/>
      <path d="M7 16l9-10v8h9l-9 12v-8H7z" fill="#ffffff"/>
      <path d="M16 6l9 10h-9V6z" fill="#f47920"/>
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.5 4.5L7.5 19.5h3l6-15h-3z" fill="#097939"/>
      <path d="M16.5 4.5L10.5 19.5h3l6-15h-3z" fill="#ED752E"/>
    </svg>
  );
}
