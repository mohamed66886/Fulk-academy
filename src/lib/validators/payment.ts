import { z } from "zod";

export const paymentStatusEnum = z.enum(["unpaid", "partial", "paid"]);

export const paymentSchema = z.object({
  studentId: z.string().min(1, "يرجى اختيار الطالب"),
  groupId: z.string().min(1, "يرجى اختيار المجموعة"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "صيغة الشهر غير صحيحة (يجب أن تكون YYYY-MM)"),
  groupPrice: z.coerce.number().min(0, "سعر المجموعة لا يمكن أن يكون بالسالب"),
  discount: z.coerce.number().min(0, "قيمة الخصم لا يمكن أن تكون بالسالب").default(0),
  required: z.coerce.number().min(0, "المبلغ المطلوب لا يمكن أن يكون بالسالب"),
  paid: z.coerce.number().min(0, "المبلغ المدفوع لا يمكن أن يكون بالسالب"),
  status: paymentStatusEnum.default("unpaid"),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
