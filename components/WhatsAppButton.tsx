"use client";

import { useState } from "react";

export default function WhatsAppButton() {
  const [isExpanded, setIsExpanded] = useState(true);
  const phoneNumber = "918712303032";
  const displayPhone = "+91 8712303032";
  const message = encodeURIComponent(
    "Hello SITS Accounts Helpdesk, I have an inquiry regarding my college fee payment."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <aside className="whatsapp-float-container" aria-label="WhatsApp Support">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-pill"
        title={`Chat on WhatsApp (${displayPhone})`}
        aria-label={`Chat on WhatsApp with SITS Accounts Support at ${displayPhone}`}
      >
        {/* Circle with WhatsApp Logo */}
        <div className="wa-circle-icon-badge" aria-hidden="true">
          <span className="wa-ping-animation" />
          <svg
            className="wa-icon-svg"
            viewBox="0 0 32 32"
            width="28"
            height="28"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M16 2a13.9 13.9 0 0 0-12 20.9L2 30l7.3-1.9A13.9 13.9 0 1 0 16 2zm0 25.5a11.5 11.5 0 0 1-5.9-1.6l-.4-.2-4.4 1.1 1.2-4.3-.3-.4a11.6 11.6 0 1 1 9.4 5.4zm6.4-8.6c-.3-.2-2-.1-2.3-.2-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1a8.9 8.9 0 0 1-2.6-1.6 9.8 9.8 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.1c.8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6s.3-1.5.2-1.6c-.1-.2-.3-.3-.6-.5z" />
          </svg>
        </div>

        {/* Text Container displaying WhatsApp Number */}
        <div className="wa-pill-text-block">
          <div className="wa-status-row">
            <span className="wa-online-dot" />
            <span className="wa-tag-label">WhatsApp Helpdesk</span>
          </div>
          <strong className="wa-phone-number">{displayPhone}</strong>
        </div>
      </a>
    </aside>
  );
}
