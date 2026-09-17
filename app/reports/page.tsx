"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { currency } from "@/lib/utils";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("Monthly Report");
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [selectedMonth, setSelectedMonth] = useState("August");

  // Report Data matching Page 8 mockup
  const totalFees = 2500000;
  const collected = 1900000;
  const pending = 600000;
  const collectedPercent = Math.round((collected / totalFees) * 100);
  const pendingPercent = 100 - collectedPercent;
  const transactionsCount = 342;
  const studentsCount = 1250;

  function handleDownloadPdf() {
    window.print();
  }

  // SVG Donut calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * collectedPercent) / 100;

  return (
    <div className="smart-page-wrapper">
      <Navbar activePage="/reports" />

      <main className="smart-content-page printable-report-page">
        <div className="content-page-header no-print">
          <div className="header-breadcrumbs">
            <Link href="/">Home</Link> <span>›</span> <strong>Reports</strong>
          </div>
          <h1>Reports</h1>
          <p className="page-desc">Generate and view detailed fee collection and financial reports.</p>
        </div>

        {/* Top Filter Bar matching Page 8 */}
        <div className="fee-filter-bar-card animate-fade-up no-print">
          <div className="fee-filter-grid">
            <div className="filter-group">
              <label>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="Monthly Report">Monthly Report</option>
                <option value="Annual Report">Annual Report</option>
                <option value="Defaulter Report">Defaulter & Outstanding Report</option>
                <option value="Department Breakdown">Department Breakdown</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="2024-25">2024–25</option>
                <option value="2025-26">2025–26</option>
                <option value="2026-27">2026–27</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>

            <div className="filter-submit-col">
              <button type="button" className="filter-apply-btn">
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Report Title for Print / PDF */}
        <div className="print-report-header only-print">
          <h2>Siddhartha Institute of Technology & Sciences</h2>
          <p>Fee Collection Report • {selectedMonth} {academicYear}</p>
        </div>

        {/* Lower Grid matching Page 8: Donut on Left + Summary on Right */}
        <div className="reports-layout-grid animate-fade-up stagger-1">
          {/* Left Card: Fee Collection Donut Report */}
          <div className="report-donut-card">
            <div className="donut-card-header">
              <h3>Fee Collection Report – {selectedMonth} 2024</h3>
              <span className="live-status-pill">● Certified Data</span>
            </div>

            <div className="donut-visual-container">
              <div className="donut-chart-wrapper">
                <svg width="200" height="200" viewBox="0 0 200 200" className="donut-svg">
                  {/* Background Track (Pending - Red/Orange) */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="#f87171"
                    strokeWidth="24"
                  />
                  {/* Foreground Collected Segment (Green) */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="24"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                </svg>

                {/* Donut Center Label */}
                <div className="donut-center-label">
                  <span className="donut-center-amount monospace">
                    {currency(totalFees)}
                  </span>
                  <span className="donut-center-caption">Total Fees</span>
                </div>
              </div>

              {/* Legend Row */}
              <div className="donut-legend-row">
                <div className="legend-col">
                  <div className="legend-item">
                    <span className="legend-dot green-dot" />
                    <span className="legend-name">Collected</span>
                  </div>
                  <strong className="legend-val monospace">
                    {currency(collected)} <small>({collectedPercent}%)</small>
                  </strong>
                </div>

                <div className="legend-col">
                  <div className="legend-item">
                    <span className="legend-dot red-dot" />
                    <span className="legend-name">Pending</span>
                  </div>
                  <strong className="legend-val monospace">
                    {currency(pending)} <small>({pendingPercent}%)</small>
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Summary Metrics & Download PDF button */}
          <div className="report-summary-card">
            <div className="report-card-inner">
              <h3>Summary</h3>
              <p className="summary-caption">Comprehensive reconciliation for audit records</p>

              <div className="report-stats-table">
                <div className="r-stat-row">
                  <span className="r-stat-label">Total Fees</span>
                  <strong className="r-stat-val monospace">{currency(totalFees)}</strong>
                </div>
                <div className="r-stat-row">
                  <span className="r-stat-label">Collected</span>
                  <strong className="r-stat-val text-success monospace">{currency(collected)}</strong>
                </div>
                <div className="r-stat-row">
                  <span className="r-stat-label">Pending</span>
                  <strong className="r-stat-val text-danger monospace">{currency(pending)}</strong>
                </div>
                <div className="r-stat-row">
                  <span className="r-stat-label">Transactions</span>
                  <strong className="r-stat-val monospace">{transactionsCount}</strong>
                </div>
                <div className="r-stat-row">
                  <span className="r-stat-label">Students</span>
                  <strong className="r-stat-val monospace">{studentsCount.toLocaleString()}</strong>
                </div>
              </div>

              {/* Download Report PDF Button */}
              <button
                type="button"
                className="download-report-btn no-print"
                onClick={handleDownloadPdf}
              >
                <span className="down-icon">⬇️</span>
                <span>Download Report (PDF)</span>
              </button>

              <div className="audit-note">
                <small>Generated from Supabase Ledger • Official SITS Registrar seal</small>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

