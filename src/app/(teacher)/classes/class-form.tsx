"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/use-cached-data";
import { createClass, updateClass, deleteClass } from "@/lib/actions/classes";
import { classSchema, type ClassFormData } from "@/lib/validators/class";
import { EntityForm } from "@/components/ui/EntityForm";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { GraduationCap } from "lucide-react";

export interface ClassFormProps {
  initialData?: {
    id?: string;
    name: string;
    description?: string;
    status: "active" | "archived";
  };
  isEdit?: boolean;
}

export function ClassForm({ initialData, isEdit = false }: ClassFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const classId = initialData?.id;

  const [formData, setFormData] = React.useState<ClassFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    status: initialData?.status || "active",
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSubmit = async () => {
    // Client-side validation with Zod
    const validation = classSchema.safeParse(formData);
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

    try {
      if (isEdit && classId) {
        const res = await updateClass(classId, validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل تعديل بيانات الصف الدراسي" };
        }
        toast.success("تم تحديث بيانات الصف بنجاح!");
        queryClient.invalidateQueries({ queryKey: queryKeys.classes() });
        return { success: true };
      } else {
        const res = await createClass(validation.data);
        if (!res.success) {
          return { success: false, error: res.error || "فشل إنشاء الصف الدراسي" };
        }
        toast.success("تم إنشاء الصف الدراسي بنجاح!");
        queryClient.invalidateQueries({ queryKey: queryKeys.classes() });
        return { success: true };
      }
    } catch {
      return { success: false, error: "حدث خطأ غير متوقع أثناء الحفظ" };
    }
  };

  const handleDelete = async () => {
    if (!classId) return;
    setIsDeleting(true);
    try {
      const res = await deleteClass(classId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الصف الدراسي");
        return;
      }
      toast.success("تم نقل الصف الدراسي إلى سلة المحذوفات بنجاح");
      queryClient.invalidateQueries({ queryKey: queryKeys.classes() });
      router.push("/classes");
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      <EntityForm
        title={isEdit ? "تعديل بيانات الصف الدراسي" : "إضافة صف دراسي جديد"}
        description={
          isEdit
            ? "تعديل مسمى الصف الدراسي، الوصف، أو تغيير حالة التفعيل."
            : "تعريف مرحلة أو صف دراسي جديد لتنظيم المجموعات وقوائم الطلاب."
        }
        icon={GraduationCap}
        iconColor="text-primary"
        badge={
          isEdit ? (
            <Badge variant={formData.status === "active" ? "success" : "default"} size="sm">
              {formData.status === "active" ? "نشط" : "مؤرشف"}
            </Badge>
          ) : undefined
        }
        isEdit={isEdit}
        onSubmit={handleSubmit}
        submitText={isEdit ? "حفظ التعديلات" : "حفظ الصف الدراسي"}
        cancelHref={isEdit && classId ? `/classes/${classId}` : "/classes"}
        previewHref="/classes"
        tableHref="/classes"
        previewText="معاينة قائمة الصفوف"
        continueText={isEdit ? "الذهاب لتفاصيل الصف" : "إضافة صف دراسي آخر"}
        onContinue={() => {
          if (isEdit && classId) {
            router.push(`/classes/${classId}`);
          } else {
            setFormData({ name: "", description: "", status: "active" });
            setFieldErrors({});
          }
        }}
        showSuccessModal={true}
        successModalTitle={isEdit ? "تم تحديث الصف بنجاح" : "تم حفظ الصف بنجاح"}
        successModalDescription={
          isEdit
            ? "تم حفظ التعديلات الجديدة على بيانات الصف الدراسي في النظام بنجاح."
            : "تم تسجيل الصف الدراسي بنجاح. يمكنك المتابعة لإضافة صف آخر أو الانتقال لجدول الصفوف."
        }
        onDelete={isEdit && classId ? handleDelete : undefined}
        deleteText="حذف الصف الدراسي"
        isDeleting={isDeleting}
        columns={2}
      >
        {/* Class Name */}
        <Input
          id="name"
          name="name"
          label="اسم الصف الدراسي"
          required
          placeholder="مثال: الصف الأول الثانوي، الصف الثالث الإعدادي..."
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

        {/* Status */}
        <Select
          id="status"
          name="status"
          label="حالة الصف"
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
          <option value="active">نشط (Active)</option>
          <option value="archived">مؤرشف (Archived)</option>
        </Select>

        {/* Description / Notes */}
        <div className="flex flex-col gap-1 text-right md:col-span-2">
          <label
            htmlFor="description"
            className="text-xs font-semibold text-gray-700 dark:text-gray-200"
          >
            الوصف والملاحظات (اختياري)
          </label>
          <Textarea
            id="description"
            name="description"
            placeholder="أدخل أي ملاحظات إضافية تخص هذا الصف أو المنهج الدراسي..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <p className="text-xs text-muted">نبذة توضيحية عن الصف الدراسي لتسهيل التعرف عليه.</p>
        </div>

        {/* Live Preview Section */}
        {formData.name.trim() && (
          <div className="md:col-span-2 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <span>معاينة فورية (Live Preview)</span>
              </div>
              <Badge variant={formData.status === "active" ? "success" : "default"} size="sm">
                {formData.status === "active" ? "نشط" : "مؤرشف"}
              </Badge>
            </div>
            <h4 className="font-bold text-sm text-text">{formData.name}</h4>
            {formData.description && (
              <p className="text-xs text-muted leading-relaxed line-clamp-2">
                {formData.description}
              </p>
            )}
          </div>
        )}
      </EntityForm>
    </div>
  );
}

export default ClassForm;
