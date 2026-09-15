export type StudentStatus = "active" | "blocked";

export interface Student {
  id: string;
  teacherId?: string;
  name: string;
  phone: string;
  classId: string;
  groupId: string;
  parentName: string;
  parentPhone: string;
  photoUrl?: string;
  qrToken: string;
  parentQrToken: string;
  groupPrice: number;
  discount: number;
  finalPrice: number;
  status: StudentStatus;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}
