"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type CalculatorItem = {
  id: string;
  label: string;
  amount: number;
};

export default function FeeCalculatorPage() {
  const router = useRouter();

  // Facility Options matching Page 5 in media_1789625536061.png
  const [items] = useState<CalculatorItem[]>([
    { id: "tuition", label: "Tuition Fee", amount: 60000 },
    { id: "hostel", label: "Hostel Fee", amount: 30000 },
    { id: "transport", label: "Transport Fee", amount: 10000 },
    { id: "exam", label: "Examination Fee", amount: 5000 },
    { id: "library", label: "Library Fee", amount: 2000 },
    { id: "lab", label: "Laboratory Fee", amount: 3000 },
  ]);

  // Selected item IDs (all 6 checked by default as in reference design)
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "tuition",
    "hostel",
    "transport",
    "exam",
    "library",
    "lab",
  ]);

  // Scholarship Selection (defaults to 25% Merit Scholarship as in reference design)
  const [scholarshipPercent, setScholarshipPercent] = useState<number>(25);

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Calculations
  const subtotal = items
    .filter((item) => selectedIds.includes(item.id))
    .reduce((acc, item) => acc + item.amount, 0);

  const discountAmount = Math.round((subtotal * scholarshipPercent) / 100);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  function handleProceedToPay() {
    router.push(`/payment?amount=${totalAmount}&source=calculator`);
  }

  return (
    <div className="fee-calc-page-wrapper">
      <Navbar activePage="/fee-calculator" />

      <main className="fee-calc-main-container">
        {/* Page Header matching reference */}
        <div className="fee-calc-header animate-fade-down">
          <h1 className="fee-calc-title">Fee Calculator</h1>
          <p className="fee-calc-subtitle">
            Calculate your total fee with optional facilities and discounts
          </p>
        </div>

        {/* 2-Column Calculator Cards Grid */}
        <div className="fee-calc-cards-grid animate-fade-up">
          {/* Left Card: Checklist & Scholarship Dropdown */}
          <div className="fee-calc-card fee-calc-left-card">
            <div className="fee-calc-checklist">
              {items.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="fee-calc-row"
                    onClick={() => toggleItem(item.id)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleItem(item.id);
                      }
                    }}
                  >
                    <div className="fee-calc-item-left">
                      <div className={`fee-calc-checkbox ${isChecked ? "checked" : ""}`}>
                        {isChecked && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="fee-calc-item-label">{item.label}</span>
                    </div>
                    <span className="fee-calc-item-amount">
                      {item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scholarship / Discount Dropdown */}
            <div className="fee-calc-scholarship-section">
              <label htmlFor="scholarship-select" className="fee-calc-scholarship-label">
                Scholarship / Discount
              </label>
              <div className="fee-calc-select-wrap">
                <select
                  id="scholarship-select"
                  value={scholarshipPercent}
                  onChange={(e) => setScholarshipPercent(Number(e.target.value))}
                  className="fee-calc-select"
                >
                  <option value={0}>0% - No Scholarship</option>
                  <option value={10}>10% - Academic Merit</option>
                  <option value={25}>25% - Merit Scholarship</option>
                  <option value={35}>35% - Sports Excellence</option>
                  <option value={50}>50% - Institutional Concession</option>
                </select>
                <div className="fee-calc-select-chevron">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Fee Summary */}
          <div className="fee-calc-card fee-calc-right-card">
            <h2 className="fee-calc-summary-title">Fee Summary</h2>

            <div className="fee-calc-summary-rows">
              {/* Subtotal */}
              <div className="fee-calc-summary-row">
                <span className="fee-calc-row-name">Subtotal</span>
                <span className="fee-calc-row-num">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Scholarship */}
              {scholarshipPercent > 0 && (
                <div className="fee-calc-summary-row discount-green">
                  <span className="fee-calc-row-name">
                    Scholarship ({scholarshipPercent}%)
                  </span>
                  <span className="fee-calc-row-num">
                    - ₹{discountAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Highlighted Total Amount Box */}
            <div className="fee-calc-total-box">
              <span className="fee-calc-total-label">Total Amount</span>
              <span className="fee-calc-total-val">
                ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Proceed to Pay Button */}
            <button
              type="button"
              onClick={handleProceedToPay}
              className="fee-calc-pay-btn"
            >
              <span>Proceed to Pay</span>
              <span className="fee-calc-pay-arrow" aria-hidden="true">→</span>
            </button>

            {/* Estimated Notice Pill */}
            <div className="fee-calc-notice-box">
              <div className="fee-calc-notice-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" />
                  <line x1="12" y1="16" x2="12" y2="11" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="7.5" r="1.1" fill="#2563eb" />
                </svg>
              </div>
              <p className="fee-calc-notice-text">
                This is an estimated amount. Final amount may vary as per institute rules.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
