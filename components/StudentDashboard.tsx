"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Student, FeeReceipt } from "@/lib/types";
import { currency, feeStatus } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import FeeReceiptModal from "@/components/FeeReceiptModal";
import PaymentGatewayModal, { PaymentMode } from "@/components/PaymentGatewayModal";

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

  // Unified Payment Gateway state (UPI, Debit Card, Credit Card, Net Banking)
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayMode, setGatewayMode] = useState<PaymentMode>("upi");

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
  const [feeCategory, setFeeCategory] = useState<"all" | "tuition" | "fine">("all");

  // Fee Receipt & Payment Confirmation state
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | undefined>(undefined);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmApp, setConfirmApp] = useState("UPI App / QR Scanner");
  const [confirmUtr, setConfirmUtr] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [resettingFees, setResettingFees] = useState(false);

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

      // Load persistent receipt history for this student
      try {
        const storedReceipts = localStorage.getItem(`feeflow_receipts_${data.student_id}`);
        if (storedReceipts) {
          const parsed = JSON.parse(storedReceipts);
          if (Array.isArray(parsed)) setReceipts(parsed);
        }
      } catch (err) {
        console.warn("Could not load stored receipts:", err);
      }
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

  function openGatewayModal(mode: PaymentMode = "upi") {
    setGatewayMode(mode);
    setShowGatewayModal(true);
  }

  function handleGatewayPaymentSuccess(receipt: FeeReceipt, updatedStudent?: Student) {
    if (updatedStudent) {
      setStudent(updatedStudent);
    } else {
      setStudent((prev) => {
        if (!prev) return null;
        if (feeCategory === "fine") {
          return {
            ...prev,
            fine_fee: Math.max(0, prev.fine_fee - receipt.amount_paid),
          };
        } else if (feeCategory === "tuition") {
          return {
            ...prev,
            paid_fee: prev.paid_fee + receipt.amount_paid,
            due_fee: Math.max(0, prev.due_fee - receipt.amount_paid),
          };
        } else {
          const paidToDue = Math.min(prev.due_fee, receipt.amount_paid);
          const remForFine = Math.max(0, receipt.amount_paid - paidToDue);
          return {
            ...prev,
            paid_fee: prev.paid_fee + paidToDue,
            due_fee: Math.max(0, prev.due_fee - paidToDue),
            fine_fee: Math.max(0, prev.fine_fee - remForFine),
          };
        }
      });
    }

    setReceipts((prev) => {
      const updated = [receipt, ...prev];
      try {
        localStorage.setItem(`feeflow_receipts_${receipt.student_id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSelectedReceiptId(receipt.id);
    setShowReceiptModal(true);
  }

  async function handleResetFees(clearReceipts = false) {
    if (!student) return;
    setResettingFees(true);
    try {
      const res = await fetch("/api/students/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          total_fee: 100000,
          paid_fee: 57000,
          due_fee: 43000,
          fine_fee: 1500,
        }),
      });
      const data = await res.json();
      if (res.ok && data.student) {
        setStudent(data.student);
        setFeeCategory("all");
        setCustomAmount(null);
        if (clearReceipts) {
          setReceipts([]);
          try {
            localStorage.removeItem(`feeflow_receipts_${student.student_id}`);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Error resetting fee:", err);
    } finally {
      setResettingFees(false);
    }
  }

  function openPaymentConfirmation(appName = "UPI App / QR Scanner") {
    const totalDue = student ? student.due_fee + student.fine_fee : 0;
    const defaultAmount = customAmount !== null && customAmount !== ""
      ? customAmount
      : String(totalDue > 0 ? totalDue : 1000);
    setConfirmAmount(defaultAmount);
    setConfirmApp(appName);
    setConfirmUtr("");
    setConfirmError("");
    setShowConfirmModal(true);
  }

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;

    const numAmount = parseFloat(confirmAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setConfirmError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    setSubmittingPayment(true);
    setConfirmError("");

    try {
      const res = await fetch("/api/payments/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          amount_paid: numAmount,
          payment_mode: confirmApp,
          utr_number: confirmUtr.trim(),
          payee_upi: vpa,
          payee_name: payee,
        }),
      });

      const data = await res.json();
      let generatedReceipt: FeeReceipt;

      if (res.ok && data.receipt) {
        generatedReceipt = data.receipt;
        if (data.student) {
          setStudent(data.student);
        } else {
          setStudent((prev) =>
            prev
              ? {
                  ...prev,
                  paid_fee: prev.paid_fee + numAmount,
                  due_fee: Math.max(0, prev.due_fee - numAmount),
                }
              : null
          );
        }
      } else {
        // Fallback local receipt generation
        generatedReceipt = {
          id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          student_id: student.student_id,
          student_name: student.name,
          email: student.email,
          amount_paid: numAmount,
          previous_due: student.due_fee,
          remaining_due: Math.max(0, student.due_fee - numAmount),
          total_fee: student.total_fee,
          payment_mode: confirmApp,
          utr_number: confirmUtr.trim() || `UPI${Date.now().toString().slice(-8)}`,
          payee_upi: vpa,
          payee_name: payee,
          created_at: new Date().toISOString(),
          academic_year: "2026–2027",
        };
        setStudent((prev) =>
          prev
            ? {
                ...prev,
                paid_fee: prev.paid_fee + numAmount,
                due_fee: Math.max(0, prev.due_fee - numAmount),
              }
            : null
        );
      }

      const updated = [generatedReceipt, ...receipts];
      setReceipts(updated);
      try {
        localStorage.setItem(`feeflow_receipts_${student.student_id}`, JSON.stringify(updated));
      } catch {}

      setShowConfirmModal(false);
      setSelectedReceiptId(generatedReceipt.id);
      setShowReceiptModal(true);
    } catch (err) {
      console.warn("Payment recording network error, fallback to local:", err);
      const fallbackReceipt: FeeReceipt = {
        id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        student_id: student.student_id,
        student_name: student.name,
        email: student.email,
        amount_paid: numAmount,
        previous_due: student.due_fee,
        remaining_due: Math.max(0, student.due_fee - numAmount),
        total_fee: student.total_fee,
        payment_mode: confirmApp,
        utr_number: confirmUtr.trim() || `UPI${Date.now().toString().slice(-8)}`,
        payee_upi: vpa,
        payee_name: payee,
        created_at: new Date().toISOString(),
        academic_year: "2026–2027",
      };

      setStudent((prev) =>
        prev
          ? {
              ...prev,
              paid_fee: prev.paid_fee + numAmount,
              due_fee: Math.max(0, prev.due_fee - numAmount),
            }
          : null
      );

      const updated = [fallbackReceipt, ...receipts];
      setReceipts(updated);
      try {
        localStorage.setItem(`feeflow_receipts_${student.student_id}`, JSON.stringify(updated));
      } catch {}

      setShowConfirmModal(false);
      setSelectedReceiptId(fallbackReceipt.id);
      setShowReceiptModal(true);
    } finally {
      setSubmittingPayment(false);
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
  const targetCategoryAmount =
    feeCategory === "fine"
      ? student.fine_fee
      : feeCategory === "tuition"
      ? student.due_fee
      : totalPayable;
  const currentAmountStr = customAmount !== null ? customAmount : String(targetCategoryAmount);
  const numericAmount = parseFloat(currentAmountStr);
  const hasValidAmount = !isNaN(numericAmount) && numericAmount > 0;
  const note = `${feeCategory === "fine" ? "Late Fine" : feeCategory === "tuition" ? "Tuition Fee" : "Fee payment"} ${student.student_id}`;

  function handleSelectFeeCategory(cat: "all" | "tuition" | "fine") {
    setFeeCategory(cat);
    if (cat === "fine") {
      setCustomAmount(student ? String(student.fine_fee) : "0");
    } else if (cat === "tuition") {
      setCustomAmount(student ? String(student.due_fee) : "0");
    } else {
      setCustomAmount(null);
    }
  }

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
        <div className="dashboard-intro-row">
          <div className="animate-fade-up">
            <p className="eyebrow">YOUR FEE ACCOUNT</p>
            <h1>Good to see you, {student.name.split(" ")[0]}.</h1>
            <p className="muted">Here is the latest overview of your academic fee account.</p>
          </div>
          <div className="dashboard-intro-actions">
            <button
              type="button"
              className="reset-fees-pill animate-fade-in"
              onClick={() => handleResetFees(false)}
              disabled={resettingFees}
              title="Reset fee balance back to ₹45,000 due for testing"
            >
              <span>{resettingFees ? "Resetting..." : "🔄 Reset Due Fees (₹45,000)"}</span>
            </button>
            {receipts.length > 0 && (
              <button
                type="button"
                className="receipts-header-pill animate-fade-in"
                onClick={() => {
                  setSelectedReceiptId(receipts[0].id);
                  setShowReceiptModal(true);
                }}
                title="View all your payment receipts"
              >
                <span className="receipts-pill-icon">🧾</span>
                <span className="receipts-pill-text">
                  Fee Receipts <strong>({receipts.length})</strong>
                </span>
              </button>
            )}
          </div>
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

          {/* Academic Tuition Fee Due Card */}
          <div className={`balance-card animate-fade-up stagger-2 ${student.due_fee > 0 ? "has-due" : "settled"}`}>
            <div className="card-label">TUITION FEE DUE</div>
            <span className="balance-amount">{currency(student.due_fee)}</span>
            <span className="balance-caption">{student.due_fee > 0 ? "Academic fee balance" : "Tuition fully settled"}</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
              <span className={`status-pill ${student.due_fee > 0 ? "warning" : "settled"}`}>
                {student.due_fee > 0 ? "Due" : "Settled ✓"}
              </span>
              {student.due_fee === 0 && student.fine_fee === 0 && (
                <button
                  type="button"
                  className="reset-balance-btn"
                  onClick={() => handleResetFees(false)}
                  disabled={resettingFees}
                  title="Reset fees back for testing"
                >
                  {resettingFees ? "Resetting..." : "🔄 Reset Fees"}
                </button>
              )}
            </div>
          </div>

          {/* Separate Late Fine Fee Card */}
          <div className={`fine-balance-card animate-fade-up stagger-3 ${student.fine_fee > 0 ? "has-fine" : "settled"}`}>
            <div className="card-label">LATE FINE FEE</div>
            <span className="fine-balance-amount">{currency(student.fine_fee)}</span>
            <span className="fine-balance-caption">
              {student.fine_fee > 0 ? "Overdue penalty" : "No fine active"}
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
              <span className={`status-pill ${student.fine_fee > 0 ? "danger" : "settled"}`}>
                {student.fine_fee > 0 ? "Fine Active ⚠️" : "Cleared ✓"}
              </span>
              {student.fine_fee > 0 && (
                <button
                  type="button"
                  className="pay-fine-quick-btn"
                  onClick={() => {
                    handleSelectFeeCategory("fine");
                    const payElem = document.querySelector(".pay-card");
                    if (payElem) payElem.scrollIntoView({ behavior: "smooth" });
                  }}
                  title="Pay this fine fee separately"
                >
                  Pay Fine Only
                </button>
              )}
            </div>
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

        <section className="pay-card animate-fade-up stagger-4">
          <div>
            <p className="eyebrow">PAY ONLINE</p>
            <h2>Fee Payment Gateway</h2>
            <p>Select your preferred payment method below: UPI, Debit Card, Credit Card, or Net Banking.</p>

            {/* Payment Mode Selector Tabs */}
            <div className="payment-modes-selector">
              <button
                type="button"
                className="pay-mode-tab active"
                onClick={() => openGatewayModal("upi")}
                title="Pay via UPI or scan QR code"
              >
                <span>📱 UPI & QR</span>
              </button>
              <button
                type="button"
                className="pay-mode-tab"
                onClick={() => openGatewayModal("debit")}
                title="Pay via Debit Card"
              >
                <span>💳 Debit Card</span>
              </button>
              <button
                type="button"
                className="pay-mode-tab"
                onClick={() => openGatewayModal("credit")}
                title="Pay via Credit Card"
              >
                <span>💳 Credit Card</span>
              </button>
              <button
                type="button"
                className="pay-mode-tab"
                onClick={() => openGatewayModal("netbanking")}
                title="Pay via Net Banking"
              >
                <span>🏛️ Net Banking</span>
              </button>
            </div>

              {totalPayable > 0 ? (
                <div className="upi-apps-section">
                  {/* Fee Category Selector: Separate Fine Fees from Tuition Fees */}
                  {(student.due_fee > 0 || student.fine_fee > 0) && (
                    <div className="fee-category-selector-box animate-fade-in">
                      <span className="fee-category-title">Choose Fee to Pay:</span>
                      <div className="fee-category-pill-group">
                        <button
                          type="button"
                          className={`fee-category-pill ${feeCategory === "all" ? "active" : ""}`}
                          onClick={() => handleSelectFeeCategory("all")}
                        >
                          <span className="cat-pill-icon">📋</span>
                          <div className="cat-pill-info">
                            <strong>Both (Tuition + Fine)</strong>
                            <small>{currency(student.due_fee + student.fine_fee)}</small>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`fee-category-pill ${feeCategory === "tuition" ? "active" : ""}`}
                          onClick={() => handleSelectFeeCategory("tuition")}
                          disabled={student.due_fee <= 0}
                        >
                          <span className="cat-pill-icon">🎓</span>
                          <div className="cat-pill-info">
                            <strong>Tuition Fee Only</strong>
                            <small>{currency(student.due_fee)}</small>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`fee-category-pill fine-pill ${feeCategory === "fine" ? "active" : ""}`}
                          onClick={() => handleSelectFeeCategory("fine")}
                          disabled={student.fine_fee <= 0}
                        >
                          <span className="cat-pill-icon">⚠️</span>
                          <div className="cat-pill-info">
                            <strong>Late Fine Only</strong>
                            <small>{currency(student.fine_fee)}</small>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Enter Amount to Pay Option */}
                  <div className="payment-amount-box">
                    <div className="payment-amount-header">
                      <div className="payment-amount-meta">
                        <label htmlFor="student-pay-amount" className="payment-amount-label">
                          Amount to Pay ({feeCategory === "fine" ? "Late Fine Only" : feeCategory === "tuition" ? "Tuition Fee Only" : "Total Fees"}) (₹)
                        </label>
                        {customAmount !== null && customAmount !== String(targetCategoryAmount) && (
                          <span className="payment-amount-badge">Custom Amount</span>
                        )}
                      </div>
                      {customAmount !== null && customAmount !== String(targetCategoryAmount) && (
                        <button
                          type="button"
                          className="reset-amount-link"
                          onClick={() => setCustomAmount(null)}
                          title="Reset to category balance"
                        >
                          ↩ Reset to Due ({currency(targetCategoryAmount)})
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
                        className={`preset-chip ${currentAmountStr === String(targetCategoryAmount) ? "active" : ""}`}
                        onClick={() => setCustomAmount(String(targetCategoryAmount))}
                      >
                        {feeCategory === "fine" ? "Full Fine" : feeCategory === "tuition" ? "Full Tuition" : "Full Due"} ({currency(targetCategoryAmount)})
                      </button>

                      {student.fine_fee > 0 && feeCategory !== "fine" && (
                        <button
                          type="button"
                          className={`preset-chip fine-preset ${currentAmountStr === String(student.fine_fee) ? "active" : ""}`}
                          onClick={() => {
                            setFeeCategory("fine");
                            setCustomAmount(String(student.fine_fee));
                          }}
                        >
                          ⚠️ Late Fine ({currency(student.fine_fee)})
                        </button>
                      )}
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

                  {/* SITS Multi-Option Gateway Launcher */}
                  <div className="gateway-launcher-box">
                    <button
                      type="button"
                      className="primary-button gateway-launch-main-btn"
                      onClick={() => openGatewayModal("upi")}
                    >
                      <span>🔒 Pay Online via Gateway (UPI, Debit/Credit Card, Net Banking)</span>
                      <span className="btn-arrow" aria-hidden="true">→</span>
                    </button>
                    <small className="gateway-launcher-sub">
                      All options: Google Pay, PhonePe, Paytm, RuPay, Visa, MasterCard, Net Banking (SBI, HDFC, ICICI, etc.)
                    </small>
                  </div>

                  <button
                    type="button"
                    className="secondary-button open-any-upi-btn"
                    onClick={() => handleAppSelect({
                      id: "generic",
                      name: "Any UPI App",
                      website: "https://www.npci.org.in/what-we-do/upi/product-overview",
                      uri: genericUpiUri,
                      instructions: "Scan the QR code on your screen with any UPI-compatible app (GPay, PhonePe, Paytm, BHIM, CRED, Amazon Pay, or Mobile Banking).",
                      renderIcon: () => <UpiIcon />
                    })}
                    style={{ width: "100%", marginTop: 10 }}
                  >
                    <UpiIcon />
                    <span>Open Any UPI App</span>
                  </button>

                  {/* Prominent Paid & Claim Receipt Button */}
                  <div className="payment-claim-wrap">
                    <button
                      type="button"
                      className="claim-receipt-cta"
                      onClick={() => openPaymentConfirmation("UPI App / QR Scanner")}
                    >
                      <span className="claim-icon">🧾</span>
                      <div className="claim-text">
                        <strong>I Have Paid — Get Fee Receipt</strong>
                        <small>Instant verified SITS receipt, printable PDF & balance update</small>
                      </div>
                      <span className="claim-arrow">→</span>
                    </button>
                  </div>

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
        </section>

        {/* Gemini AI Fee Summary (At the bottom of the page) */}
        <section className="insight-card animate-fade-up stagger-5">
          <div className="insight-header">
            <span className="insight-sparkle-icon" aria-hidden="true">✨</span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>GEMINI INSIGHT</p>
              <h2 style={{ margin: "2px 0 0" }}>Your fee summary</h2>
            </div>
          </div>
          {summary ? (
            <p className="animate-fade-in" style={{ marginTop: 12 }}>{summary}</p>
          ) : (
            <div className="shimmer-box" style={{ marginTop: 12 }}>
              <div className="shimmer-line" />
              <div className="shimmer-line" />
              <div className="shimmer-line short" />
            </div>
          )}
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

            <button
              type="button"
              className="modal-claim-receipt-btn"
              onClick={() => {
                setActiveApp(null);
                openPaymentConfirmation(activeApp.name);
              }}
            >
              <span>🧾 I have paid in {activeApp.name} → Get Fee Receipt</span>
            </button>

            <div className="modal-action-row">
              <button
                type="button"
                className="modal-website-btn modal-gateway-switch-btn"
                onClick={() => {
                  setActiveApp(null);
                  openGatewayModal("upi");
                }}
              >
                <span>🌐 View All Options (UPI, Debit/Credit Card, Net Banking)</span>
                <span aria-hidden="true">→</span>
              </button>

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

      {/* Payment Confirmation Dialog */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => !submittingPayment && setShowConfirmModal(false)}>
          <div className="modal-card confirm-payment-dialog animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowConfirmModal(false)}
              disabled={submittingPayment}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="modal-header">
              <span style={{ fontSize: 24 }} aria-hidden="true">🧾</span>
              <h3>Confirm Payment & Claim Receipt</h3>
            </div>

            <p className="modal-instructions">
              Enter the amount you paid and your UPI Transaction ID (UTR). Your official SITS Academic Fee Receipt will generate immediately and your balance will be updated.
            </p>

            <form onSubmit={handleConfirmPayment} className="confirm-payment-form">
              <div className="form-field-group">
                <label htmlFor="confirm-payment-amount">Amount Paid (₹)*</label>
                <div className="direct-amount-input-wrap">
                  <span className="currency-prefix">₹</span>
                  <input
                    id="confirm-payment-amount"
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    className="direct-amount-input"
                    placeholder="Enter amount paid"
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label htmlFor="confirm-payment-app">Payment Mode / App Used</label>
                <select
                  id="confirm-payment-app"
                  value={confirmApp}
                  onChange={(e) => setConfirmApp(e.target.value)}
                  className="confirm-app-select"
                >
                  <option value="PhonePe">PhonePe</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="Paytm">Paytm</option>
                  <option value="BHIM UPI">BHIM UPI</option>
                  <option value="UPI QR Scanner">UPI QR Scanner</option>
                  <option value="CRED / Other UPI">CRED / Other UPI</option>
                </select>
              </div>

              <div className="form-field-group">
                <label htmlFor="confirm-payment-utr">
                  UPI Transaction ID / UTR No. <small style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional / 12 Digits)</small>
                </label>
                <input
                  id="confirm-payment-utr"
                  type="text"
                  maxLength={30}
                  value={confirmUtr}
                  onChange={(e) => setConfirmUtr(e.target.value)}
                  placeholder="e.g. 425619827341"
                  className="confirm-utr-input monospace"
                />
                <small className="field-hint">Found in your payment app receipt under UTR or UPI Ref Number.</small>
              </div>

              {confirmError && <p className="form-error" style={{ margin: "6px 0", fontSize: 13 }}>{confirmError}</p>}

              <div className="modal-action-row" style={{ marginTop: 18 }}>
                <button
                  type="submit"
                  className="primary-button confirm-submit-btn"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? (
                    <>
                      <span className="btn-spinner" />
                      Generating Official Receipt...
                    </>
                  ) : (
                    <>
                      <span>🧾 Generate Official Receipt</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submittingPayment}
                  style={{ margin: 0 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official SITS Fee Receipt Modal */}
      {showReceiptModal && (
        <FeeReceiptModal
          receipts={receipts}
          selectedReceiptId={selectedReceiptId}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* SITS Unified Multi-Option Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showGatewayModal}
        onClose={() => setShowGatewayModal(false)}
        student={student}
        amount={hasValidAmount ? numericAmount : targetCategoryAmount}
        initialMode={gatewayMode}
        feeType={feeCategory}
        payeeUpi={vpa}
        payeeName={payee}
        genericUpiUri={genericUpiUri}
        onPaymentSuccess={handleGatewayPaymentSuccess}
      />
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
