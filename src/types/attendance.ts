export type AttendanceStatus = "present" | "absent" | "late";
export type AttendanceSource = "camera" | "scanner" | "manual";

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  sessionId?: string;
  status: AttendanceStatus;
  scannedAt: string;
  source: AttendanceSource;
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  teacherId?: string;
  groupId: string;
  date: string;
  startTime: string;
  endTime?: string;
  status?: "active" | "completed";
  createdBy: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  createdAt?: string;
  updatedAt?: string;
}
