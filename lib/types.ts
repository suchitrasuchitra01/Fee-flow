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
