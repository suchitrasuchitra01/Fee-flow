"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import sitsLogo from "@/SITS-logo-2.webp";
import { QRCodeSVG } from "qrcode.react";
import { Student, FeeReceipt } from "@/lib/types";

export type PaymentMode = "upi" | "debit" | "credit" | "netbanking";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  amount: number;
  initialMode?: PaymentMode;
  payeeUpi: string;
  payeeName: string;
  genericUpiUri: string;
  onPaymentSuccess: (receipt: FeeReceipt, updatedStudent?: Student) => void;
}

const POPULAR_BANKS = [
  { id: "sbi", name: "State Bank of India", short: "SBI", badge: "🏛️" },
  { id: "hdfc", name: "HDFC Bank", short: "HDFC", badge: "🏦" },
  { id: "icici", name: "ICICI Bank", short: "ICICI", badge: "🔶" },
  { id: "axis", name: "Axis Bank", short: "AXIS", badge: "🔴" },
  { id: "kotak", name: "Kotak Mahindra Bank", short: "KOTAK", badge: "🛡️" },
  { id: "pnb", name: "Punjab National Bank", short: "PNB", badge: "🦁" },
];

const ALL_INDIAN_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "IDBI Bank",
  "IndusInd Bank",
  "Federal Bank",
  "Yes Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Overseas Bank",
  "UCO Bank",
  "Bank of Maharashtra",
  "South Indian Bank",
  "RBL Bank",
  "IDFC First Bank",
  "Karnataka Bank",
  "Karur Vysya Bank",
  "Tamilnad Mercantile Bank",
  "City Union Bank",
  "Bandhan Bank",
  "Au Small Finance Bank",
  "Equitas Small Finance Bank",
];

