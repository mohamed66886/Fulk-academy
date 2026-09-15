export type TeacherStatus = "active" | "disabled";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  photoUrl?: string;
  status: TeacherStatus;
  createdAt: string;
  updatedAt?: string;
}
