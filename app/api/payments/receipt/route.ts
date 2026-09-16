import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { FeeReceipt } from "@/lib/types";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      student_id,
      amount_paid,
      payment_mode = "UPI",
      fee_type = "all", // "tuition" | "fine" | "all"
      utr_number = "",
      payee_upi = "8688099587@ybl",
      payee_name = "SITS",
    } = body;

    const amount = Number(amount_paid);
    if (!student_id || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Valid student_id and amount_paid are required." },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const receiptId = `REC-${currentYear}-${randomSuffix}`;
    const cleanUtr = utr_number.trim() || `UPI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

    let updatedStudent = null;
    let previousDue = 0;
    let remainingDue = 0;
    let totalFee = 0;
    let studentName = "Student";
    let studentEmail = "";

    try {
      const service = serviceClient();
      const { data: student, error: fetchErr } = await service
        .from("students")
        .select("*")
        .eq("student_id", student_id)
        .maybeSingle();

      if (student && !fetchErr) {
        studentName = student.name;
        studentEmail = student.email;
        totalFee = Number(student.total_fee || 0);
        previousDue = Number(student.due_fee || 0);
        const currentPaid = Number(student.paid_fee || 0);
        const currentFine = Number(student.fine_fee || 0);

        let newPaid = currentPaid;
        let newDue = previousDue;
        let newFine = currentFine;

        if (fee_type === "fine") {
          // Dedicated Late Fine payment
          newFine = Math.max(0, currentFine - amount);
          remainingDue = previousDue; // tuition due remains intact
        } else if (fee_type === "tuition") {
          // Dedicated Tuition Fee payment
          const paidToDue = Math.min(previousDue, amount);
          newDue = Math.max(0, previousDue - paidToDue);
          newPaid = currentPaid + amount;
          remainingDue = newDue;
        } else {
          // Consolidated payment: Pay tuition due first, then remainder covers fine
          const paidToDue = Math.min(previousDue, amount);
          newDue = Math.max(0, previousDue - paidToDue);
          newPaid = currentPaid + paidToDue;
          const excessToFine = Math.max(0, amount - paidToDue);
          newFine = Math.max(0, currentFine - excessToFine);
          remainingDue = newDue + newFine;
        }

        const { data: updated, error: updateErr } = await service
          .from("students")
          .update({
            paid_fee: newPaid,
            due_fee: newDue,
            fine_fee: newFine,
          })
          .eq("id", student.id)
          .select()
          .maybeSingle();

        if (!updateErr && updated) {
          updatedStudent = updated;
        }
      }
    } catch (dbErr) {
      console.warn("Database sync note:", dbErr);
    }

    const receipt: FeeReceipt = {
      id: receiptId,
      student_id,
      student_name: updatedStudent?.name || studentName,
      email: updatedStudent?.email || studentEmail,
      amount_paid: amount,
      previous_due: previousDue,
      remaining_due: remainingDue,
      total_fee: updatedStudent?.total_fee || totalFee,
      payment_mode: `${payment_mode}${fee_type === "fine" ? " (Late Fine)" : fee_type === "tuition" ? " (Tuition)" : ""}`,
      fee_type: fee_type as "tuition" | "fine" | "all",
      utr_number: cleanUtr,
      payee_upi,
      payee_name,
      created_at: new Date().toISOString(),
      academic_year: "2026–2027",
    };

    return NextResponse.json({
      success: true,
      receipt,
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Receipt generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process receipt." },
      { status: 500 }
    );
  }
}