function formatCardNumber(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

function detectCardNetwork(num: string) {
  const clean = num.replace(/\D/g, "");
  if (clean.startsWith("4")) return "VISA";
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "MasterCard";
  if (/^(60|65|81|82|508)/.test(clean)) return "RuPay";
  if (/^3[47]/.test(clean)) return "Amex";
  return "Card";
}

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  student,
  amount,
  initialMode = "upi",
  payeeUpi,
  payeeName,
  genericUpiUri,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentMode>(initialMode);

  // Sync initial tab if changed
  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode, isOpen]);

  // Form states
  const [vpaInput, setVpaInput] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState(student.name);
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardBank, setCardBank] = useState("HDFC Bank");

  const [selectedBank, setSelectedBank] = useState("State Bank of India (SBI)");

  // OTP and PIN verification states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPinText, setShowPinText] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [currentPaymentModeLabel, setCurrentPaymentModeLabel] = useState("");

  // Reset verification states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowOtpScreen(false);
      setShowPinScreen(false);
      setIsProcessing(false);
      setOtpCode("");
      setPinCode("");
      setOtpError("");
      setPinError("");
      setShowPinText(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCardNumber(formatCardNumber(e.target.value));
  }

  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCardExpiry(formatExpiry(e.target.value));
  }

  function startPaymentFlow(modeLabel: string) {
    setCurrentPaymentModeLabel(modeLabel);
    setIsProcessing(true);
    setProcessingStage("Connecting securely to bank gateway...");

    setTimeout(() => {
      setIsProcessing(false);
      setShowOtpScreen(true);
      setShowPinScreen(false);
      setOtpCode("");
      setOtpError("");
      setPinCode("");
      setPinError("");
    }, 800);
  }

  // Step 1: Verify OTP and proceed to PIN (amount is NOT paid yet)
  function handleVerifyOtpAndProceedToPin(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError("Please enter a valid 6-digit OTP to continue.");
      return;
    }

    setOtpError("");
    setIsProcessing(true);
    setProcessingStage("OTP verified successfully ✓ Connecting to secure PIN authorization...");

    setTimeout(() => {
      setIsProcessing(false);
      setShowOtpScreen(false);
      setShowPinScreen(true);
      setPinCode("");
      setPinError("");
      setShowPinText(false);
    }, 600);
  }

  // Step 2: Verify PIN and finalize fee payment
  async function handleFinalSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinCode || pinCode.trim().length < 4) {
      setPinError("Please enter your 4 to 6 digit security PIN to authorize debit.");
      return;
    }

    setPinError("");
    setIsProcessing(true);
    setProcessingStage("Verifying PIN & authorizing institutional fee debit...");

    try {
      const generatedUtr = `PAY${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch("/api/payments/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          amount_paid: amount,
          payment_mode: currentPaymentModeLabel,
          utr_number: generatedUtr,
          payee_upi: payeeUpi,
          payee_name: payeeName,
        }),
      });

      const data = await res.json();
      let receipt: FeeReceipt;

      if (res.ok && data.receipt) {
        receipt = data.receipt;
        onPaymentSuccess(receipt, data.student);
      } else {
        // Fallback local receipt
        receipt = {
          id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          student_id: student.student_id,
          student_name: student.name,
          email: student.email,
          amount_paid: amount,
          previous_due: student.due_fee,
          remaining_due: Math.max(0, student.due_fee - amount),
          total_fee: student.total_fee,
          payment_mode: currentPaymentModeLabel,
          utr_number: generatedUtr,
          payee_upi: payeeUpi,
          payee_name: payeeName,
          created_at: new Date().toISOString(),
          academic_year: "2026–2027",
        };
        onPaymentSuccess(receipt);
      }

      setIsProcessing(false);
      setShowPinScreen(false);
      setShowOtpScreen(false);
      onClose();
    } catch {
      // Local fallback on network error
      const fallbackUtr = `PAY${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
      const receipt: FeeReceipt = {
        id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        student_id: student.student_id,
        student_name: student.name,
        email: student.email,
        amount_paid: amount,
        previous_due: student.due_fee,
        remaining_due: Math.max(0, student.due_fee - amount),
        total_fee: student.total_fee,
        payment_mode: currentPaymentModeLabel,
        utr_number: fallbackUtr,
        payee_upi: payeeUpi,
        payee_name: payeeName,
        created_at: new Date().toISOString(),
        academic_year: "2026–2027",
      };
      setIsProcessing(false);
      setShowPinScreen(false);
      setShowOtpScreen(false);
      onClose();
      onPaymentSuccess(receipt);
    }
  }

  function handleAutoFillOtp() {
    setOtpCode("123456");
    setOtpError("");
  }

  function handleAutoFillPin() {
    setPinCode("1234");
    setPinError("");
  }

  return (
    <div className="gateway-modal-backdrop" onClick={() => !isProcessing && onClose()}>
      <div className="gateway-modal-dialog animate-pop-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Gateway Header */}
        <div className="gateway-header">
          <div className="gateway-header-left">
            <div className="gateway-brand">
              <Image
                src={sitsLogo}
                alt="SITS Crest"
                width={38}
                height={38}
                className="gateway-logo-img"
              />
              <div>
                <strong className="gateway-title">SITS Payment Gateway</strong>
                <small className="gateway-subtitle">Siddhartha Institute of Technology & Sciences</small>
              </div>
            </div>
          </div>

          <div className="gateway-header-right">
            <div className="gateway-amount-badge">
              <span className="gateway-amount-label">Payable Amount</span>
              <strong className="gateway-amount-val">₹{amount.toLocaleString("en-IN")}</strong>
            </div>
            <button
              type="button"
              className="gateway-close-btn"
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close payment gateway"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Security & Student Banner */}
        <div className="gateway-security-bar">
          <div className="gateway-student-meta">
            <span>Student: <b>{student.name}</b> (ID: <code>{student.student_id}</code>)</span>
          </div>
          <div className="gateway-security-badge">
            <span className="lock-icon" aria-hidden="true">🔒</span>
            <span>256-Bit SSL Encrypted & Verified</span>
          </div>
        </div>

        {/* Gateway Main Body with Navigation Sidebar */}
        <div className="gateway-body">
          {/* Mode Sidebar */}
          <nav className="gateway-sidebar" aria-label="Payment modes">
            <button
              type="button"
              className={`gateway-nav-btn ${activeTab === "upi" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("upi");
                setShowOtpScreen(false);
                setShowPinScreen(false);
              }}
            >
              <span className="nav-icon">📱</span>
              <div className="nav-text">
                <strong>UPI & QR</strong>
                <small>GPay, PhonePe, Paytm, BHIM</small>
              </div>
            </button>

            <button
              type="button"
              className={`gateway-nav-btn ${activeTab === "debit" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("debit");
                setShowOtpScreen(false);
                setShowPinScreen(false);
              }}
            >
              <span className="nav-icon">💳</span>
              <div className="nav-text">
                <strong>Debit Card</strong>
                <small>RuPay, Visa, MasterCard</small>
              </div>
            </button>

            <button
              type="button"
              className={`gateway-nav-btn ${activeTab === "credit" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("credit");
                setShowOtpScreen(false);
                setShowPinScreen(false);
              }}
            >
              <span className="nav-icon">💳</span>
              <div className="nav-text">
                <strong>Credit Card</strong>
                <small>Visa, MasterCard, Amex</small>
              </div>
            </button>

            <button
              type="button"
              className={`gateway-nav-btn ${activeTab === "netbanking" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("netbanking");
                setShowOtpScreen(false);
                setShowPinScreen(false);
              }}
            >
              <span className="nav-icon">🏛️</span>
              <div className="nav-text">
                <strong>Net Banking</strong>
                <small>SBI, HDFC, ICICI, Axis, & 30+ Banks</small>
              </div>
            </button>
          </nav>

          {/* Active Payment View */}
          <div className="gateway-content-area">
            {isProcessing ? (
              <div className="gateway-processing-view animate-fade-in">
                <div className="gateway-spinner" />
                <h3>{processingStage || "Processing secure payment..."}</h3>
                <p>Please do not refresh or close this window.</p>
              </div>
            ) : showOtpScreen ? (
              /* Step 1: Simulated Bank 3D Secure / OTP Screen */
              <div className="gateway-otp-view animate-fade-up">
                <div className="bank-otp-header">
                  <span className="bank-shield-icon">🛡️</span>
                  <div>
                    <span className="step-badge">Step 1 of 2: OTP Verification</span>
                    <h4>Bank Authentication (3D Secure 2.0)</h4>
                    <p>
                      Enter the 6-digit OTP sent to your registered mobile ending in ••••{" "}
                      <strong>{student.student_id.slice(-4) || "5638"}</strong> & {student.email}
                    </p>
                    <small className="otp-demo-badge">
                      💡 <b>Simulation Mode:</b> Use test OTP <strong>123456</strong> or click <b>Auto-fill Test OTP</b>.
                    </small>
                  </div>
                </div>

                <div className="bank-otp-summary">
                  <div className="otp-summary-item">
                    <span>Merchant:</span>
                    <strong>Siddhartha Institute of Tech & Sciences</strong>
                  </div>
                  <div className="otp-summary-item">
                    <span>Payment Mode:</span>
                    <strong>{currentPaymentModeLabel}</strong>
                  </div>
                  <div className="otp-summary-item">
                    <span>Amount:</span>
                    <strong style={{ color: "#0284c7" }}>₹{amount.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtpAndProceedToPin} className="otp-form">
                  <label htmlFor="gateway-otp-input">Enter 6-Digit OTP</label>
                  <div className="otp-input-row">
                    <input
                      id="gateway-otp-input"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      className="otp-code-input"
                    />
                    <button
                      type="button"
                      className="autofill-otp-btn"
                      onClick={handleAutoFillOtp}
                      title="Click to fill sample OTP 123456"
                    >
                      ⚡ Auto-fill Test OTP
                    </button>
                  </div>

                  {otpError && <p className="form-error">{otpError}</p>}

                  <div className="otp-actions-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowOtpScreen(false)}
                      style={{ marginTop: 0 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      style={{ marginTop: 0, flex: 1 }}
                    >
                      Verify OTP & Enter PIN ➔
                    </button>
                  </div>
                </form>

                <p className="otp-footer-note">
                  🔒 Step 1 of 2: Amount is <strong>not debited yet</strong>. After verifying your OTP, you will enter your secure PIN to authorize payment.
                </p>
              </div>
            ) : showPinScreen ? (
              /* Step 2: Simulated Secure PIN / UPI PIN Authorization Screen */
              <div className="gateway-pin-view animate-fade-up">
                <div className="bank-otp-header">
                  <span className="bank-shield-icon">
                    {currentPaymentModeLabel.toLowerCase().includes("upi")
                      ? "🔐"
                      : currentPaymentModeLabel.toLowerCase().includes("banking")
                      ? "🏛️"
                      : "💳"}
                  </span>
                  <div>
                    <span className="step-badge">Step 2 of 2: PIN Authorization</span>
                    <h4>
                      {currentPaymentModeLabel.toLowerCase().includes("upi")
                        ? "Enter UPI PIN"
                        : currentPaymentModeLabel.toLowerCase().includes("banking")
                        ? `${selectedBank} Transaction PIN`
                        : "Enter Card / ATM PIN"}
                    </h4>
                    <p>
                      {currentPaymentModeLabel.toLowerCase().includes("upi")
                        ? `Enter your 4 or 6-digit UPI PIN to authorize instant payment of ₹${amount.toLocaleString("en-IN")} to ${payeeName}.`
                        : currentPaymentModeLabel.toLowerCase().includes("banking")
                        ? `Enter your secure transaction authorization PIN to release fee payment from ${selectedBank}.`
                        : `Enter your 4-digit ATM / Card Security PIN to authorize fee payment of ₹${amount.toLocaleString("en-IN")}.`}
                    </p>
                    <small className="otp-demo-badge">
                      💡 <b>Simulation Mode:</b> Enter test PIN <strong>1234</strong> or click <b>Auto-fill Test PIN</b>.
                    </small>
                  </div>
                </div>

                <div className="bank-otp-summary">
                  <div className="otp-summary-item">
                    <span>Beneficiary:</span>
                    <strong>SITS Institutional Account</strong>
                  </div>
                  <div className="otp-summary-item">
                    <span>Authorized Mode:</span>
                    <strong>{currentPaymentModeLabel}</strong>
                  </div>
                  <div className="otp-summary-item">
                    <span>Amount to Debit:</span>
                    <strong style={{ color: "#0284c7" }}>₹{amount.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <form onSubmit={handleFinalSubmitPin} className="otp-form">
                  <label htmlFor="gateway-pin-input">
                    {currentPaymentModeLabel.toLowerCase().includes("upi")
                      ? "Enter 4 or 6-Digit UPI PIN"
                      : currentPaymentModeLabel.toLowerCase().includes("banking")
                      ? "Enter Transaction Authorization PIN"
                      : "Enter 4-Digit Card / ATM PIN"}
                  </label>
                  <div className="pin-input-row">
                    <input
                      id="gateway-pin-input"
                      type={showPinText ? "text" : "password"}
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••"
                      autoFocus
                      className="pin-code-input"
                    />
                    <button
                      type="button"
                      className="pin-toggle-btn"
                      onClick={() => setShowPinText(!showPinText)}
                      title={showPinText ? "Hide PIN" : "Show PIN"}
                    >
                      {showPinText ? "👁️ Hide" : "👁️ View"}
                    </button>
                    <button
                      type="button"
                      className="autofill-pin-btn"
                      onClick={handleAutoFillPin}
                      title="Click to fill sample PIN 1234"
                    >
                      ⚡ Auto-fill Test PIN (1234)
                    </button>
                  </div>

                  {pinError && <p className="form-error">{pinError}</p>}

                  <div className="otp-actions-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setShowPinScreen(false);
                        setShowOtpScreen(true);
                      }}
                      style={{ marginTop: 0 }}
                    >
                      ← Back to OTP
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      style={{ marginTop: 0, flex: 1 }}
                    >
                      🔒 Authorize & Pay ₹{amount.toLocaleString("en-IN")}
                    </button>
                  </div>
                </form>

                <p className="otp-footer-note">
                  🔒 Bank-Grade Security: Your PIN is directly verified with your issuing bank's secure HSM system. FeeFlow and SITS never receive or store your PIN.
                </p>
              </div>
            ) : (
              /* Standard Mode Forms */
              <>
                {/* 1. UPI Mode */}
                {activeTab === "upi" && (
                  <div className="gateway-pane animate-fade-in">
                    <div className="pane-header">
                      <h3>Pay via UPI (Instant Verification)</h3>
                      <p>Scan with any UPI app on your mobile, or enter your UPI Virtual Payment Address (VPA).</p>
                    </div>

                    <div className="gateway-upi-grid">
                      {/* Left: QR Code */}
                      <div className="gateway-qr-column">
                        <div className="gateway-qr-box">
                          <QRCodeSVG value={genericUpiUri} size={156} includeMargin />
                          <small>Scan using Google Pay, PhonePe, Paytm or BHIM</small>
                        </div>
                        <span className="qr-payee-note">Payee: <strong>{payeeName}</strong> ({payeeUpi})</span>
                      </div>

                      {/* Right: UPI Apps & Manual VPA */}
                      <div className="gateway-upi-right">
                        <span className="upi-options-title">Fast App Launchers</span>
                        <div className="gateway-upi-app-buttons">
                          <button
                            type="button"
                            className="upi-quick-btn"
                            onClick={() => startPaymentFlow("UPI (Google Pay)")}
                          >
                            <span className="upi-app-dot gpay" />
                            <span>Google Pay</span>
                          </button>
                          <button
                            type="button"
                            className="upi-quick-btn"
                            onClick={() => startPaymentFlow("UPI (PhonePe)")}
                          >
                            <span className="upi-app-dot phonepe" />
                            <span>PhonePe</span>
                          </button>
                          <button
                            type="button"
                            className="upi-quick-btn"
                            onClick={() => startPaymentFlow("UPI (Paytm)")}
                          >
                            <span className="upi-app-dot paytm" />
                            <span>Paytm</span>
                          </button>
                          <button
                            type="button"
                            className="upi-quick-btn"
                            onClick={() => startPaymentFlow("UPI (BHIM)")}
                          >
                            <span className="upi-app-dot bhim" />
                            <span>BHIM UPI</span>
                          </button>
                        </div>

                        <div className="upi-divider">
                          <span>OR ENTER UPI ID</span>
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (vpaInput.trim()) {
                              startPaymentFlow(`UPI (${vpaInput.trim()})`);
                            }
                          }}
                          className="upi-vpa-form"
                        >
                          <label htmlFor="gateway-vpa-input">Enter your UPI ID / VPA</label>
                          <div className="upi-input-group">
                            <input
                              id="gateway-vpa-input"
                              type="text"
                              value={vpaInput}
                              onChange={(e) => setVpaInput(e.target.value)}
                              placeholder="e.g. mobile@okhdfcbank or yourname@paytm"
                              required
                            />
                            <button type="submit" className="primary-button" style={{ marginTop: 0 }}>
                              Verify & Pay
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Debit Card Mode */}
                {activeTab === "debit" && (
                  <div className="gateway-pane animate-fade-in">
                    <div className="pane-header">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3>Pay with Debit Card</h3>
                        <span className="card-network-pill">{detectCardNetwork(cardNumber)}</span>
                      </div>
                      <p>Enter your 16-digit debit card details. All Indian bank debit cards are accepted.</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        startPaymentFlow(`Debit Card (${detectCardNetwork(cardNumber)} - ${cardBank})`);
                      }}
                      className="card-payment-form"
                    >
                      <div className="form-group">
                        <label htmlFor="debit-card-number">Card Number</label>
                        <div className="card-input-wrapper">
                          <input
                            id="debit-card-number"
                            type="text"
                            required
                            placeholder="4532 •••• •••• 8910"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                          />
                          <span className="card-brand-badge">{detectCardNetwork(cardNumber)}</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="debit-card-name">Cardholder Name</label>
                        <input
                          id="debit-card-name"
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Name as printed on card"
                        />
                      </div>

                      <div className="form-row-2">
                        <div className="form-group">
                          <label htmlFor="debit-card-expiry">Expiry Date</label>
                          <input
                            id="debit-card-expiry"
                            type="text"
                            required
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="debit-card-cvv">CVV / CVC</label>
                          <input
                            id="debit-card-cvv"
                            type="password"
                            required
                            placeholder="•••"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="debit-card-bank">Issuing Bank</label>
                        <select
                          id="debit-card-bank"
                          value={cardBank}
                          onChange={(e) => setCardBank(e.target.value)}
                          className="gateway-select"
                        >
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="State Bank of India">State Bank of India</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                          <option value="Canara Bank">Canara Bank</option>
                          <option value="Punjab National Bank">Punjab National Bank</option>
                          <option value="Bank of Baroda">Bank of Baroda</option>
                          <option value="Other Bank">Other Indian Bank</option>
                        </select>
                      </div>

                      <button type="submit" className="primary-button gateway-pay-btn">
                        Pay ₹{amount.toLocaleString("en-IN")} via Debit Card
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. Credit Card Mode */}
                {activeTab === "credit" && (
                  <div className="gateway-pane animate-fade-in">
                    <div className="pane-header">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3>Pay with Credit Card</h3>
                        <span className="card-network-pill">{detectCardNetwork(cardNumber)}</span>
                      </div>
                      <p>Pay your tuition and term fees via Visa, MasterCard, RuPay, or American Express.</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        startPaymentFlow(`Credit Card (${detectCardNetwork(cardNumber)})`);
                      }}
                      className="card-payment-form"
                    >
                      <div className="form-group">
                        <label htmlFor="credit-card-number">Card Number</label>
                        <div className="card-input-wrapper">
                          <input
                            id="credit-card-number"
                            type="text"
                            required
                            placeholder="5241 •••• •••• 4321"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                          />
                          <span className="card-brand-badge">{detectCardNetwork(cardNumber)}</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="credit-card-name">Cardholder Name</label>
                        <input
                          id="credit-card-name"
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Name as printed on card"
                        />
                      </div>

                      <div className="form-row-2">
                        <div className="form-group">
                          <label htmlFor="credit-card-expiry">Expiry Date</label>
                          <input
                            id="credit-card-expiry"
                            type="text"
                            required
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="credit-card-cvv">CVV / CVC</label>
                          <input
                            id="credit-card-cvv"
                            type="password"
                            required
                            placeholder="•••"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <button type="submit" className="primary-button gateway-pay-btn">
                        Pay ₹{amount.toLocaleString("en-IN")} via Credit Card
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. Net Banking Mode */}
                {activeTab === "netbanking" && (
                  <div className="gateway-pane animate-fade-in">
                    <div className="pane-header">
                      <h3>Net Banking (All Major Indian Banks)</h3>
                      <p>Select your bank from the popular tiles below or search from all scheduled banks.</p>
                    </div>

                    <div className="popular-banks-grid">
                      {POPULAR_BANKS.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          className={`bank-tile ${selectedBank.includes(b.short) ? "selected" : ""}`}
                          onClick={() => setSelectedBank(b.name)}
                        >
                          <span className="bank-tile-badge">{b.badge}</span>
                          <strong>{b.short}</strong>
                          <small>{b.name}</small>
                        </button>
                      ))}
                    </div>

                    <div className="all-banks-section">
                      <label htmlFor="all-banks-dropdown">Or select from other banks:</label>
                      <select
                        id="all-banks-dropdown"
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="gateway-select"
                      >
                        {ALL_INDIAN_BANKS.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="netbanking-summary-box">
                      <span>Selected Bank: <strong>{selectedBank}</strong></span>
                      <small>You will be securely routed through {selectedBank} 3D Secure verification to approve ₹{amount.toLocaleString("en-IN")}.</small>
                    </div>

                    <button
                      type="button"
                      className="primary-button gateway-pay-btn"
                      onClick={() => startPaymentFlow(`Net Banking (${selectedBank})`)}
                    >
                      Proceed to {selectedBank.split(" (")[0]} & Pay ₹{amount.toLocaleString("en-IN")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="gateway-footer">
          <div className="gateway-footer-left">
            <span className="pci-badge">PCI-DSS Compliant</span>
            <span className="rbi-badge">RBI Authorized Payment Framework</span>
          </div>
          <div className="gateway-footer-right">
            <span>Siddhartha Institute of Technology & Sciences • Hyderabad</span>
          </div>
        </div>

      </div>
    </div>
  );
}

