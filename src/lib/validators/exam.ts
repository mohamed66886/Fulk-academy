import { z } from "zod";

export const examSchema = z.object({
  name: z.string().min(2, "عنوان الامتحان مطلوب").trim(),
  classId: z.string().min(1, "يرجى اختيار الصف الدراسي"),
  groupId: z.string().min(1, "يرجى اختيار المجموعة"),
  finalGrade: z.coerce.number().positive("الدرجة النهائية يجب أن تكون أكبر من صفر"),
  examDate: z.string().min(1, "تاريخ الامتحان مطلوب"),
});

export const examResultSchema = z.object({
  studentId: z.string().min(1, "معرف الطالب مطلوب"),
  grade: z.coerce.number().min(0, "الدرجة لا يمكن أن تكون بالسالب"),
  percentage: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type ExamFormData = z.infer<typeof examSchema>;
export type ExamResultFormData = z.infer<typeof examResultSchema>;
