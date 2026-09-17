"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaymentGatewayModal, { PaymentMode } from "@/components/PaymentGatewayModal";
import FeeReceiptModal from "@/components/FeeReceiptModal";
import { createClient } from "@/lib/supabase/client";
import { Student, FeeReceipt } from "@/lib/types";
import { currency } from "@/lib/utils";

// Brand badges matching Page 6
function RazorpayBadge() {
  return (
    <span className="pay-badge razorpay-badge" title="Razorpay Secure Payment">
      <span className="razorpay-logo-icon">⚡</span>
      <span className="razorpay-text">Razorpay</span>
    </span>
  );
}

function VisaBadge() {
  return (
    <span className="pay-badge visa-badge" title="Visa">
      <span className="visa-v">V</span>ISA
    </span>
  );
}

function MastercardBadge() {
  return (
    <span className="pay-badge mastercard-badge" title="Mastercard">
      <span className="mc-circle mc-red" />
      <span className="mc-circle mc-yellow" />
    </span>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Amount state
  const paramAmount = searchParams.get("amount");
  const [amount, setAmount] = useState<number>(
    paramAmount ? Number(paramAmount) : 82500
  );

  // Selected payment method matching Page 6
  const [selectedMethod, setSelectedMethod] = useState<
    "razorpay" | "card" | "upi" | "netbanking"
  >("razorpay");

  // Gateway Modal & Receipt state
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayMode, setGatewayMode] = useState<PaymentMode>("upi");
  const [latestReceipt, setLatestReceipt] = useState<FeeReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    async function loadStudent() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("students")
            .select("*")
            .eq("email", user.email)
            .maybeSingle();

          if (data) {
            setStudent(data);
            if (!paramAmount && data.due_fee > 0) {
              setAmount(data.due_fee + (data.fine_fee || 0));
            }
          }
        }
      } catch (err) {
        console.error("Error loading student:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [paramAmount]);

  function handlePaySecurely() {
    if (selectedMethod === "card") {
      setGatewayMode("debit");
    } else if (selectedMethod === "upi") {
      setGatewayMode("upi");
    } else if (selectedMethod === "netbanking") {
      setGatewayMode("netbanking");
    } else {
      setGatewayMode("upi"); // Razorpay all-in-one default
    }
    setShowGatewayModal(true);
  }

  function handlePaymentSuccess(receipt: FeeReceipt) {
    setShowGatewayModal(false);
    setLatestReceipt(receipt);
    setShowReceiptModal(true);
  }

  const studentName = student ? student.name : "Rahul Kumar";
  const studentId = student ? student.student_id : "STU1024";
  const courseName = "B.Tech (CSE)";
  const academicYearLabel = "3rd Year";

  const activeStudent: Student = student || {
    id: "demo-stu",
    student_id: studentId,
    name: studentName,
    email: "student@siddhartha.org.in",
    total_fee: amount,
    paid_fee: 0,
    due_fee: amount,
    fine_fee: 0,
    created_at: new Date().toISOString()
  };

  const genericUpiUri = `upi://pay?pa=8688099587@ybl&pn=${encodeURIComponent("SITS Accounts")}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Fee-${studentId}`)}`;

  return (
    <div className="smart-page-wrapper">
      <Navbar activePage="/payment" />

      <main className="smart-content-page">
        <div className="content-page-header">
          <div className="header-breadcrumbs">
            <Link href="/">Home</Link> <span>›</span> <strong>Make a Payment</strong>
          </div>
          <h1>Make a Payment</h1>
          <p className="page-desc">
            Secure and convenient payment options for academic fees and campus services.
          </p>
        </div>

        {/* 2-Column Dual-Card Payment Console matching Page 6 */}
        <div className="smart-pay-container standalone-pay-view animate-fade-up">
          <div className="smart-pay-grid">
            {/* Left Card: Payment Details */}
            <div className="smart-pay-card payment-details-card">
              <div className="smart-card-header">
                <h3>Payment Details</h3>
                <span className="receipt-ref-badge">INV-{new Date().getFullYear()}-0942</span>
              </div>

              <div className="payment-details-table">
                <div className="p-detail-row">
                  <span className="p-detail-label">Student Name</span>
                  <strong className="p-detail-val">{studentName}</strong>
                </div>
                <div className="p-detail-row">
                  <span className="p-detail-label">Student ID</span>
                  <strong className="p-detail-val monospace">{studentId}</strong>
                </div>
                <div className="p-detail-row">
                  <span className="p-detail-label">Course</span>
                  <strong className="p-detail-val">{courseName}</strong>
                </div>
                <div className="p-detail-row">
                  <span className="p-detail-label">Year</span>
                  <strong className="p-detail-val">{academicYearLabel}</strong>
                </div>

                {/* Amount to Pay Row */}
                <div className="p-detail-row amount-highlight-row">
                  <span className="p-detail-label">Amount</span>
                  <div className="p-detail-amount monospace">
                    {currency(amount)}
                  </div>
                </div>
              </div>

              <div className="details-card-footer">
                <Link href="/fee-calculator" className="recalculate-link">
                  ← Recalculate or Change Facilities
                </Link>
              </div>
            </div>

            {/* Right Card: Select Payment Method */}
            <div className="smart-pay-card select-method-card">
              <div className="smart-card-header">
                <h3>Select Payment Method</h3>
                <span className="security-lock-badge">🔒 256-Bit SSL</span>
              </div>

              <div className="payment-methods-list">
                {/* Method 1: Razorpay */}
                <label
                  className={`payment-method-item ${
                    selectedMethod === "razorpay" ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMethod("razorpay")}
                >
                  <div className="method-left">
                    <span className="custom-radio">
                      {selectedMethod === "razorpay" && <span className="radio-dot" />}
                    </span>
                    <span className="method-title">
                      Razorpay (UPI / Card / Net Banking)
                    </span>
                  </div>
                  <div className="method-badges">
                    <RazorpayBadge />
                  </div>
                </label>

                {/* Method 2: Credit / Debit Card */}
                <label
                  className={`payment-method-item ${
                    selectedMethod === "card" ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMethod("card")}
                >
                  <div className="method-left">
                    <span className="custom-radio">
                      {selectedMethod === "card" && <span className="radio-dot" />}
                    </span>
                    <span className="method-title">Credit / Debit Card</span>
                  </div>
                  <div className="method-badges">
                    <VisaBadge />
                    <MastercardBadge />
                  </div>
                </label>

                {/* Method 3: UPI */}
                <label
                  className={`payment-method-item ${
                    selectedMethod === "upi" ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMethod("upi")}
                >
                  <div className="method-left">
                    <span className="custom-radio">
                      {selectedMethod === "upi" && <span className="radio-dot" />}
                    </span>
                    <span className="method-title">
                      UPI (Google Pay / PhonePe / Paytm)
                    </span>
                  </div>
                  <div className="method-badges upi-badges-row">
                    <span className="upi-app-mini-pill gpay-pill">GPay</span>
                    <span className="upi-app-mini-pill phonepe-pill">PhonePe</span>
                    <span className="upi-app-mini-pill paytm-pill">Paytm</span>
                  </div>
                </label>

                {/* Method 4: Net Banking */}
                <label
                  className={`payment-method-item ${
                    selectedMethod === "netbanking" ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMethod("netbanking")}
                >
                  <div className="method-left">
                    <span className="custom-radio">
                      {selectedMethod === "netbanking" && <span className="radio-dot" />}
                    </span>
                    <span className="method-title">Net Banking</span>
                  </div>
                  <div className="method-badges">
                    <span className="bank-glyph-icon">🏛️</span>
                  </div>
                </label>
              </div>

              {/* Big Blue Pay Securely Button */}
              <button
                type="button"
                className="pay-securely-btn"
                onClick={handlePaySecurely}
              >
                <span className="lock-icon">🔒</span>
                <span>Pay Securely {currency(amount)}</span>
              </button>

              {/* Security Pill */}
              <div className="payment-security-pill">
                <span className="security-icon">🛡️</span>
                <span>Your payment is secured with 256-bit SSL encryption.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 2-Step OTP + PIN Collegiate Gateway Modal */}
      {showGatewayModal && (
        <PaymentGatewayModal
          isOpen={showGatewayModal}
          onClose={() => setShowGatewayModal(false)}
          student={activeStudent}
          amount={amount}
          initialMode={gatewayMode}
          feeType="all"
          payeeUpi="8688099587@ybl"
          payeeName="SITS Accounts"
          genericUpiUri={genericUpiUri}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Official Receipt Modal */}
      {showReceiptModal && latestReceipt && (
        <FeeReceiptModal
          receipts={[latestReceipt]}
          selectedReceiptId={latestReceipt.id}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      <Footer />
    </div>
  );
}
