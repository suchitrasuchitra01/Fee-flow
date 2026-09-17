"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({ activePage }: { activePage?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"student" | "admin" | null>(null);
  const [userInitial, setUserInitial] = useState<string>("R");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.role) {
            setUserRole(profile.role);
            setUserInitial(user.email ? user.email.charAt(0).toUpperCase() : "U");
          }
        }
      } catch {
        // Fallback for non-auth public pages
      }
    }
    checkAuth();
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Fee Structure", href: "/fee-structure" },
    { label: "Fee Calculator", href: "/fee-calculator" },
    { label: "Courses", href: "/fee-structure?tab=courses" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "/#contact" },
  ];

  const current = activePage || pathname;

  return (
    <header className="smart-navbar">
      <div className="navbar-container">
        {/* Brand Logo with Graduation Cap */}
        <Link href="/" className="smart-brand-link">
          <div className="smart-brand-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 3.73l6.5 3.55L12 13.82 5.5 10.28 12 6.73zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <span className="smart-brand-text">
            Smart<strong>Fee</strong>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="smart-nav-links">
          {navLinks.map((link) => {
            const isActive = current === link.href || (link.href !== "/" && current.startsWith(link.href));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`smart-nav-item ${isActive ? "active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Button / Profile */}
        <div className="smart-nav-actions">
          <Link
            href={userRole === "admin" ? "/admin" : (userRole === "student" ? "/student" : "/student")}
            className="user-avatar-btn"
            title={userRole === "admin" ? "Admin Portal" : "Student Portal"}
          >
            <span className="avatar-circle">{userInitial || "R"}</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mobile-drawer-footer">
            <Link
              href={userRole ? (userRole === "admin" ? "/admin" : "/student") : "/login"}
              className="mobile-login-btn"
              onClick={() => setMobileMenuOpen(false)}
            >
              {userRole ? (userRole === "admin" ? "Admin Portal" : "Student Portal") : "Login to Portal"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

