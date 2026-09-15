export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface Payment {
  id: string;
  teacherId?: string;
  studentId: string;
  groupId: string;
  month: string; // Format: "YYYY-MM"
  groupPrice: number;
  discount: number;
  required: number;
  paid: number;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
