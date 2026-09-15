"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  groupSchema,
  type GroupFormData,
  DAY_LABELS,
  type DayOfWeekValue,
} from "@/lib/validators/group";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Plus,
  Trash2,
  ArrowRight,
  Info,
  Building2,
  Calendar,
  Clock,
  DollarSign,
} from "lucide-react";

interface GroupFormProps {
  classes: Array<{ id: string; name: string }>;
  initialData?: GroupFormData;
  isEdit?: boolean;
  onSubmit: (data: GroupFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function GroupForm({
  classes,
  initialData,
  isEdit = false,
  onSubmit,
  isSubmitting,
}: GroupFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: initialData || {
      name: "",
      classId: classes[0]?.id || "",
      price: 0,
      hasCenter: false,
      centerSessionPrice: undefined,
      status: "active",
      schedule: [
        {
          day: "saturday",
          startTime: "16:00",
          endTime: "18:00",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedule",
  });

  const hasCenter = watch("hasCenter");

  const daysList: DayOfWeekValue[] = [
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      {/* Informational Alert for Edit mode (Price preservation rule) */}
      {isEdit && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-text flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-text text-sm">ملاحظة هامة بشأن تعديل السعر الشهري:</h4>
            <p className="text-xs text-muted leading-relaxed">
              تعديل السعر الشهري للمجموعة لن يغيّر تلقائياً السعر النهائي (
              <span className="font-semibold text-text">finalPrice</span>) أو الخصومات الفردية
              الممنوحة للطلاب المسجلين مسبقاً في هذه المجموعة. السعر الجديد سيُعتمد فقط كسعر افتراضي
              للطلاب الجدد عند إضافتهم لاحقاً.
            </p>
          </div>
        </div>
      )}

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بيانات المجموعة الأساسية</CardTitle>
          <CardDescription>
            حدد اسم المجموعة والصف الدراسي التابعة له والسعر الشهري.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group Name */}
            <FormField label="اسم المجموعة" required error={errors.name?.message}>
              <Input
                placeholder="مثال: مجموعة أ - سنتر النور"
                {...register("name")}
                error={!!errors.name}
              />
            </FormField>

            {/* Class Selection */}
            <FormField label="الصف الدراسي" required error={errors.classId?.message}>
              <Select {...register("classId")} error={!!errors.classId}>
                {classes.length === 0 ? (
                  <option value="">لا توجد صفوف دراسية - أنشئ صفاً أولاً</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
                )}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Price */}
            <FormField
              label="السعر الشهري الافتراضي (ج.م)"
              required
              error={errors.price?.message}
              description="هذا السعر يطبق افتراضياً على الطلاب الجدد عند تسجيلهم بالمجموعة."
            >
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  {...register("price", { valueAsNumber: true })}
                  error={!!errors.price}
                  className="pl-9"
                />
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </FormField>

            {/* Status */}
            <FormField label="حالة المجموعة" required error={errors.status?.message}>
              <Select {...register("status")} error={!!errors.status}>
                <option value="active">نشطة (متاحة لإضافة طلاب وتسجيل حضور)</option>
                <option value="archived">مؤرشفة (مغلقة)</option>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Center Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">إعدادات السنتر التعليمي</CardTitle>
          </div>
          <CardDescription>
            هل تُقام حصص هذه المجموعة داخل سنتر تعليمي يتقاضى نسبة أو رسوم حضور؟
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border p-3.5 hover:bg-surface/50 transition-colors">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
              {...register("hasCenter")}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-text">
                المجموعة تُدرس داخل سنتر تعليمي
              </span>
              <span className="text-xs text-muted">
                تفعيل هذا الخيار يتيح لك احتساب ومتابعة تكلفة الحصة لكل طالب للسنتر.
              </span>
            </div>
          </label>

          {/* Conditional Center Session Price */}
          {hasCenter && (
            <div className="pt-2 animate-in fade-in duration-200">
              <FormField
                label="سعر حصة السنتر للطالب (ج.م)"
                error={errors.centerSessionPrice?.message}
                description="المبلغ المستحق للسنتر عن حضور الطالب في الحصة الواحدة."
              >
                <div className="relative max-w-md">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="مثال: 15"
                    {...register("centerSessionPrice", { valueAsNumber: true })}
                    error={!!errors.centerSessionPrice}
                    className="pl-9"
                  />
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Schedule Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">جدول مواعيد الحصص الأسبوعي</CardTitle>
            </div>
            <CardDescription className="mt-1">
              أضف موعداً أو أكثر للمجموعة خلال أيام الأسبوع مع وقت البداية والنهاية.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                day: "sunday",
                startTime: "16:00",
                endTime: "18:00",
              })
            }
            className="gap-1.5 font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة موعد</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.schedule?.message && (
            <p className="text-xs text-danger font-semibold">{errors.schedule.message}</p>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-border bg-surface/40 hover:bg-surface transition-colors"
            >
              <div className="flex items-center gap-2 sm:w-16 shrink-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold text-muted sm:hidden">موعد الحصة</span>
              </div>

              {/* Day selection */}
              <div className="flex-1">
                <Select
                  {...register(`schedule.${index}.day` as const)}
                  error={!!errors.schedule?.[index]?.day}
                >
                  {daysList.map((dayKey) => (
                    <option key={dayKey} value={dayKey}>
                      يوم {DAY_LABELS[dayKey]}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Start Time */}
              <div className="flex-1">
                <div className="relative">
                  <TimePicker
                    {...register(`schedule.${index}.startTime` as const)}
                    error={!!errors.schedule?.[index]?.startTime}
                  />
                </div>
              </div>

              {/* Arrow separator */}
              <div className="hidden sm:flex items-center text-muted px-1">
                <ArrowRight className="h-4 w-4 rotate-180" />
              </div>

              {/* End Time */}
              <div className="flex-1">
                <div className="relative">
                  <TimePicker
                    {...register(`schedule.${index}.endTime` as const)}
                    error={!!errors.schedule?.[index]?.endTime}
                  />
                </div>
              </div>

              {/* Delete appointment button */}
              <div className="flex items-center justify-end sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                  className="text-muted hover:text-danger hover:bg-danger/10 h-9 w-9 p-0 disabled:opacity-40"
                  title={fields.length <= 1 ? "يجب بقاء موعد واحد على الأقل" : "حذف هذا الموعد"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              تأكد من ضبط توقيت البداية والنهاية بنظام 24 ساعة بدقة.
            </span>
            <span>عدد الحصص الأسبوعية: {fields.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link href="/groups">
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            إلغاء
          </Button>
        </Link>
        <Button type="submit" isLoading={isSubmitting} className="font-bold min-w-[140px]">
          {isEdit ? "حفظ التعديلات" : "إنشاء المجموعة"}
        </Button>
      </div>
    </form>
  );
}
