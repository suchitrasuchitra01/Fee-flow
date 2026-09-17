import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { amount, student_id, fee_type } = await request.json();

    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      "rzp_test_Td0oxwFymxYPOM";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "i6Q9s70kGeAj66UOeReoLJKK";

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const amountInPaise = Math.round(Number(amount) * 100);

    const receiptSuffix = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const razorpayReceipt = `rcpt_${student_id ? String(student_id).replace(/[^a-zA-Z0-9]/g, "").slice(-6) : "fee"}_${receiptSuffix}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: razorpayReceipt,
        notes: {
          student_id: student_id || "STU1024",
          fee_type: fee_type || "all",
          college: "Siddhartha Institute of Technology & Sciences",
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("Razorpay order creation warning:", data);
      return NextResponse.json(
        {
          error: data.error?.description || "Failed to create Razorpay order",
          raw: data,
          keyId,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
    });
  } catch (error) {
    console.error("Razorpay order route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
