import { z } from "zod";

export const groupStatusEnum = z.enum(["active", "archived"]);

export const dayOfWeekEnum = z.enum([
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

export type DayOfWeekValue = z.infer<typeof dayOfWeekEnum>;

export const DAY_LABELS: Record<DayOfWeekValue, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

export const groupScheduleSchema = z.object({
  day: dayOfWeekEnum,
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "صيغة وقت البدء غير صالحة (HH:mm)"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "صيغة وقت الانتهاء غير صالحة (HH:mm)"),
});

export const groupSchema = z.object({
  name: z.string().min(2, "اسم المجموعة يجب أن يكون حرفين على الأقل").trim(),
  classId: z.string().min(1, "يرجى اختيار الصف الدراسي"),
  price: z.number().min(0, "سعر المجموعة لا يمكن أن يكون بالسالب"),
  hasCenter: z.boolean(),
  centerSessionPrice: z.number().min(0, "سعر السنتر لا يمكن أن يكون بالسالب").optional(),
  status: groupStatusEnum,
  schedule: z.array(groupScheduleSchema).min(1, "يجب إضافة موعد واحد على الأقل في الجدول"),
});

export type GroupScheduleFormData = z.infer<typeof groupScheduleSchema>;
export type GroupFormData = z.infer<typeof groupSchema>;
