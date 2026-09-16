"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useClassesForSelect, queryKeys } from "@/hooks/use-cached-data";
import { createGroup, updateGroup, deleteGroup } from "@/lib/actions/groups";
import {
  groupSchema,
  type GroupFormData,
  type DayOfWeekValue,
  DAY_LABELS,
} from "@/lib/validators/group";
import { EntityForm } from "@/components/ui/EntityForm";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { toast } from "@/components/ui/toast";
import {
  Users,
  Plus,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  ArrowRight,
  Info,
  Layers,
} from "lucide-react";

export interface GroupFormProps {
  initialData?: {
    id?: string;
    name: string;
    classId: string;
    price: number;
    hasCenter?: boolean;
    centerSessionPrice?: number;
    status: "active" | "archived";
    schedule: Array<{
      day: DayOfWeekValue;
      startTime: string;
      endTime: string;
    }>;
  };
  isEdit?: boolean;
  initialClasses?: Array<{ id: string; name: string }>;
  defaultClassId?: string;
  // Backwards compatibility props
  classes?: Array<{ id: string; name: string }>;
  onSubmit?: (data: GroupFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const DAYS_LIST: DayOfWeekValue[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export function GroupForm({
  initialData,
  isEdit = false,
  initialClasses,
  defaultClassId,
  classes: passedClasses,
  onSubmit: externalOnSubmit,
  isSubmitting: externalIsSubmitting,
}: GroupFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupId = initialData?.id;

  // Load classes if not passed
  const { data: cachedClasses } = useClassesForSelect();
  const classesList = React.useMemo(() => {
    return passedClasses || initialClasses || cachedClasses || [];
  }, [passedClasses, initialClasses, cachedClasses]);

  const [formData, setFormData] = React.useState<GroupFormData>({
    name: initialData?.name || "",
    classId: initialData?.classId || defaultClassId || "",
    price: initialData?.price !== undefined ? initialData.price : 0,
    hasCenter: initialData?.hasCenter || false,
    centerSessionPrice: initialData?.centerSessionPrice,
    status: initialData?.status || "active",
    schedule:
      initialData?.schedule && initialData.schedule.length > 0
        ? initialData.schedule
        : [{ day: "saturday", startTime: "16:00", endTime: "18:00" }],
  });

  // Automatically select first class if none selected and classes loaded
  React.useEffect(() => {
    if (!formData.classId && classesList.length > 0) {
      setFormData((prev) => ({
        ...prev,
        classId: defaultClassId || classesList[0]!.id,
      }));
    }
  }, [classesList, formData.classId, defaultClassId]);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Helper to get selected class name for live preview
  const selectedClassName = React.useMemo(() => {
    const found = classesList.find((c) => c.id === formData.classId);
    return found ? found.name : "";
  }, [classesList, formData.classId]);

  // Schedule slot handlers
  const handleAddScheduleSlot = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { day: "sunday", startTime: "16:00", endTime: "18:00" }],
    }));
  };

  const handleRemoveScheduleSlot = (index: number) => {
    if (formData.schedule.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateScheduleSlot = (
    index: number,
    field: "day" | "startTime" | "endTime",
    value: DayOfWeekValue | string
  ) => {
    setFormData((prev) => {
      const nextSchedule = [...prev.schedule];
      nextSchedule[index] = {
        ...nextSchedule[index]!,
        [field]: value,
      } as (typeof nextSchedule)[number];
      return { ...prev, schedule: nextSchedule };
    });
  };

  const handleSubmit = async () => {
    // Client-side validation with Zod
    const validation = groupSchema.safeParse({
      ...formData,
      price: Number(formData.price) || 0,
      centerSessionPrice:
        formData.hasCenter && formData.centerSessionPrice !== undefined
          ? Number(formData.centerSessionPrice) || 0
          : undefined,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFieldErrors(errors);
      return { success: false, error: "يرجى التحقق من صحة البيانات المدخلة" };
    }

    setFieldErrors({});

    // If caller provided custom onSubmit handler (backwards compatibility)
    if (externalOnSubmit) {
      try {
        await externalOnSubmit(validation.data);
        return { success: true };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "فشل حفظ المجموعة",
        };
      }
    }

    try {
      if (isEdit && groupId) {
        const res = await updateGroup(groupId, validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل تعديل بيانات المجموعة الدراسية" };
        }
        toast.success("تم تحديث بيانات المجموعة بنجاح!");
        queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        return { success: true };
      } else {
        const res = await createGroup(validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل إنشاء المجموعة الدراسية" };
        }
        toast.success("تم إنشاء المجموعة الدراسية بنجاح!");
        queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        return { success: true };
      }
    } catch {
      return { success: false, error: "حدث خطأ غير متوقع أثناء الحفظ" };
    }
  };

  const handleDelete = async () => {
    if (!groupId) return;
    setIsDeleting(true);
    try {
      const res = await deleteGroup(groupId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف المجموعة الدراسية");
        return;
      }
      toast.success("تم نقل المجموعة الدراسية إلى سلة المحذوفات بنجاح");
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/groups");
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <EntityForm
        title={isEdit ? "تعديل بيانات المجموعة الدراسية" : "إضافة مجموعة دراسية جديدة"}
        description={
          isEdit
            ? "تعديل اسم المجموعة، المواعيد الأسبوعية، السعر أو سنتر التدريس."
            : "إنشاء مجموعة جديدة وتحديد مواعيد حصصها وسعرها الافتراضي والسنتر."
        }
        icon={Users}
        iconColor="text-primary"
        badge={
          isEdit ? (
            <Badge variant={formData.status === "active" ? "success" : "default"} size="sm">
              {formData.status === "active" ? "نشطة" : "مؤرشفة"}
            </Badge>
          ) : undefined
        }
        isEdit={isEdit}
        onSubmit={handleSubmit}
        isLoading={externalIsSubmitting}
        submitText={isEdit ? "حفظ التعديلات" : "حفظ المجموعة الدراسية"}
        cancelHref={isEdit && groupId ? `/groups/${groupId}` : "/groups"}
        previewHref="/groups"
        tableHref="/groups"
        previewText="معاينة قائمة المجموعات"
        continueText={isEdit ? "الذهاب لتفاصيل المجموعة" : "إضافة مجموعة أخرى"}
        onContinue={() => {
          if (isEdit && groupId) {
            router.push(`/groups/${groupId}`);
          } else {
            setFormData({
              name: "",
              classId: defaultClassId || classesList[0]?.id || "",
              price: 0,
              hasCenter: false,
              centerSessionPrice: undefined,
              status: "active",
              schedule: [{ day: "saturday", startTime: "16:00", endTime: "18:00" }],
            });
            setFieldErrors({});
          }
        }}
        showSuccessModal={true}
        successModalTitle={isEdit ? "تم تحديث المجموعة بنجاح" : "تم حفظ المجموعة بنجاح"}
        successModalDescription={
          isEdit
            ? "تم حفظ التعديلات الجديدة على بيانات ومواعيد المجموعة بنجاح."
            : "تم تسجيل المجموعة بنجاح. يمكنك المتابعة لإضافة مجموعة أخرى أو الانتقال لجدول المجموعات."
        }
        onDelete={isEdit && groupId ? handleDelete : undefined}
        deleteText="حذف المجموعة الدراسية"
        isDeleting={isDeleting}
        columns={2}
      >
        {/* Notice for Price Preservation in Edit Mode */}
        {isEdit && (
          <div className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-text flex items-start gap-3 shadow-sm">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-text text-sm">ملاحظة هامة بشأن تعديل السعر الشهري:</h4>
              <p className="text-xs text-muted leading-relaxed">
                تعديل السعر الشهري للمجموعة لن يغيّر تلقائياً السعر النهائي (
                <span className="font-semibold text-text">finalPrice</span>) أو الخصومات الفردية
                الممنوحة للطلاب المسجلين مسبقاً في هذه المجموعة. السعر الجديد سيُعتمد فقط كسعر
                افتراضي للطلاب الجدد عند إضافتهم لاحقاً.
              </p>
            </div>
          </div>
        )}

        {/* Group Name */}
        <Input
          id="name"
          name="name"
          label="اسم المجموعة"
          required
          placeholder="مثال: مجموعة أ - سنتر النور، مجموعة الأحد والأربعاء..."
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (fieldErrors.name) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }
          }}
          error={fieldErrors.name}
          sizeVariant="md"
        />

        {/* Class Selection */}
        <Select
          id="classId"
          name="classId"
          label="الصف الدراسي التابعة له"
          required
          value={formData.classId}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, classId: e.target.value }));
            if (fieldErrors.classId) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.classId;
                return next;
              });
            }
          }}
          error={fieldErrors.classId}
          sizeVariant="md"
        >
          {classesList.length === 0 ? (
            <option value="">لا توجد صفوف دراسية بعد - أنشئ صفاً أولاً</option>
          ) : (
            classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))
          )}
        </Select>

        {/* Monthly Price */}
        <Input
          id="price"
          name="price"
          type="number"
          min="0"
          step="any"
          label="السعر الشهري الافتراضي (ج.م)"
          required
          placeholder="0"
          value={formData.price.toString()}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }));
            if (fieldErrors.price) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.price;
                return next;
              });
            }
          }}
          error={fieldErrors.price}
          leftIcon={<DollarSign className="w-4 h-4 text-slate-400" />}
          sizeVariant="md"
        />

        {/* Status */}
        <Select
          id="status"
          name="status"
          label="حالة المجموعة"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              status: e.target.value as "active" | "archived",
            }))
          }
          searchable={false}
          sizeVariant="md"
        >
          <option value="active">نشطة (متاحة لإضافة طلاب وتسجيل حضور)</option>
          <option value="archived">مؤرشفة (مغلقة)</option>
        </Select>

        {/* Center Educational Settings */}
        <div className="md:col-span-2 space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-text">إعدادات السنتر التعليمي</h3>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-border/70 p-3.5 bg-surface/40 hover:bg-surface/70 transition-colors">
            <input
              type="checkbox"
              checked={formData.hasCenter}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hasCenter: e.target.checked,
                  centerSessionPrice: e.target.checked ? prev.centerSessionPrice || 0 : undefined,
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
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

          {formData.hasCenter && (
            <div className="max-w-md animate-in fade-in duration-200">
              <Input
                id="centerSessionPrice"
                name="centerSessionPrice"
                type="number"
                min="0"
                step="any"
                label="سعر حصة السنتر للطالب (ج.م)"
                placeholder="مثال: 15"
                value={
                  formData.centerSessionPrice !== undefined
                    ? formData.centerSessionPrice.toString()
                    : ""
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    centerSessionPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                error={fieldErrors.centerSessionPrice}
                leftIcon={<DollarSign className="w-4 h-4 text-slate-400" />}
                sizeVariant="md"
              />
              <p className="text-[11px] text-muted mt-1">
                المبلغ المستحق للسنتر عن حضور الطالب في الحصة الواحدة.
              </p>
            </div>
          )}
        </div>

        {/* Weekly Schedule Section */}
        <div className="md:col-span-2 space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-text">جدول مواعيد الحصص الأسبوعي</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddScheduleSlot}
              className="gap-1.5 font-bold text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة موعد</span>
            </Button>
          </div>

          {fieldErrors.schedule && (
            <p className="text-xs text-danger font-semibold">{fieldErrors.schedule}</p>
          )}

          <div className="space-y-3">
            {formData.schedule.map((slot, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-surface/30 hover:bg-surface/60 transition-colors"
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
                    value={slot.day}
                    onChange={(e) =>
                      handleUpdateScheduleSlot(index, "day", e.target.value as DayOfWeekValue)
                    }
                    searchable={false}
                    sizeVariant="md"
                  >
                    {DAYS_LIST.map((dayKey) => (
                      <option key={dayKey} value={dayKey}>
                        يوم {DAY_LABELS[dayKey]}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Start Time */}
                <div className="flex-1">
                  <TimePicker
                    value={slot.startTime}
                    onChange={(e) => handleUpdateScheduleSlot(index, "startTime", e.target.value)}
                  />
                </div>

                {/* Arrow separator */}
                <div className="hidden sm:flex items-center text-muted px-1">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </div>

                {/* End Time */}
                <div className="flex-1">
                  <TimePicker
                    value={slot.endTime}
                    onChange={(e) => handleUpdateScheduleSlot(index, "endTime", e.target.value)}
                  />
                </div>

                {/* Delete slot button */}
                <div className="flex items-center justify-end sm:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={formData.schedule.length <= 1}
                    onClick={() => handleRemoveScheduleSlot(index)}
                    className="text-muted hover:text-danger hover:bg-danger/10 h-9 w-9 p-0 disabled:opacity-40"
                    title={
                      formData.schedule.length <= 1
                        ? "يجب بقاء موعد واحد على الأقل"
                        : "حذف هذا الموعد"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              تأكد من ضبط توقيت البداية والنهاية بنظام 24 ساعة بدقة.
            </span>
            <span>عدد الحصص الأسبوعية: {formData.schedule.length}</span>
          </div>
        </div>

        {/* Live Preview Section */}
        {formData.name.trim() && (
          <div className="md:col-span-2 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Users className="w-4 h-4" />
                <span>معاينة فورية (Live Preview)</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedClassName && (
                  <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-text">
                    <Layers className="h-3 w-3 text-muted" />
                    {selectedClassName}
                  </span>
                )}
                <Badge variant={formData.status === "active" ? "success" : "default"} size="sm">
                  {formData.status === "active" ? "نشطة" : "مؤرشفة"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-primary/10 pt-2">
              <div>
                <h4 className="font-bold text-sm text-text">{formData.name}</h4>
                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                  <span>
                    السعر الشهري: <strong className="text-text">{formData.price} ج.م</strong>
                  </span>
                  {formData.hasCenter && (
                    <span className="text-amber-700 dark:text-amber-300">
                      سنتر ({formData.centerSessionPrice || 0} ج/حصة)
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule tags preview */}
              <div className="flex flex-wrap gap-1">
                {formData.schedule.map((sch, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-text"
                  >
                    <Calendar className="h-2.5 w-2.5 text-primary" />
                    {DAY_LABELS[sch.day]} {sch.startTime} - {sch.endTime}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </EntityForm>
    </div>
  );
}

export default GroupForm;
