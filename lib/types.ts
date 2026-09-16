export type Student = {
  id: string;
  student_id: string;
  name: string;
  email: string;
  total_fee: number;
  paid_fee: number;
  due_fee: number;
  fine_fee: number;
  created_at?: string;
};

export type Profile = {
  id: string;
  role: "admin" | "student";
};

export type FeeReceipt = {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  amount_paid: number;
  previous_due: number;
  remaining_due: number;
  total_fee: number;
  payment_mode: string;
  fee_type?: "tuition" | "fine" | "all";
  utr_number: string;
  payee_upi: string;
  payee_name: string;
  created_at: string;
  academic_year: string;
};
