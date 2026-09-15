export type ClassStatus = "active" | "archived";

export interface ClassEntity {
  id: string;
  teacherId?: string;
  name: string;
  description?: string;
  status: ClassStatus;
  createdAt: string;
  updatedAt?: string;
}
