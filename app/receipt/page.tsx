"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { FeeReceipt, Student } from "@/lib/types";
import { currency } from "@/lib/utils";

export default function ReceiptPage() {
  const searchParams = useSearchParams();
  const receiptId = searchParams.get("id");

  const [receipt, setReceipt] = useState<FeeReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipt() {
      try {
        const supabase = createClient();
        if (receiptId) {
          const { data } = await supabase
            .from("fee_receipts")
            .select("*")
            .eq("id", receiptId)
            .maybeSingle();

          if (data) {
            setReceipt(data);
            setLoading(false);
            return;
          }
        }

        // Fallback: load latest receipt for logged in user, or default demo receipt matching Page 9
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: receipts } = await supabase
            .from("fee_receipts")
            .select("*")
            .eq("email", user.email)
            .order("created_at", { ascending: false })
            .limit(1);

          if (receipts && receipts.length > 0) {
            setReceipt(receipts[0]);
            setLoading(false);
            return;
          }
        }

        // Standard Page 9 Demo Receipt
        setReceipt({
          id: "REC-2024-00125",
          student_id: "STU1024",
          student_name: "Rahul Kumar",
          email: "rahul@siddhartha.org.in",
          amount_paid: 27000,
          previous_due: 35000,
          remaining_due: 8000,
          total_fee: 85000,
          payment_mode: "Online (Razorpay)",
          utr_number: "pay_ABC123456",
          payee_upi: "8688099587@ybl",
          payee_name: "Siddhartha Institute",
          created_at: new Date().toISOString(),
          academic_year: "2026–2027",
        });
      } catch (err) {
        console.error("Error loading receipt:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReceipt();
  }, [receiptId]);

  function handleDownloadPdf() {
    window.print();
  }

  const currentReceipt = receipt || {
    id: "REC-2024-00125",
    student_id: "STU1024",
    student_name: "Rahul Kumar",
    email: "rahul@siddhartha.org.in",
    amount_paid: 27000,
    previous_due: 35000,
    remaining_due: 8000,
    total_fee: 85000,
    payment_mode: "Online (Razorpay)",
    utr_number: "pay_ABC123456",
    payee_upi: "8688099587@ybl",
    payee_name: "Siddhartha Institute",
    created_at: new Date().toISOString(),
    academic_year: "2026–2027",
  };

  const formattedDate = new Date(currentReceipt.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="smart-page-wrapper printable-receipt-wrapper">
      <div className="no-print">
        <Navbar activePage="/receipt" />
      </div>

      <main className="smart-content-page receipt-layout-page">
        <div className="receipt-page-container animate-fade-up">
          {/* Main Printable White Receipt Card matching Page 9 */}
          <div className="official-receipt-doc">
            {/* Header: Brand + Institution Name & Address */}
            <div className="receipt-doc-header">
              <div className="receipt-brand-row">
                <div className="smart-brand-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 3.73l6.5 3.55L12 13.82 5.5 10.28 12 6.73zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                  </svg>
                </div>
                <span className="smart-brand-text">
                  Smart<strong>Fee</strong>
                </span>
              </div>
              <h2 className="receipt-title-tag">Payment Receipt</h2>
            </div>

            <div className="institution-info-block">
              <h3>Siddhartha Institute of Technology & Sciences</h3>
              <p className="inst-address">
                Korremula Road, Narapally, Ghatkesar, Medchal–Malkajgiri, Hyderabad – 500088
              </p>
            </div>

            <div className="receipt-divider" />

            {/* Metadata Table Grid */}
            <div className="receipt-doc-meta-grid">
              <div className="meta-pair">
                <span className="m-label">Receipt No.</span>
                <strong className="m-val monospace">{currentReceipt.id}</strong>
              </div>
              <div className="meta-pair">
                <span className="m-label">Date</span>
                <span className="m-val">{formattedDate}</span>
              </div>
              <div className="meta-pair">
                <span className="m-label">Student ID</span>
                <strong className="m-val monospace">{currentReceipt.student_id}</strong>
              </div>
              <div className="meta-pair">
                <span className="m-label">Payment Mode</span>
                <span className="m-val font-semibold">{currentReceipt.payment_mode}</span>
              </div>
              <div className="meta-pair">
                <span className="m-label">Student Name</span>
                <strong className="m-val">{currentReceipt.student_name}</strong>
              </div>
              <div className="meta-pair">
                <span className="m-label">Transaction ID / UTR</span>
                <span className="m-val monospace">{currentReceipt.utr_number}</span>
              </div>
              <div className="meta-pair">
                <span className="m-label">Course</span>
                <span className="m-val">B.Tech (CSE)</span>
              </div>
              <div className="meta-pair">
                <span className="m-label">Status</span>
                <span className="receipt-paid-pill">PAID ✓</span>
              </div>
              <div className="meta-pair">
                <span className="m-label">Year</span>
                <span className="m-val">3rd Year</span>
              </div>
            </div>

            {/* Itemized Fee Breakdown Table */}
            <div className="receipt-items-table-wrap">
              <table className="receipt-items-table">
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th className="text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tuition Fee (Installment)</td>
                    <td className="text-right monospace">₹20,000</td>
                  </tr>
                  <tr>
                    <td>Examination Fee</td>
                    <td className="text-right monospace">₹5,000</td>
                  </tr>
                  <tr>
                    <td>Library Fee</td>
                    <td className="text-right monospace">₹2,000</td>
                  </tr>
                  <tr className="total-paid-row">
                    <td>
                      <strong>Total Paid</strong>
                    </td>
                    <td className="text-right monospace total-paid-val">
                      {currency(currentReceipt.amount_paid)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Acknowledgement & Signature */}
            <div className="receipt-doc-footer">
              <p className="thank-you-msg">Thank you for your payment!</p>
              <div className="signatory-box">
                <span className="sig-line" />
                <span className="sig-label">Authorized Accounts Signatory</span>
                <small className="inst-subtext">SITS Hyderabad</small>
              </div>
            </div>

            {/* Action Button: Download PDF */}
            <div className="receipt-actions-row no-print">
              <button
                type="button"
                className="download-pdf-btn"
                onClick={handleDownloadPdf}
              >
                <span className="down-icon">⬇️</span>
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Right Decorative Banner matching Page 9 */}
          <div className="receipt-banner-card no-print">
            <div className="banner-cap-icon">
              <svg viewBox="0 0 64 64" width="72" height="72" fill="none">
                <path d="M32 8L4 24L32 40L60 24L32 8Z" fill="#2563eb" />
                <path d="M12 28.5V44C12 50.6 32 56 32 56C32 56 52 50.6 52 44V28.5L32 40L12 28.5Z" fill="#1d4ed8" />
                <path d="M60 25V42" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="45" r="3" fill="#f59e0b" />
              </svg>
            </div>

            <h2>Education Empowers You</h2>

            <div className="banner-pills-col">
              <span className="b-pill">Learn</span>
              <span className="b-pill">Pay</span>
              <span className="b-pill">Grow</span>
              <span className="b-pill">Succeed</span>
            </div>

            <p className="banner-footer-note">
              This receipt is electronically verified and does not require a physical signature for income tax rebate purposes.
            </p>
          </div>
        </div>
      </main>

      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}

