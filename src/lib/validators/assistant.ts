import { z } from "zod";

export const assistantStatusEnum = z.enum(["active", "disabled"]);

export const permissionActionSchema = z.object({
  view: z.boolean().default(false),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const assistantPermissionsSchema = z.object({
  students: permissionActionSchema,
  attendance: permissionActionSchema,
  payments: permissionActionSchema,
  exams: permissionActionSchema,
});

export const assistantSchema = z.object({
  name: z.string().min(2, "اسم المساعد يجب أن يكون حرفين على الأقل").trim(),
  email: z.string().email("البريد الإلكتروني غير صالح").trim(),
  phone: z
    .string()
    .min(10, "رقم الهاتف يجب ألا يقل عن 10 أرقام")
    .regex(/^[0-9+]+$/, "رقم الهاتف يجب أن يحتوي على أرقام فقط")
    .trim(),
  status: assistantStatusEnum.default("active"),
  permissions: assistantPermissionsSchema,
});

export const createAssistantSchema = assistantSchema.extend({
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export const updateAssistantPermissionsSchema = z.object({
  assistantId: z.string().min(1, "معرف المساعد مطلوب"),
  permissions: assistantPermissionsSchema,
});

export type PermissionActionFormData = z.infer<typeof permissionActionSchema>;
export type AssistantPermissionsFormData = z.infer<typeof assistantPermissionsSchema>;
export type AssistantFormData = z.infer<typeof assistantSchema>;
export type CreateAssistantFormData = z.infer<typeof createAssistantSchema>;
export type UpdateAssistantPermissionsFormData = z.infer<typeof updateAssistantPermissionsSchema>;
