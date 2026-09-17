"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  const router = useRouter();

  // Quick Fee Structure Selector State
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [course, setCourse] = useState("B.Tech");
  const [department, setDepartment] = useState("Computer Science");
  const [yearSem, setYearSem] = useState("2nd Year");

  function handleCheckFees(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      `/fee-structure?year=${encodeURIComponent(academicYear)}&course=${encodeURIComponent(
        course
      )}&dept=${encodeURIComponent(department)}&sem=${encodeURIComponent(yearSem)}`
    );
  }

  return (
    <div className="smart-page-wrapper">
      <Navbar activePage="/" />

      <main className="home-hero-section">
        <div className="home-hero-container">
          {/* Left Column: Hero Content & Fee Quick Search */}
          <div className="home-hero-left animate-fade-up">
            <h1 className="hero-main-title">
              Simplifying<br />
              <span className="hero-highlight">Education Payments</span>
            </h1>
            <p className="hero-subtitle">Transparent • Secure • Hassle-Free</p>

            {/* Check Your Fee Structure Card */}
            <div className="check-fees-card">
              <div className="check-fees-header">
                <div className="check-fees-icon">📋</div>
                <h3>Check Your Fee Structure</h3>
              </div>

              <form onSubmit={handleCheckFees} className="check-fees-form">
                <div className="check-fees-grid">
                  <div className="form-field-group">
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

                  <div className="form-field-group">
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

                  <div className="form-field-group">
                    <label>Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Artificial Intelligence">AI & Machine Learning</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Electronics">Electronics & Comm. (ECE)</option>
                      <option value="Electrical">Electrical & Electronics (EEE)</option>
                      <option value="Mechanical">Mechanical Engineering</option>
                      <option value="Civil">Civil Engineering</option>
                    </select>
                  </div>

                  <div className="form-field-group">
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
                </div>

                <button type="submit" className="view-fees-submit-btn">
                  <span>View Fees</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </button>
              </form>
            </div>

            {/* Feature Pills Row */}
            <div className="hero-feature-pills">
              <div className="h-feature-pill">
                <span className="pill-icon">📋</span>
                <span>Transparent Fee Structure</span>
              </div>
              <div className="h-feature-pill">
                <span className="pill-icon">🔒</span>
                <span>Secure Online Payments</span>
              </div>
              <div className="h-feature-pill">
                <span className="pill-icon">⚡</span>
                <span>Instant Receipts</span>
              </div>
              <div className="h-feature-pill">
                <span className="pill-icon">📱</span>
                <span>Easy Access Anytime</span>
              </div>
            </div>

            <p className="hero-cursive-slogan">
              Invest in A Brighter Tomorrow
            </p>
          </div>

          {/* Right Column: Campus Showcase Imagery */}
          <div className="home-hero-right animate-fade-in stagger-2">
            <div className="campus-image-frame">
              <img
                src="/campus-bg-4k.jpg"
                alt="Siddhartha Institute of Technology & Sciences Campus"
                className="campus-hero-img"
              />
              <div className="campus-frame-overlay">
                <div className="campus-tag-badge">
                  <span className="live-dot" />
                  <span>SITS Campus Hyderabad</span>
                </div>
                <div className="campus-quick-cta">
                  <strong>Accredited Institutional Portal</strong>
                  <span>256-Bit SSL Encrypted Payment Gateways</span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="hero-quick-tiles">
              <Link href="/fee-calculator" className="quick-tile-card">
                <span className="q-icon">🧮</span>
                <div>
                  <strong>Fee Calculator</strong>
                  <p>Estimate fees with optional hostel & scholarships</p>
                </div>
                <span className="q-arrow">→</span>
              </Link>
              <Link href="/login" className="quick-tile-card highlight">
                <span className="q-icon">🎓</span>
                <div>
                  <strong>Student Portal</strong>
                  <p>Login to pay dues, view history & download receipts</p>
                </div>
                <span className="q-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* About Institution Section */}
      <section className="home-about-section" id="about">
        <div className="home-about-container">
          <div className="section-title-wrap">
            <span className="section-eyebrow">ABOUT SMARTFEE</span>
            <h2>Empowering Institutional Transparency</h2>
            <p>SmartFee is the unified educational finance ecosystem for Siddhartha Institute of Technology & Sciences, simplifying payment collection, scholarship tracking, and accounting records for over 1,200+ students and administrators.</p>
          </div>

          <div className="stats-metric-strip">
            <div className="stat-strip-item">
              <span className="strip-val">1,250+</span>
              <span className="strip-lbl">Active Students</span>
            </div>
            <div className="stat-strip-item">
              <span className="strip-val">99.8%</span>
              <span className="strip-lbl">Transaction Success Rate</span>
            </div>
            <div className="stat-strip-item">
              <span className="strip-val">Instant</span>
              <span className="strip-lbl">E-Receipt Generation</span>
            </div>
            <div className="stat-strip-item">
              <span className="strip-val">100%</span>
              <span className="strip-lbl">Secure Verification</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
