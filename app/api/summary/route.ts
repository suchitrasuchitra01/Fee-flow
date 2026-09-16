import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { name, total, paid, due, fine } = await request.json();
  const prompt = `Write a concise, friendly fee-status summary for ${name}. Total fee is ₹${total}, paid is ₹${paid}, due is ₹${due}, and fine is ₹${fine}. Mention only relevant figures and offer one next step. Maximum 55 words.`;
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return NextResponse.json({ summary: due > 0 ? `You have ${due.toLocaleString("en-IN")} pending. Please pay your outstanding balance before the due date.` : "Your fee balance is fully settled. Thank you!" });
  }
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summary) throw new Error("No Gemini response");
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ summary: `Your current outstanding balance is ₹${due.toLocaleString("en-IN")}. Use the payment options above to make a payment.` });
  }
}
