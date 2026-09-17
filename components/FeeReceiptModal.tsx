"use client";

import { useState } from "react";
import Image from "next/image";
import sitsLogo from "@/SITS-logo-2.webp";
import { FeeReceipt } from "@/lib/types";
import { currency, numberToWordsIndian } from "@/lib/utils";

type FeeReceiptModalProps = {
  receipts: FeeReceipt[];
  selectedReceiptId?: string;
  onClose: () => void;
};

export default function FeeReceiptModal({
  receipts,
  selectedReceiptId,
  onClose,
}: FeeReceiptModalProps) {
  const [activeId, setActiveId] = useState<string>(
    selectedReceiptId || (receipts.length > 0 ? receipts[0].id : "")
  );
  const [copied, setCopied] = useState(false);

  if (!receipts || receipts.length === 0) return null;

  const currentReceipt = receipts.find((r) => r.id === activeId) || receipts[0];

  function handlePrint() {
    window.print();
  }

  function handleCopy() {
    const text = `--- SITS FEE PAYMENT RECEIPT ---
Receipt No: ${currentReceipt.id}
Student: ${currentReceipt.student_name} (${currentReceipt.student_id})
Amount Paid: ${currency(currentReceipt.amount_paid)}
Amount in Words: ${numberToWordsIndian(currentReceipt.amount_paid)}
Payment Mode: ${currentReceipt.payment_mode}
UTR / Ref: ${currentReceipt.utr_number}
Date: ${new Date(currentReceipt.created_at).toLocaleString("en-IN")}
Remaining Due: ${currency(currentReceipt.remaining_due)}
Status: PAID & VERIFIED
--------------------------------`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formattedDate = new Date(currentReceipt.created_at).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="receipt-modal-actions no-print">
          <div className="receipt-modal-actions-left">
            {receipts.length > 1 && (
              <div className="receipt-selector-wrap">
                <label htmlFor="receipt-picker" className="receipt-picker-label">Receipt:</label>
                <select
                  id="receipt-picker"
                  className="receipt-select"
                  value={currentReceipt.id}
                  onChange={(e) => setActiveId(e.target.value)}
                >
                  {receipts.map((r, index) => (
                    <option key={r.id} value={r.id}>
                      {r.id} ({currency(r.amount_paid)} - {new Date(r.created_at).toLocaleDateString("en-IN")})
                      {index === 0 ? " [Latest]" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="receipt-status-pill">✓ Verified Payment</span>
          </div>

          <div className="receipt-modal-actions-right">
            <button
              type="button"
              className="receipt-action-btn secondary"
              onClick={handleCopy}
              title="Copy receipt details as text"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button
              type="button"
              className="receipt-action-btn primary"
              onClick={handlePrint}
              title="Print receipt or save as PDF"
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              className="receipt-modal-close"
              onClick={onClose}
              aria-label="Close receipt"
            >
              ✕
            </button>
          </div>
        </div>

        {/* The Printable Official Institutional Fee Receipt */}
        <div className="printable-receipt-card" id="printable-fee-receipt">
          {/* Institution Header */}
          <div className="receipt-header">
            <div className="receipt-logo-wrap">
              <Image
                src={sitsLogo}
                alt="Siddhartha Institute of Technology and Sciences"
                className="receipt-logo"
                priority
              />
            </div>
            <div className="receipt-institute-info">
              <h2>SIDDHARTHA INSTITUTE OF TECHNOLOGY & SCIENCES</h2>
              <p className="receipt-subline">
                Approved by AICTE, New Delhi • Affiliated to JNTU, Hyderabad
              </p>
              <p className="receipt-address">
                Korremula Road, Narapally, Ghatkesar, Medchal–Malkajgiri, Hyderabad – 500088
              </p>
            </div>
          </div>

          <div className="receipt-divider-double" />

          <div className="receipt-badge-banner">
            <h3>FEE PAYMENT RECEIPT / ACKNOWLEDGEMENT</h3>
            <span className="receipt-ay">Academic Year: {currentReceipt.academic_year}</span>
          </div>

          {/* Receipt Top Metadata */}
          <div className="receipt-meta-grid">
            <div className="receipt-meta-col">
              <span className="meta-label">RECEIPT NUMBER</span>
              <strong className="meta-value receipt-id-highlight">{currentReceipt.id}</strong>
            </div>
            <div className="receipt-meta-col">
              <span className="meta-label">PAYMENT DATE & TIME</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
            <div className="receipt-meta-col">
              <span className="meta-label">PAYMENT MODE</span>
              <span className="meta-value font-semibold">{currentReceipt.payment_mode}</span>
            </div>
            <div className="receipt-meta-col">
              <span className="meta-label">TRANSACTION UTR / REF</span>
              <span className="meta-value monospace">{currentReceipt.utr_number}</span>
            </div>
          </div>

          {/* Student Particulars */}
          <div className="receipt-section-box">
            <div className="receipt-box-title">STUDENT PARTICULARS</div>
            <div className="receipt-student-grid">
              <div className="student-info-item">
                <span className="info-label">Student Name:</span>
                <strong className="info-value">{currentReceipt.student_name}</strong>
              </div>
              <div className="student-info-item">
                <span className="info-label">Hall Ticket No:</span>
                <strong className="info-value monospace">{currentReceipt.student_id}</strong>
              </div>
              <div className="student-info-item">
                <span className="info-label">Email ID:</span>
                <span className="info-value">{currentReceipt.email}</span>
              </div>
              <div className="student-info-item">
                <span className="info-label">Payee UPI / Name:</span>
                <span className="info-value">{currentReceipt.payee_upi} ({currentReceipt.payee_name})</span>
              </div>
            </div>
          </div>

          {/* Fee Accounting Table */}
          <div className="receipt-table-box">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Fee Particulars / Description</th>
                  <th className="text-right">Previous Due</th>
                  <th className="text-right">Amount Paid</th>
                  <th className="text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>01</td>
                  <td>
                    <strong>Academic & Tuition Fee (2026–27)</strong>
                    <small className="receipt-desc-sub">Paid via {currentReceipt.payment_mode} (Ref: {currentReceipt.utr_number})</small>
                  </td>
                  <td className="text-right monospace">{currency(currentReceipt.previous_due)}</td>
                  <td className="text-right monospace text-success font-bold">
                    {currency(currentReceipt.amount_paid)}
                  </td>
                  <td className="text-right monospace">{currency(currentReceipt.remaining_due)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="receipt-total-row">
                  <td colSpan={3} className="text-right">
                    <strong>TOTAL AMOUNT RECEIVED:</strong>
                  </td>
                  <td className="text-right monospace text-success receipt-grand-total">
                    {currency(currentReceipt.amount_paid)}
                  </td>
                  <td className="text-right"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Words */}
          <div className="receipt-words-box">
            <span className="words-label">Amount in Words:</span>
            <span className="words-value">{numberToWordsIndian(currentReceipt.amount_paid)}</span>
          </div>

          {/* Footer & Digital Stamp */}
          <div className="receipt-footer">
            <div className="receipt-notes">
              <p className="note-item">
                • This is an authentic computer-generated institutional electronic fee receipt.
              </p>
              <p className="note-item">
                • Please retain this receipt for campus examinations, library, and hall-ticket clearance.
              </p>
              <p className="note-item">
                • For fee queries or reconciliations, contact accounts@sits.ac.in.
              </p>
            </div>

            <div className="receipt-stamp-area">
              {/* Official Digital Stamp Seal */}
              <div className="official-stamp-seal">
                <svg className="stamp-svg" viewBox="0 0 200 200" width="120" height="120" aria-label="Official SITS Paid Seal">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#0284c7" strokeWidth="3.5" strokeDasharray="6,3" />
                  <circle cx="100" cy="100" r="82" fill="rgba(240, 249, 255, 0.7)" stroke="#0284c7" strokeWidth="2" />
                  <path id="circleTextPathTop" fill="none" d="M 30,100 A 70,70 0 0,1 170,100" />
                  <text fill="#0369a1" fontSize="11" fontWeight="800" letterSpacing="2">
                    <textPath href="#circleTextPathTop" startOffset="50%" textAnchor="middle">
                      SIDDHARTHA SITS
                    </textPath>
                  </text>
                  <g transform="translate(100, 96)">
                    <rect x="-65" y="-12" width="130" height="24" rx="4" fill="#0284c7" />
                    <text x="0" y="5" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing="1.5">
                      ✓ PAID
                    </text>
                  </g>
                  <text x="100" y="132" fill="#0369a1" fontSize="9.5" fontWeight="700" textAnchor="middle" letterSpacing="1">
                    ACCOUNTS BRANCH
                  </text>
                  <text x="100" y="148" fill="#0284c7" fontSize="8" fontWeight="600" textAnchor="middle">
                    HYDERABAD
                  </text>
                </svg>
              </div>
              <div className="signatory-text">
                <strong>Finance & Accounts Branch</strong>
                <small>Siddhartha Institute of Technology & Sciences</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

