"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClass } from "@/lib/actions/classes";
import { classSchema, type ClassFormData } from "@/lib/validators/class";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";

export default function CreateClassPage() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Optimistic preview state
  const [optimisticItem, setOptimisticItem] = React.useOptimistic<
    ClassFormData | null,
    ClassFormData | null
  >(null, (_, newClass) => newClass);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  const formValues = watch();

  const onSubmit = async (data: ClassFormData) => {
    startTransition(async () => {
      // Set optimistic UI item immediately before server round-trip
      setOptimisticItem(data);

      try {
        const res = await createClass(data);
        if (!res.success) {
          toast.error(res.error || "فشل إنشاء الصف الدراسي");
          setOptimisticItem(null); // rollback
          return;
        }

        toast.success("تم إنشاء الصف الدراسي بنجاح!");
        router.push("/classes");
        router.refresh();
      } catch {
        toast.error("حدث خطأ غير متوقع أثناء الحفظ");
        setOptimisticItem(null); // rollback
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/classes">
            <Button variant="ghost" size="sm" className="gap-1 p-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              إضافة صف دراسي جديد
            </h1>
            <p className="text-xs text-muted mt-1">
              تعريف مرحلة أو صف دراسي جديد لتنظيم المجموعات وقوائم الطلاب.
            </p>
          </div>
        </div>
      </div>

      {/* Optimistic Live Preview Card */}
      {formValues.name && (
        <Card className="border-primary/30 bg-primary/5 transition-all animate-in fade-in-50">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary">معاينة فورية (Live Preview)</span>
              </div>
              <Badge variant={formValues.status === "active" ? "success" : "default"} size="sm">
                {formValues.status === "active" ? "نشط" : "مؤرشف"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <h4 className="text-sm font-bold text-text">{formValues.name}</h4>
            {formValues.description && (
              <p className="text-xs text-muted mt-1">{formValues.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Card */}
      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>بيانات الصف الدراسي</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted">
            أدخل اسم الصف بوضوح (مثال: الصف الأول الثانوي، الصف الثالث الإعدادي).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Class Name */}
            <FormField id="name" label="اسم الصف الدراسي" required error={errors.name?.message}>
              <Input
                id="name"
                placeholder="مثال: الصف الثاني الثانوي"
                error={!!errors.name}
                disabled={isPending}
                {...register("name")}
              />
            </FormField>

            {/* Description */}
            <FormField
              id="description"
              label="الوصف والملاحظات (اختياري)"
              error={errors.description?.message}
              description="نبذة توضيحية عن الصف أو المنهج الدراسي."
            >
              <Textarea
                id="description"
                placeholder="أدخل أي ملاحظات إضافية تخص هذا الصف..."
                error={!!errors.description}
                disabled={isPending}
                rows={3}
                {...register("description")}
              />
            </FormField>

            {/* Status */}
            <FormField id="status" label="الحالة" error={errors.status?.message}>
              <Select id="status" disabled={isPending} {...register("status")}>
                <option value="active">نشط (Active)</option>
                <option value="archived">مؤرشف (Archived)</option>
              </Select>
            </FormField>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link href="/classes">
                <Button variant="outline" type="button" disabled={isPending}>
                  إلغاء
                </Button>
              </Link>
              <Button
                type="submit"
                isLoading={isPending || !!optimisticItem}
                className="font-bold px-6"
              >
                حفظ الصف الدراسي
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
