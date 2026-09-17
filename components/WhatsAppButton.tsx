"use client";

import { useState } from "react";

export default function WhatsAppButton() {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = "918712303032";
  const message = encodeURIComponent(
    "Hello SITS Accounts Helpdesk, I have an inquiry regarding my college fee payment."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <aside
      className="whatsapp-float-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="WhatsApp Support"
    >
      {/* Tooltip on hover */}
      <div
        className={`whatsapp-tooltip ${isHovered ? "visible" : ""}`}
        role="tooltip"
      >
        <span>Need Help? Chat on WhatsApp</span>
        <small className="whatsapp-number">+91 87123 03032</small>
      </div>

      {/* Circular Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-btn"
        aria-label="Chat on WhatsApp (+91 87123 03032)"
        title="Chat with SITS Support on WhatsApp (+91 87123 03032)"
      >
        {/* Pulsing ring animation */}
        <span className="whatsapp-ping-ring" aria-hidden="true" />

        {/* WhatsApp Official SVG Logo */}
        <svg
          className="whatsapp-icon"
          viewBox="0 0 32 32"
          width="34"
          height="34"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M16 2a13.9 13.9 0 0 0-12 20.9L2 30l7.3-1.9A13.9 13.9 0 1 0 16 2zm0 25.5a11.5 11.5 0 0 1-5.9-1.6l-.4-.2-4.4 1.1 1.2-4.3-.3-.4a11.6 11.6 0 1 1 9.4 5.4zm6.4-8.6c-.3-.2-2-.1-2.3-.2-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1a8.9 8.9 0 0 1-2.6-1.6 9.8 9.8 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.1c.8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6s.3-1.5.2-1.6c-.1-.2-.3-.3-.6-.5z" />
        </svg>
      </a>
    </aside>
  );
}
