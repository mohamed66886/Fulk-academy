import { z } from "zod";

export const studentStatusEnum = z.enum(["active", "blocked"]);

export const studentSchema = z.object({
  name: z.string().min(2, "اسم الطالب يجب أن يكون حرفين على الأقل").trim(),
  phone: z
    .string()
    .min(10, "رقم الهاتف يجب ألا يقل عن 10 أرقام")
    .regex(/^[0-9+]+$/, "رقم الهاتف يجب أن يحتوي على أرقام فقط")
    .trim(),
  classId: z.string().min(1, "يرجى اختيار الصف الدراسي"),
  groupId: z.string().min(1, "يرجى اختيار المجموعة"),
  parentName: z.string().min(2, "اسم ولي الأمر يجب أن يكون حرفين على الأقل").trim(),
  parentPhone: z
    .string()
    .min(10, "رقم هاتف ولي الأمر يجب ألا يقل عن 10 أرقام")
    .regex(/^[0-9+]+$/, "رقم الهاتف يجب أن يحتوي على أرقام فقط")
    .trim(),
  photoUrl: z.string().optional(),
  discount: z.number().min(0, "قيمة الخصم لا يمكن أن تكون بالسالب"),
  groupPrice: z.number().min(0).optional(),
  finalPrice: z.number().min(0).optional(),
  status: studentStatusEnum,
  blockReason: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;
