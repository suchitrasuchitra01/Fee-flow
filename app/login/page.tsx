"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<"student" | "admin">("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");
    const supabase = createClient();

    let emailToAuth = identifier.trim();

    // If identifier doesn't have an @, look up the email by student_id in students table
    if (!emailToAuth.includes("@")) {
      const { data: studentRecord } = await supabase
        .from("students")
        .select("email")
        .eq("student_id", emailToAuth)
        .maybeSingle();

      if (studentRecord?.email) {
        emailToAuth = studentRecord.email;
      } else {
        // Fallback default format if matching standard institution domain
        emailToAuth = `${emailToAuth.toLowerCase()}@siddhartha.org.in`;
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (signInError) {
      setError(signInError.message || "Invalid credentials. Please verify your ID and password.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();

    const userRole = profile?.role || roleTab;
    router.replace(userRole === "admin" ? "/admin" : "/student");
    router.refresh();
  }

  function handleForgotPassword() {
    setInfoMessage("Password reset request submitted. Please check with the SITS Accounts Office or check your registered email.");
  }

  return (
    <div className="smart-page-wrapper">
      <Navbar activePage="/login" />

      <main className="smart-login-page">
        <div className="smart-login-container">
          {/* Left Decorative Illustration Column */}
          <div className="login-visual-col animate-fade-up">
            <div className="book-cap-illustration-card">
              <div className="mortarboard-graphic">
                <svg viewBox="0 0 100 80" width="120" height="96" fill="currentColor">
                  <path d="M50 10 L5 35 L50 60 L90 37.8 V65 H95 V35 Z" fill="#2563eb" />
                  <path d="M25 46.5 V65 C25 72 75 72 75 65 V46.5 L50 60 Z" fill="#1d4ed8" />
                  <circle cx="50" cy="35" r="3" fill="#ffffff" />
                  <path d="M90 38 C90 50 85 58 85 62" stroke="#f59e0b" strokeWidth="3" fill="none" />
                  <circle cx="85" cy="64" r="3" fill="#f59e0b" />
                </svg>
              </div>
              <div className="stack-of-books-graphic">
                <div className="book-spine book-3">Mathematics & Engineering</div>
                <div className="book-spine book-2">Computer Science & Algorithms</div>
                <div className="book-spine book-1">SITS Academic Handbook</div>
              </div>
            </div>

            <div className="login-quote-box">
              <span className="quote-badge">Knowledge • Growth • Success</span>
              <p className="cursive-tagline">
                Education Today<br />
                <em>A Brighter Tomorrow</em>
              </p>
            </div>
          </div>

          {/* Center/Right Form: The SmartFee Login Card */}
          <div className="login-card-col animate-fade-up stagger-1">
            <div className="smartfee-login-card">
              {/* Brand Header */}
              <div className="card-brand-header">
                <div className="brand-badge-row">
                  <div className="smart-brand-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 3.73l6.5 3.55L12 13.82 5.5 10.28 12 6.73zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                    </svg>
                  </div>
                  <span className="smart-brand-text">
                    Smart<strong>Fee</strong>
                  </span>
                </div>
                <h2>Welcome Back</h2>
                <p className="card-subtitle">Login to access your account</p>
              </div>

              {/* Segmented Role Switcher: Student vs Admin */}
              <div className="role-switch-container">
                <button
                  type="button"
                  className={`role-switch-btn ${roleTab === "student" ? "active" : ""}`}
                  onClick={() => {
                    setRoleTab("student");
                    setError("");
                  }}
                >
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  className={`role-switch-btn ${roleTab === "admin" ? "active" : ""}`}
                  onClick={() => {
                    setRoleTab("admin");
                    setError("");
                  }}
                >
                  <span>Admin</span>
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="smart-auth-form">
                <div className="auth-field">
                  <label>
                    <span className="field-icon">{roleTab === "student" ? "👤" : "🏛️"}</span>
                    <span>{roleTab === "student" ? "Student ID or Email" : "Admin Email"}</span>
                  </label>
                  <input
                    required
                    type={roleTab === "student" ? "text" : "email"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      roleTab === "student"
                        ? "Enter your student ID (e.g. 2300030101)"
                        : "admin@siddhartha.org.in"
                    }
                    className="auth-text-input"
                  />
                </div>

                <div className="auth-field">
                  <div className="field-label-row">
                    <label>
                      <span className="field-icon">🔒</span>
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      className="forgot-pass-link"
                      onClick={handleForgotPassword}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="password-input-wrap">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="auth-text-input"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                {error && <div className="auth-alert error">⚠️ {error}</div>}
                {infoMessage && <div className="auth-alert info">ℹ️ {infoMessage}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="smart-login-submit-btn"
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>

                <div className="login-card-footer">
                  <p>
                    Don't have an account?{" "}
                    <Link href="/#contact" className="contact-inst-link">
                      Contact your institution
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
