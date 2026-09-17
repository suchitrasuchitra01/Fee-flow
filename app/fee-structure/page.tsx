"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { currency } from "@/lib/utils";

type FeeItem = {
  type: string;
  amount: number;
  category: "academic" | "facility" | "annual";
};

export default function FeeStructurePage() {
  const searchParams = useSearchParams();

  const [academicYear, setAcademicYear] = useState(searchParams.get("year") || "2024-25");
  const [course, setCourse] = useState(searchParams.get("course") || "B.Tech");
  const [department, setDepartment] = useState(searchParams.get("dept") || "Computer Science");
  const [yearSem, setYearSem] = useState(searchParams.get("sem") || "2nd Year");

  // Dynamic fee schedule based on course and year selection
  const isHigherDegree = course === "M.Tech" || course === "MBA";
  const baseTuition = isHigherDegree ? 75000 : course === "B.Pharmacy" ? 65000 : 60000;

  const feeItems: FeeItem[] = [
    { type: "Tuition Fee", amount: baseTuition, category: "academic" },
    { type: "Examination Fee", amount: 5000, category: "academic" },
    { type: "Library Fee", amount: 2000, category: "facility" },
    { type: "Laboratory Fee", amount: 3000, category: "facility" },
    { type: "Sports Fee", amount: 1000, category: "facility" },
    { type: "Development Fee", amount: 2000, category: "annual" },
    { type: "Transport Fee", amount: 10000, category: "facility" },
  ];

  const totalFee = feeItems.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="smart-page-wrapper">
      <Navbar activePage="/fee-structure" />

      <main className="smart-content-page">
        <div className="content-page-header">
          <div className="header-breadcrumbs">
            <Link href="/">Home</Link> <span>›</span> <strong>Fee Structure</strong>
          </div>
          <h1>Fee Structure</h1>
          <p className="page-desc">
            Select the details below to view the official approved institutional fee structure.
          </p>
        </div>

        {/* Top Filter Bar matching Page 4 */}
        <div className="fee-filter-bar-card animate-fade-up">
          <div className="fee-filter-grid">
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
              <label>Course</label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
                <option value="MBA">MBA</option>
                <option value="B.Pharmacy">B.Pharmacy</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Computer Science">Computer Science & Engg</option>
                <option value="Artificial Intelligence">AI & Machine Learning</option>
                <option value="Data Science">Data Science</option>
                <option value="Electronics">Electronics & Comm. (ECE)</option>
                <option value="Electrical">Electrical & Electronics (EEE)</option>
                <option value="Mechanical">Mechanical Engineering</option>
                <option value="Civil">Civil Engineering</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Year / Semester</label>
              <select
                value={yearSem}
                onChange={(e) => setYearSem(e.target.value)}
              >
                <option value="1st Year">1st Year (Sem I & II)</option>
                <option value="2nd Year">2nd Year (Sem III & IV)</option>
                <option value="3rd Year">3rd Year (Sem V & VI)</option>
                <option value="4th Year">4th Year (Sem VII & VIII)</option>
              </select>
            </div>

            <div className="filter-submit-col">
              <button type="button" className="filter-apply-btn">
                <span>View Fees</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid: Table on Left + Quote Card on Right */}
        <div className="fee-structure-grid animate-fade-up stagger-1">
          {/* Left Column: Fee Schedule Table */}
          <div className="fee-table-card">
            <div className="table-card-header">
              <div>
                <h3>{course} — {department}</h3>
                <span className="table-subtitle">
                  Academic Year: <b>{academicYear}</b> • <b>{yearSem}</b>
                </span>
              </div>
              <span className="status-pill settled">Approved SITS Tariff</span>
            </div>

            <div className="fee-schedule-table-wrap">
              <table className="fee-schedule-table">
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th className="text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {feeItems.map((item, idx) => (
                    <tr key={idx} className={`fee-row ${item.category}`}>
                      <td>
                        <span className="fee-type-text">{item.type}</span>
                        {item.type === "Tuition Fee" && (
                          <span className="fee-tag">Core Academic</span>
                        )}
                        {item.type === "Transport Fee" && (
                          <span className="fee-tag optional">Optional facility</span>
                        )}
                      </td>
                      <td className="text-right monospace fee-amount-cell">
                        {currency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="fee-total-row">
                    <td>
                      <strong>Total Fee</strong>
                      <small className="block text-muted">Includes all mandatory and campus facility dues</small>
                    </td>
                    <td className="text-right monospace total-amount-cell">
                      <strong>{currency(totalFee)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="table-card-footer">
              <Link href="/fee-calculator" className="outline-action-btn">
                <span>🧮 Custom Calculator with Hostel & Concessions →</span>
              </Link>
              <Link href="/payment" className="primary-action-btn">
                <span>💳 Pay Fee Online →</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Motivational Quote & Quality Education Card */}
          <div className="quote-sidebar-card">
            <div className="quote-cap-icon">
              <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
                <path d="M32 8L4 24L32 40L60 24L32 8Z" fill="#2563eb" />
                <path d="M12 28.5V44C12 50.6 32 56 32 56C32 56 52 50.6 52 44V28.5L32 40L12 28.5Z" fill="#1d4ed8" />
                <path d="M60 25V42" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="45" r="3" fill="#f59e0b" />
              </svg>
            </div>

            <h2>Quality Education<br />Affordable Future</h2>

            <blockquote className="mandela-quote">
              “Education is the most powerful weapon which you can use to change the world.”
              <footer>— Nelson Mandela</footer>
            </blockquote>

            <div className="quote-feature-list">
              <div className="q-feature-item">
                <span className="q-check">✓</span>
                <span>UGC Recognized & NBA Accredited Engineering Programs</span>
              </div>
              <div className="q-feature-item">
                <span className="q-check">✓</span>
                <span>Merit Scholarships for Top Performers (Up to 50%)</span>
              </div>
              <div className="q-feature-item">
                <span className="q-check">✓</span>
                <span>Zero Hidden Registration or Administrative Charges</span>
              </div>
              <div className="q-feature-item">
                <span className="q-check">✓</span>
                <span>Instant Digital Receipts with Legal Tax Exemption Validity</span>
              </div>
            </div>

            <div className="quote-card-cta">
              <p>Need personalized fee assistance?</p>
              <Link href="/#contact" className="contact-link">
                Speak to SITS Fee Advisory Office →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
