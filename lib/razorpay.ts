import { Student, FeeReceipt } from "@/lib/types";

// Dynamic script loader for Razorpay Checkout JS
let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error("Failed to load Razorpay Checkout script.");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export interface LaunchRazorpayParams {
  student: Student;
  amount: number;
  feeType?: "tuition" | "fine" | "all";
  onSuccess: (receipt: FeeReceipt, updatedStudent?: Student) => void;
  onError?: (errorMessage: string) => void;
  onDismiss?: () => void;
}

export async function launchRazorpayCheckout({
  student,
  amount,
  feeType = "all",
  onSuccess,
  onError,
  onDismiss,
}: LaunchRazorpayParams): Promise<boolean> {
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded || !(window as any).Razorpay) {
      onError?.("Razorpay gateway could not be loaded. Please check your internet connection.");
      return false;
    }

    // Step 1: Create an official Razorpay Order via server
    let orderData: { orderId?: string; amount?: number; keyId?: string } = {};
    try {
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          student_id: student.student_id,
          fee_type: feeType,
        }),
      });
      if (orderRes.ok) {
        orderData = await orderRes.json();
      }
    } catch (orderErr) {
      console.warn("Could not create server order, falling back to standard client checkout:", orderErr);
    }

    const key =
      orderData.keyId ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      "rzp_test_Td0oxwFymxYPOM";

    const amountInPaise = Math.round(amount * 100);

    const feeDescription =
      feeType === "fine"
        ? "Late Fine Payment"
        : feeType === "tuition"
        ? "Tuition Fee Payment"
        : "Academic Fee Payment";

    // Step 2: Configure Razorpay Checkout options
    const options: any = {
      key,
      amount: orderData.amount || amountInPaise,
      currency: "INR",
      name: "Siddhartha Institute of Tech & Sciences",
      description: `${feeDescription} - ${student.student_id}`,
      image: "https://cdn-icons-png.flaticon.com/512/3135/3135810.png",
      order_id: orderData.orderId,
      prefill: {
        name: student.name,
        email: student.email || "student@siddhartha.org.in",
        contact: "9876543210",
      },
      notes: {
        student_id: student.student_id,
        student_name: student.name,
        fee_type: feeType,
        college: "Siddhartha Institute of Technology & Sciences",
      },
      theme: {
        color: "#1e3a8a", // SITS Collegiate Navy
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
        },
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        try {
          const generatedUtr = response.razorpay_payment_id || `RZP${Date.now()}`;
          const res = await fetch("/api/payments/receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: student.student_id,
              amount_paid: amount,
              payment_mode: "Razorpay Secure (Test Mode)",
              fee_type: feeType,
              utr_number: generatedUtr,
              payee_upi: "rzp_test_Td0oxwFymxYPOM",
              payee_name: "SITS College Accounts (Razorpay)",
            }),
          });

          const data = await res.json();
          let receipt: FeeReceipt;

          if (res.ok && data.receipt) {
            receipt = data.receipt;
            onSuccess(receipt, data.student);
          } else {
            // Local fallback receipt
            receipt = {
              id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
              student_id: student.student_id,
              student_name: student.name,
              email: student.email,
              amount_paid: amount,
              previous_due: student.due_fee,
              remaining_due: Math.max(0, student.due_fee - amount),
              total_fee: student.total_fee,
              payment_mode: "Razorpay Secure (Test Mode)",
              fee_type: feeType,
              utr_number: generatedUtr,
              payee_upi: "rzp_test_Td0oxwFymxYPOM",
              payee_name: "SITS College Accounts (Razorpay)",
              created_at: new Date().toISOString(),
              academic_year: "2026–2027",
            };
            onSuccess(receipt);
          }
        } catch (postErr) {
          console.error("Receipt creation error after Razorpay payment:", postErr);
          const fallbackReceipt: FeeReceipt = {
            id: `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
            student_id: student.student_id,
            student_name: student.name,
            email: student.email,
            amount_paid: amount,
            previous_due: student.due_fee,
            remaining_due: Math.max(0, student.due_fee - amount),
            total_fee: student.total_fee,
            payment_mode: "Razorpay Secure (Test Mode)",
            fee_type: feeType,
            utr_number: response.razorpay_payment_id || `RZP${Date.now()}`,
            payee_upi: "rzp_test_Td0oxwFymxYPOM",
            payee_name: "SITS College Accounts (Razorpay)",
            created_at: new Date().toISOString(),
            academic_year: "2026–2027",
          };
          onSuccess(fallbackReceipt);
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);

    rzp.on("payment.failed", function (response: any) {
      console.warn("Razorpay Payment Failed:", response.error);
      onError?.(response.error?.description || "Payment failed or was declined.");
    });

    rzp.open();
    return true;
  } catch (err) {
    console.error("Error opening Razorpay checkout:", err);
    onError?.(err instanceof Error ? err.message : "Failed to open Razorpay");
    return false;
  }
}
