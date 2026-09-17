"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { currency } from "@/lib/utils";

type CalculatorItem = {
  id: string;
  label: string;
  amount: number;
  isBase?: boolean;
};

export default function FeeCalculatorPage() {
  const router = useRouter();

  // Facility Options matching Page 5
  const [items, setItems] = useState<CalculatorItem[]>([
    { id: "tuition", label: "Tuition Fee", amount: 60000, isBase: true },
    { id: "hostel", label: "Hostel Fee", amount: 30000 },
    { id: "transport", label: "Transport Fee", amount: 10000 },
    { id: "exam", label: "Examination Fee", amount: 5000 },
    { id: "library", label: "Library Fee", amount: 2000 },
    { id: "lab", label: "Laboratory Fee", amount: 3000 },
  ]);

  // Selected item IDs (default checked as in mockup)
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "tuition",
    "hostel",
    "transport",
    "exam",
    "library",
    "lab",
  ]);

  // Scholarship Selection
  const [scholarshipPercent, setScholarshipPercent] = useState<number>(25);

  function toggleItem(id: string) {
    if (id === "tuition") return; // Tuition is mandatory base
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
    <div className="smart-page-wrapper">
      <Navbar activePage="/fee-calculator" />

      <main className="smart-content-page">
        <div className="content-page-header">
          <div className="header-breadcrumbs">
            <Link href="/">Home</Link> <span>›</span> <strong>Fee Calculator</strong>
          </div>
          <h1>Fee Calculator</h1>
          <p className="page-desc">
            Calculate your total fee with optional facilities, hostel accommodation, and merit discounts.
          </p>
        </div>

        {/* 2-Column Calculator Grid matching Page 5 */}
        <div className="calculator-layout-grid animate-fade-up">
          {/* Left Card: Checkbox List & Scholarship Select */}
          <div className="calc-facilities-card">
            <div className="calc-card-header">
              <h3>Select Facilities & Optional Fees</h3>
              <span className="calc-header-badge">Step 1 of 2</span>
            </div>

            <div className="calc-items-list">
              {items.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`calc-item-row ${isChecked ? "selected" : ""}`}
                  >
                    <div className="calc-item-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={item.isBase}
                        onChange={() => toggleItem(item.id)}
                        className="custom-calc-checkbox"
                      />
                      <span className="calc-item-label">{item.label}</span>
                      {item.isBase && <span className="calc-base-tag">Mandatory</span>}
                    </div>
                    <span className="calc-item-amount monospace">
                      {currency(item.amount)}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Scholarship / Discount Dropdown */}
            <div className="scholarship-selector-box">
              <label>Scholarship / Discount Waiver</label>
              <div className="select-wrapper">
                <select
                  value={scholarshipPercent}
                  onChange={(e) => setScholarshipPercent(Number(e.target.value))}
                  className="scholarship-select"
                >
                  <option value={0}>None (0%) — Full Regular Tariff</option>
                  <option value={10}>10% — Academic Merit (GPA &gt; 8.5)</option>
                  <option value={25}>25% — Merit Scholarship (Entrance Rank &lt; 5000)</option>
                  <option value={35}>35% — Special Talent / Sports Excellence</option>
                  <option value={50}>50% — Institutional Concession / Merit Quota</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Card: Fee Summary matching Page 5 */}
          <div className="calc-summary-card">
            <div className="summary-card-inner">
              <h3>Fee Summary</h3>
              <p className="summary-caption">Real-time calculated fee quotation</p>

              <div className="summary-breakdown-table">
                <div className="summary-row">
                  <span className="summary-row-label">Subtotal</span>
                  <strong className="summary-row-val monospace">
                    {currency(subtotal)}
                  </strong>
                </div>

                {scholarshipPercent > 0 && (
                  <div className="summary-row discount-row">
                    <span className="summary-row-label">
                      Scholarship ({scholarshipPercent}%)
                    </span>
                    <strong className="summary-row-val discount-amount monospace">
                      - {currency(discountAmount)}
                    </strong>
                  </div>
                )}

                <div className="summary-divider" />

                <div className="summary-total-row">
                  <div>
                    <span className="total-label">Total Amount</span>
                    <small className="block text-muted">Payable for selected semester</small>
                  </div>
                  <span className="total-amount-highlight monospace">
                    {currency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Proceed to Pay Action Button */}
              <button
                type="button"
                onClick={handleProceedToPay}
                className="proceed-to-pay-btn"
              >
                <span>Proceed to Pay</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>

              {/* Info Pill */}
              <div className="calc-disclaimer-pill">
                <span className="pill-info-icon">ℹ️</span>
                <p>This is an estimated amount. Final amount may vary as per institute rules.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
