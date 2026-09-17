"use client";

import React, { useState } from "react";

export function WhatsAppIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16.02 2C8.28 2 2 8.28 2 16.02c0 2.62.72 5.16 2.08 7.37L2.1 30l6.81-1.93a13.98 13.98 0 0 0 7.11 1.95h.01c7.74 0 14.02-6.28 14.02-14.02 0-3.75-1.46-7.27-4.11-9.92A13.92 13.92 0 0 0 16.02 2zm8.17 19.99c-.34.96-1.7 1.83-2.77 2.06-.74.16-1.7.28-4.94-1.06-4.15-1.72-6.83-5.94-7.04-6.21-.21-.28-1.7-2.27-1.7-4.32 0-2.05 1.08-3.06 1.46-3.48.38-.42.83-.53 1.11-.53.28 0 .56 0 .8.02.26.01.61-.1.95.73.35.84 1.19 2.9 1.29 3.12.11.21.18.46.03.73-.14.28-.21.46-.42.71-.21.25-.44.55-.63.74-.21.21-.43.44-.19.85.24.42 1.07 1.76 2.3 2.85 1.58 1.41 2.91 1.85 3.33 2.06.42.21.66.18.91-.11.25-.28 1.08-1.25 1.36-1.68.28-.42.56-.35.95-.21.38.14 2.44 1.15 2.86 1.36.42.21.7.31.8.49.1.17.1 1.02-.24 1.98z" />
    </svg>
  );
}

export default function WhatsAppWidget() {
  const [hovered, setHovered] = useState(false);
  const defaultMessage = encodeURIComponent(
    "Hello SITS Accounts Helpdesk, I need help regarding my fee payment on FeeFlow."
  );
  const whatsappUrl = `https://wa.me/918712303032?text=${defaultMessage}`;

  return (
    <div
      className="floating-whatsapp-container"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Expanded Tooltip / Badge on Hover */}
      <div className={`whatsapp-tooltip ${hovered ? "visible" : ""}`}>
        <div className="wa-tooltip-header">
          <span className="wa-status-dot" />
          <span className="wa-status-text">Accounts Branch Helpdesk</span>
        </div>
        <div className="wa-tooltip-body">
          <p className="wa-tooltip-msg">Have questions regarding your fee payment?</p>
        </div>
        <span className="wa-tooltip-cta">Click to chat on WhatsApp →</span>
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp-btn"
        aria-label="Chat on WhatsApp with SITS Fee Support"
        title="Chat on WhatsApp"
      >
        <span className="whatsapp-pulse-ring" />
        <span className="whatsapp-icon-circle">
          <WhatsAppIcon size={28} />
        </span>
        <span className="whatsapp-btn-text">
          <span>WhatsApp</span>
          <small>Instant Chat</small>
        </span>
      </a>
    </div>
  );
}
