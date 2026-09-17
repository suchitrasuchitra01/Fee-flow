import Link from "next/link";

export default function Footer() {
  return (
    <footer className="smart-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <div className="smart-brand-link">
              <div className="smart-brand-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 3.73l6.5 3.55L12 13.82 5.5 10.28 12 6.73zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </div>
              <span className="smart-brand-text">
                Smart<strong>Fee</strong>
              </span>
            </div>
            <p className="footer-tagline">
              Simplifying educational finance with automated workflows, real-time fee tracking, and instantaneous receipts.
            </p>
            <p className="footer-accreditation">
              Affiliated with Siddhartha Institute of Technology & Sciences (SITS) • Hyderabad
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/fee-structure">Fee Structure</Link></li>
              <li><Link href="/fee-calculator">Fee Calculator</Link></li>
              <li><Link href="/payment">Pay Fees</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Portals</h4>
            <ul>
              <li><Link href="/login">Student Portal</Link></li>
              <li><Link href="/login">Admin Login</Link></li>
              <li><Link href="/reports">Financial Reports</Link></li>
              <li><Link href="/receipt">Official Receipts</Link></li>
            </ul>
          </div>

          <div className="footer-col" id="contact">
            <h4>Accounts Helpdesk</h4>
            <p className="contact-item">🏛️ Admin Block, Room 104</p>
            <p className="contact-item">📞 +91 98765 43210</p>
            <p className="contact-item">✉️ accounts@siddhartha.org.in</p>
            <p className="contact-item">⏰ Mon – Sat: 9:00 AM – 4:30 PM</p>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} SmartFee by Siddhartha Institute of Technology & Sciences. All rights reserved.</p>
          <div className="footer-legal-links">
            <span>256-Bit SSL Encrypted</span>
            <span>•</span>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

