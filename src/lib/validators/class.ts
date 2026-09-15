import { z } from "zod";

export const classStatusEnum = z.enum(["active", "archived"]);

export const classSchema = z.object({
  name: z.string().min(2, "اسم الصف يجب أن يكون حرفين على الأقل").trim(),
  description: z.string().optional(),
  status: classStatusEnum,
});

export type ClassFormData = z.infer<typeof classSchema>;
