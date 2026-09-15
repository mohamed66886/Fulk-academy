export interface ExamResult {
  id?: string;
  examId?: string;
  studentId: string;
  grade: number;
  percentage: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exam {
  id: string;
  teacherId?: string;
  name: string;
  classId: string;
  groupId: string;
  finalGrade: number;
  examDate: string;
  createdAt: string;
  updatedAt?: string;
}
