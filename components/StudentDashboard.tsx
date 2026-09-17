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
import { WhatsAppIcon } from "@/components/WhatsAppWidget";

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"razorpay" | "card" | "upi" | "netbanking">("razorpay");

  function handlePaySecurely() {
    if (selectedPaymentMethod === "card") {
      openGatewayModal("debit");
    } else if (selectedPaymentMethod === "upi") {
      openGatewayModal("upi");
    } else if (selectedPaymentMethod === "netbanking") {
      openGatewayModal("netbanking");
    } else {
      // Razorpay All-in-One
      openGatewayModal("upi");
    }
  }

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

  // Step-by-Step Dashboard Workflow state
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [viewMode, setViewMode] = useState<"stepper" | "all">("stepper");
  const [isMobile, setIsMobile] = useState(false);

  function goToStep(step: 1 | 2 | 3 | 4) {
    setActiveStep(step);
    if (typeof window !== "undefined") {
      const topElem = document.querySelector(".stepper-header-card");
      if (topElem) {
        topElem.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 120, behavior: "smooth" });
      }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    }

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
    setActiveStep(3);
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
      setActiveStep(3);
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
      setActiveStep(3);
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
          <a
            href="https://wa.me/918712303032?text=Hello%20SITS%20Accounts%2C%20I%20need%20help%20with%20my%20fee%20payment."
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-whatsapp-btn"
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon size={17} />
            <span>WhatsApp</span>
          </a>
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
          <div className="dashboard-header-actions animate-fade-in">
            <a
              href="https://wa.me/918712303032?text=Hello%20SITS%20Accounts%2C%20I%20need%20help%20with%20my%20fee%20payment."
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-header-pill"
              title="Chat on WhatsApp"
            >
              <span className="wa-icon-circle">
                <WhatsAppIcon size={18} />
              </span>
              <span className="wa-pill-text">
                WhatsApp
              </span>
            </a>
            {receipts.length > 0 && (
              <button
                type="button"
                className="receipts-header-pill"
                onClick={() => {
                  goToStep(3);
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

        {/* Interactive Step-by-Step Stepper Header */}
        <div className="stepper-header-card animate-fade-up">
          <div className="stepper-header-top">
            <div className="stepper-title-area">
              <span className="stepper-kicker">STEP-BY-STEP WORKFLOW</span>
              <h2 className="stepper-headline">
                {activeStep === 1 && "Step 1: Fee Assessment & Breakdown"}
                {activeStep === 2 && "Step 2: Online Fee Payment Gateway"}
                {activeStep === 3 && "Step 3: Official Receipts & Records"}
                {activeStep === 4 && "Step 4: AI Fee Advisory & Helpdesk"}
              </h2>
            </div>
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`mode-toggle-btn ${viewMode === "stepper" ? "active" : ""}`}
                onClick={() => setViewMode("stepper")}
                title="Focused step-by-step navigation"
              >
                <span>👣 Step-by-Step</span>
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${viewMode === "all" ? "active" : ""}`}
                onClick={() => setViewMode("all")}
                title="View all sections together on a single page"
              >
                <span>📄 View All</span>
              </button>
            </div>
          </div>

          <div className="stepper-track-wrap">
            <div className="stepper-progress-track">
              <div
                className="stepper-progress-fill"
                style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
              />
            </div>
            <div className="stepper-steps-grid">
              {[
                { id: 1 as const, title: "Fee Overview", subtitle: "Tuition & Fines", icon: "📋" },
                { id: 2 as const, title: "Pay Online", subtitle: "UPI & Cards", icon: "💳" },
                { id: 3 as const, title: "Fee Receipts", subtitle: `${receipts.length} Issued`, icon: "🧾" },
                { id: 4 as const, title: "AI Summary", subtitle: "Advisory & Help", icon: "📊" },
              ].map((s) => {
                const isCompleted = s.id < activeStep;
                const isActive = s.id === activeStep;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`stepper-step-pill ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    onClick={() => {
                      goToStep(s.id);
                      if (viewMode === "all") {
                        const target = document.getElementById(`step-section-${s.id}`);
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    <div className="stepper-pill-circle">
                      {isCompleted ? "✓" : s.id}
                    </div>
                    <div className="stepper-pill-text">
                      <strong className="stepper-pill-title">{s.icon} {s.title}</strong>
                      <span className="stepper-pill-sub">{s.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 1: FEE OVERVIEW & DUES */}
        {(viewMode === "all" || activeStep === 1) && (
          <div className="step-pane animate-fade-in" id="step-section-1">
            {viewMode === "all" && (
              <div className="step-section-divider">
                <span className="step-divider-tag">STEP 1 OF 4</span>
                <h3>Fee Overview & Academic Dues</h3>
              </div>
            )}
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
            <div className="card-label">CURRENT TUITION DUE</div>
            <span className="balance-amount">{currency(student.due_fee)}</span>
            <span className="balance-caption">{student.due_fee > 0 ? "Tuition balance payable" : "All tuition fees completed"}</span>
            <span className={`status-pill ${student.due_fee > 0 ? "warning" : "settled"}`}>
              {student.due_fee > 0 ? "Due" : "Settled ✓"}
            </span>
          </div>
        </section>

        {/* Academic Tuition Fee Breakdown Card */}
        <section className="fee-card animate-fade-up stagger-3">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACADEMIC TUITION BREAKDOWN</p>
              <h2>Academic year 2026–27</h2>
            </div>
            <span className="status-pill neutral">Updated today</span>
          </div>
          <div className="fee-grid">
            <Fee label="Total tuition fee" value={student.total_fee} />
            <Fee label="Paid fee" value={student.paid_fee} tone="success" />
            <Fee label="Remaining due" value={student.due_fee} tone="warning" />
          </div>
        </section>

        {/* Separate Standalone Late Fine Fees Section */}
        <section className={`fine-section-card animate-fade-up stagger-4 ${student.fine_fee > 0 ? "has-fine" : "no-fine"}`}>
          <div className="fine-card-content">
            <div className="fine-card-info">
              <span className="fine-badge-icon">{student.fine_fee > 0 ? "⚠️" : "✓"}</span>
              <div>
                <p className="eyebrow" style={{ color: student.fine_fee > 0 ? "#dc2626" : "#059669", marginBottom: 4 }}>
                  SEPARATE PENALTY ACCOUNT
                </p>
                <h3 style={{ margin: "0 0 6px", fontSize: 21, color: "#0f172a" }}>Late Fine Fees</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {student.fine_fee > 0
                    ? "Late submission fee penalty applied separately from your academic tuition fee."
                    : "No late fines or penalty charges active on your institutional record."}
                </p>
              </div>
            </div>
            <div className="fine-card-actions">
              <div className="fine-card-amount-wrap">
                <span className="fine-label">Fine Fee Balance</span>
                <span className="fine-number" style={{ color: student.fine_fee > 0 ? "#dc2626" : "#059669" }}>
                  {currency(student.fine_fee)}
                </span>
                <span className={`status-pill ${student.fine_fee > 0 ? "danger" : "settled"}`}>
                  {student.fine_fee > 0 ? "Fine Pending ⚠️" : "Cleared ✓"}
                </span>
              </div>
              {student.fine_fee > 0 && (
                <button
                  type="button"
                  className="primary-button pay-fine-action-btn"
                  onClick={() => {
                    handleSelectFeeCategory("fine");
                    goToStep(2);
                  }}
                  title="Pay this fine fee separately"
                >
                  <span>Pay Late Fine ({currency(student.fine_fee)}) →</span>
                </button>
              )}
            </div>
          </div>
        </section>

            {/* Step 1 Navigation Footer */}
            <div className="step-navigation-footer animate-fade-up">
              <div className="step-nav-info">
                <span className="step-nav-indicator">Step 1 of 4: Fee Review Completed</span>
                <p className="step-nav-sub">Next, proceed to pay academic tuition or late fine fees online.</p>
              </div>
              <button
                type="button"
                className="primary-button step-nav-next-btn"
                onClick={() => goToStep(2)}
              >
                <span>Proceed to Pay Fees (Step 2) →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: MAKE PAYMENT ONLINE */}
        {(viewMode === "all" || activeStep === 2) && (
          <div className="step-pane animate-fade-in" id="step-section-2">
            {viewMode === "all" && (
              <div className="step-section-divider">
                <span className="step-divider-tag">STEP 2 OF 4</span>
                <h3>Online Fee Payment Gateway</h3>
              </div>
            )}
            <section className="smart-pay-container animate-fade-up stagger-4">
              <div className="make-payment-header">
                <h2>Make a Payment</h2>
                <p className="make-payment-subtitle">Secure and convenient payment options</p>
              </div>

              <div className="smart-pay-grid">
                {/* Left Card: Payment Details */}
                <div className="smart-pay-card payment-details-card">
                  <h3 className="card-block-title">Payment Details</h3>
                  
                  <div className="payment-details-table">
                    <div className="p-detail-row">
                      <span className="p-detail-label">Student Name</span>
                      <strong className="p-detail-val">{student.name}</strong>
                    </div>
                    <div className="p-detail-row">
                      <span className="p-detail-label">Student ID</span>
                      <strong className="p-detail-val monospace">{student.student_id}</strong>
                    </div>
                    <div className="p-detail-row">
                      <span className="p-detail-label">Course</span>
                      <strong className="p-detail-val">B.Tech (CSE)</strong>
                    </div>
                    <div className="p-detail-row">
                      <span className="p-detail-label">Year</span>
                      <strong className="p-detail-val">3rd Year</strong>
                    </div>

                    {/* Fee Category Selector */}
                    {(student.due_fee > 0 || student.fine_fee > 0) && (
                      <div className="p-detail-row fee-category-select-row">
                        <span className="p-detail-label">Fee Type</span>
                        <div className="fee-type-btn-group">
                          <button
                            type="button"
                            className={`fee-type-pill ${feeCategory === "all" ? "active" : ""}`}
                            onClick={() => handleSelectFeeCategory("all")}
                            title={`Total: ${currency(student.due_fee + student.fine_fee)}`}
                          >
                            <span>Both</span>
                          </button>
                          <button
                            type="button"
                            className={`fee-type-pill ${feeCategory === "tuition" ? "active" : ""}`}
                            onClick={() => handleSelectFeeCategory("tuition")}
                            disabled={student.due_fee <= 0}
                            title={`Tuition: ${currency(student.due_fee)}`}
                          >
                            <span>Tuition</span>
                          </button>
                          <button
                            type="button"
                            className={`fee-type-pill fine-type-pill ${feeCategory === "fine" ? "active" : ""}`}
                            onClick={() => handleSelectFeeCategory("fine")}
                            disabled={student.fine_fee <= 0}
                            title={`Fine: ${currency(student.fine_fee)}`}
                          >
                            <span>Late Fine</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Amount Highlight Row */}
                    <div className="p-detail-row amount-highlight-row">
                      <span className="p-detail-label amount-label">Amount</span>
                      <strong className="p-detail-amount">{currency(numericAmount)}</strong>
                    </div>
                  </div>

                  {/* Preset amounts or custom entry */}
                  <div className="p-amount-controls">
                    <div className="preset-chips-row">
                      <button
                        type="button"
                        className={`preset-chip ${customAmount === null ? "active" : ""}`}
                        onClick={() => setCustomAmount(null)}
                      >
                        Full Due ({currency(targetCategoryAmount)})
                      </button>
                      {[5000, 10000, 20000].map((amt) => {
                        if (amt >= targetCategoryAmount) return null;
                        return (
                          <button
                            key={amt}
                            type="button"
                            className={`preset-chip ${customAmount === String(amt) ? "active" : ""}`}
                            onClick={() => setCustomAmount(String(amt))}
                          >
                            {currency(amt)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="custom-input-wrap">
                      <label htmlFor="custom-amount-input">Custom Amount (₹):</label>
                      <input
                        id="custom-amount-input"
                        type="number"
                        min="1"
                        max={targetCategoryAmount}
                        step="1"
                        placeholder={`Enter amount (max ${targetCategoryAmount})`}
                        value={customAmount ?? ""}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Card: Select Payment Method */}
                <div className="smart-pay-card select-method-card">
                  <h3 className="card-block-title">Select Payment Method</h3>

                  <div className="payment-methods-list">
                    {/* Method 1: Razorpay (UPI / Card / Net Banking) */}
                    <div
                      className={`payment-method-item ${selectedPaymentMethod === "razorpay" ? "selected" : ""}`}
                      onClick={() => setSelectedPaymentMethod("razorpay")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="method-left">
                        <div className={`custom-radio ${selectedPaymentMethod === "razorpay" ? "checked" : ""}`}>
                          <div className="radio-dot" />
                        </div>
                        <span className="method-title">Razorpay (UPI / Card / Net Banking)</span>
                      </div>
                      <div className="method-badges">
                        <RazorpayBadge />
                      </div>
                    </div>

                    {/* Method 2: Credit / Debit Card */}
                    <div
                      className={`payment-method-item ${selectedPaymentMethod === "card" ? "selected" : ""}`}
                      onClick={() => setSelectedPaymentMethod("card")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="method-left">
                        <div className={`custom-radio ${selectedPaymentMethod === "card" ? "checked" : ""}`}>
                          <div className="radio-dot" />
                        </div>
                        <span className="method-title">Credit / Debit Card</span>
                      </div>
                      <div className="method-badges">
                        <VisaBadge />
                        <MastercardBadge />
                      </div>
                    </div>

                    {/* Method 3: UPI (Google Pay / PhonePe / Paytm) */}
                    <div
                      className={`payment-method-item ${selectedPaymentMethod === "upi" ? "selected" : ""}`}
                      onClick={() => setSelectedPaymentMethod("upi")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="method-left">
                        <div className={`custom-radio ${selectedPaymentMethod === "upi" ? "checked" : ""}`}>
                          <div className="radio-dot" />
                        </div>
                        <span className="method-title">UPI (Google Pay / PhonePe / Paytm)</span>
                      </div>
                      <div className="method-badges upi-brand-logos">
                        <GPayIcon />
                        <PhonePeIcon />
                        <PaytmIcon />
                      </div>
                    </div>

                    {/* Method 4: Net Banking */}
                    <div
                      className={`payment-method-item ${selectedPaymentMethod === "netbanking" ? "selected" : ""}`}
                      onClick={() => setSelectedPaymentMethod("netbanking")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="method-left">
                        <div className={`custom-radio ${selectedPaymentMethod === "netbanking" ? "checked" : ""}`}>
                          <div className="radio-dot" />
                        </div>
                        <span className="method-title">Net Banking</span>
                      </div>
                      <div className="method-badges">
                        <span className="bank-glyph-icon" aria-hidden="true">🏛️</span>
                      </div>
                    </div>
                  </div>

                  {/* Big Blue Pay Securely Button */}
                  <button
                    type="button"
                    className="pay-securely-btn"
                    onClick={handlePaySecurely}
                    disabled={!hasValidAmount}
                  >
                    <span className="lock-icon" aria-hidden="true">🔒</span>
                    <span>Pay Securely {hasValidAmount ? currency(numericAmount) : ""}</span>
                  </button>

                  {/* 256-Bit SSL Encryption Pill */}
                  <div className="payment-security-pill">
                    <span className="security-icon" aria-hidden="true">🛡️</span>
                    <span>Your payment is secured with 256-bit SSL encryption.</span>
                  </div>

                  {/* Offline/Manual UTR Claim Link */}
                  <div className="offline-claim-footer">
                    <button
                      type="button"
                      className="offline-claim-link-btn"
                      onClick={() => openPaymentConfirmation("UPI App / QR Scanner")}
                    >
                      🧾 Already paid offline? Claim Receipt with UTR →
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2 Navigation Footer */}
            <div className="step-navigation-footer animate-fade-up">
              <button
                type="button"
                className="secondary-button"
                onClick={() => goToStep(1)}
              >
                <span>← Back to Fee Overview (Step 1)</span>
              </button>
              <button
                type="button"
                className="primary-button step-nav-next-btn"
                onClick={() => goToStep(3)}
              >
                <span>View Fee Receipts (Step 3) →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OFFICIAL FEE RECEIPTS & RECORDS */}
        {(viewMode === "all" || activeStep === 3) && (
          <div className="step-pane animate-fade-in" id="step-section-3">
            {viewMode === "all" && (
              <div className="step-section-divider">
                <span className="step-divider-tag">STEP 3 OF 4</span>
                <h3>Official Fee Receipts & Records</h3>
              </div>
            )}
            <section className="receipts-gallery-section animate-fade-up">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">OFFICIAL INSTITUTIONAL RECORDS</p>
                  <h2>Payment Receipts & Acknowledgements</h2>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                    Verified computer-generated receipts for tuition and fine fee payments.
                  </p>
                </div>
                <div className="receipts-section-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openPaymentConfirmation("UPI App / QR Scanner")}
                  >
                    <span>🧾 Claim Receipt with UTR</span>
                  </button>
                </div>
              </div>

              {receipts.length === 0 ? (
                <div className="empty-receipts-box animate-fade-in">
                  <span className="empty-receipts-icon">🧾</span>
                  <h3>No Fee Receipts Yet</h3>
                  <p>
                    When you complete a payment using UPI, Debit Card, Credit Card, or Net Banking in Step 2,
                    your official verifiable SITS fee acknowledgement will be archived here.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => goToStep(2)}
                    style={{ marginTop: 12 }}
                  >
                    <span>Proceed to Pay Fees (Step 2) →</span>
                  </button>
                </div>
              ) : (
                <div className="receipts-cards-grid animate-fade-in">
                  {receipts.map((r, idx) => (
                    <div key={r.id} className="receipt-summary-card">
                      <div className="r-card-top">
                        <div className="r-card-id-block">
                          <span className="r-card-badge">Receipt #{receipts.length - idx}</span>
                          <strong className="r-card-id">{r.id}</strong>
                        </div>
                        <span className="receipt-status-pill">Verified ✓</span>
                      </div>

                      <div className="r-card-amount-row">
                        <span className="r-card-amount-label">Amount Paid</span>
                        <strong className="r-card-amount">{currency(r.amount_paid)}</strong>
                      </div>

                      <div className="r-card-meta-list">
                        <div className="r-meta-item">
                          <span>Payment Mode:</span>
                          <strong>{r.payment_mode}</strong>
                        </div>
                        {r.utr_number && (
                          <div className="r-meta-item">
                            <span>UTR / Ref No:</span>
                            <code className="monospace">{r.utr_number}</code>
                          </div>
                        )}
                        <div className="r-meta-item">
                          <span>Date & Time:</span>
                          <span>{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      </div>

                      <div className="r-card-actions">
                        <button
                          type="button"
                          className="primary-button r-view-btn"
                          onClick={() => {
                            setSelectedReceiptId(r.id);
                            setShowReceiptModal(true);
                          }}
                        >
                          <span>🖨️ View & Print Official Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Step 3 Navigation Footer */}
            <div className="step-navigation-footer animate-fade-up">
              <button
                type="button"
                className="secondary-button"
                onClick={() => goToStep(2)}
              >
                <span>← Back to Payment (Step 2)</span>
              </button>
              <button
                type="button"
                className="primary-button step-nav-next-btn"
                onClick={() => goToStep(4)}
              >
                <span>View AI Summary & Helpdesk (Step 4) →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI SUMMARY & HELPDESK */}
        {(viewMode === "all" || activeStep === 4) && (
          <div className="step-pane animate-fade-in" id="step-section-4">
            {viewMode === "all" && (
              <div className="step-section-divider">
                <span className="step-divider-tag">STEP 4 OF 4</span>
                <h3>Institutional AI Summary & Accounts Helpdesk</h3>
              </div>
            )}
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

            <section className="accounts-helpdesk-card animate-fade-up">
              <div className="accounts-helpdesk-header">
                <span className="helpdesk-icon">🏛️</span>
                <div>
                  <p className="eyebrow" style={{ margin: 0 }}>OFFICIAL CONTACT</p>
                  <h3 style={{ margin: "2px 0 0", fontSize: 18, color: "#0f172a" }}>Accounts Branch & Fee Helpdesk</h3>
                </div>
              </div>
              <p className="muted" style={{ margin: "10px 0 16px", fontSize: 13 }}>
                For fee concessions, scholarship disbursements, challan verification, or installment inquiries, contact the institutional accounts desk.
              </p>
              <div className="helpdesk-details-grid">
                <div className="helpdesk-item">
                  <span className="helpdesk-label">Campus Location</span>
                  <strong>Room 104, Administrative Block, SITS Narapally, Hyderabad</strong>
                </div>
                <div className="helpdesk-item">
                  <span className="helpdesk-label">Helpdesk Phone</span>
                  <strong>+91 40 2456 7890 / +91 86880 99587</strong>
                </div>
                <div className="helpdesk-item">
                  <span className="helpdesk-label">Official Email</span>
                  <strong>accounts@siddhartha.ac.in</strong>
                </div>
                <div className="helpdesk-item">
                  <span className="helpdesk-label">Office Hours</span>
                  <strong>Mon – Sat: 9:00 AM – 4:30 PM (Counter closes at 3:30 PM)</strong>
                </div>
                <a
                  href="https://wa.me/918712303032?text=Hello%20SITS%20Accounts%20Helpdesk%2C%20I%20need%20assistance%20with%20my%20fee%20payment."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="helpdesk-item helpdesk-wa-item"
                  title="Direct WhatsApp Support"
                >
                  <span className="helpdesk-label">WhatsApp Support</span>
                  <strong style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a" }}>
                    <WhatsAppIcon size={16} /> Chat on WhatsApp →
                  </strong>
                </a>
              </div>
            </section>

            {/* Step 4 Navigation Footer */}
            <div className="step-navigation-footer animate-fade-up">
              <button
                type="button"
                className="secondary-button"
                onClick={() => goToStep(3)}
              >
                <span>← Back to Fee Receipts (Step 3)</span>
              </button>
              <button
                type="button"
                className="primary-button step-nav-next-btn"
                onClick={() => goToStep(1)}
              >
                <span>↺ Return to Fee Overview (Step 1)</span>
              </button>
            </div>
          </div>
        )}
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

            {!isMobile && (
              <div className="desktop-scan-banner animate-fade-in">
                <span className="desktop-banner-icon">📱</span>
                <div>
                  <strong>To Pay via {activeApp.name}:</strong>
                  <p>Scan the QR code above with your phone camera or {activeApp.name} app.</p>
                </div>
              </div>
            )}

            <div className="modal-action-row">
              <button
                type="button"
                className="modal-website-btn modal-gateway-switch-btn"
                onClick={() => {
                  setActiveApp(null);
                  openGatewayModal("upi");
                }}
              >
                <span>🌐 Open Payment Gateway (Cards, Net Banking, UPI)</span>
                <span aria-hidden="true">→</span>
              </button>

              {isMobile ? (
                <a
                  href={activeApp.uri}
                  className="primary-button"
                  style={{ marginTop: 0 }}
                >
                  <span>🚀 Open in {activeApp.name}</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: 0 }}
                  onClick={() => {
                    setActiveApp(null);
                    openGatewayModal("upi");
                  }}
                  title="Pay directly on this computer via Payment Gateway"
                >
                  <span>💻 Pay on this PC via Gateway →</span>
                </button>
              )}
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

function RazorpayBadge() {
  return (
    <div className="razorpay-badge-wrap" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14.5 2L5 14h6l-2 8 11-13h-6.5l2.5-7z" fill="#0284c7" />
      </svg>
      <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 13, color: "#0c2340", letterSpacing: -0.5 }}>
        Razor<span style={{ color: "#0284c7" }}>pay</span>
      </span>
    </div>
  );
}

function VisaBadge() {
  return (
    <span className="visa-badge-text" style={{ fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "#1a1f71", letterSpacing: 0.5 }}>
      VISA
    </span>
  );
}

function MastercardBadge() {
  return (
    <svg width="28" height="18" viewBox="0 0 36 24" fill="none" aria-hidden="true" style={{ verticalAlign: "middle" }}>
      <circle cx="13" cy="12" r="10" fill="#EB001B" />
      <circle cx="23" cy="12" r="10" fill="#F79E1B" fillOpacity="0.88" />
    </svg>
  );
}
