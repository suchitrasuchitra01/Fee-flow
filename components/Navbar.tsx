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
          {/* WhatsApp Support Pill in Right Corner */}
          <a
            href="https://wa.me/918712303032?text=Hello%20SITS%20Accounts%20Helpdesk,%20I%20have%20an%20inquiry%20regarding%20college%20fees."
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-whatsapp-pill"
            title="Chat on WhatsApp (+91 8712303032)"
            aria-label="WhatsApp Support (+91 8712303032)"
          >
            <span className="navbar-wa-circle-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
                <path d="M16 2a13.9 13.9 0 0 0-12 20.9L2 30l7.3-1.9A13.9 13.9 0 1 0 16 2zm0 25.5a11.5 11.5 0 0 1-5.9-1.6l-.4-.2-4.4 1.1 1.2-4.3-.3-.4a11.6 11.6 0 1 1 9.4 5.4zm6.4-8.6c-.3-.2-2-.1-2.3-.2-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1a8.9 8.9 0 0 1-2.6-1.6 9.8 9.8 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.1c.8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6s.3-1.5.2-1.6c-.1-.2-.3-.3-.6-.5z" />
              </svg>
            </span>
            <span className="navbar-wa-text">+91 8712303032</span>
          </a>

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

