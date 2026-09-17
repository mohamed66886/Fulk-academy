import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "يرجى إدخال البريد الإلكتروني أو اسم المستخدم").trim(),
  password: z.string().min(6, "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const createTeacherSchema = z.object({
  name: z.string().min(2, "اسم المدرس يجب ألا يقل عن حرفين").trim(),
  email: z.string().email("البريد الإلكتروني غير صالح").trim(),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  phone: z
    .string()
    .min(10, "رقم الهاتف غير صالح")
    .regex(/^[0-9+]+$/, "رقم الهاتف يجب أن يحتوي على أرقام فقط")
    .trim(),
  subject: z.string().min(2, "المادة التعليمية مطلوبة").trim(),
  photoUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")),
});

export type CreateTeacherFormData = z.infer<typeof createTeacherSchema>;
