"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateClass } from "@/lib/actions/classes";
import { classSchema, type ClassFormData } from "@/lib/validators/class";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import { Edit2 } from "lucide-react";

interface EditClassFormProps {
  classId: string;
  initialData: {
    name: string;
    description?: string;
    status: "active" | "archived";
  };
}

export function EditClassForm({ classId, initialData }: EditClassFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: initialData.name,
      description: initialData.description || "",
      status: initialData.status,
    },
  });

  const onSubmit = async (data: ClassFormData) => {
    setIsLoading(true);
    try {
      const res = await updateClass(classId, data);
      if (!res.success) {
        toast.error(res.error || "فشل تعديل بيانات الصف الدراسي");
        return;
      }

      toast.success("تم تحديث بيانات الصف الدراسي بنجاح!");
      router.push(`/classes/${classId}`);
      router.refresh();
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-surface shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Edit2 className="h-5 w-5 text-primary" />
          <span>تعديل بيانات الصف</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted">
          تعديل الاسم، الوصف، أو تغيير حالة الصف الدراسي.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Class Name */}
          <FormField id="name" label="اسم الصف الدراسي" required error={errors.name?.message}>
            <Input id="name" error={!!errors.name} disabled={isLoading} {...register("name")} />
          </FormField>

          {/* Description */}
          <FormField id="description" label="الوصف والملاحظات" error={errors.description?.message}>
            <Textarea
              id="description"
              error={!!errors.description}
              disabled={isLoading}
              rows={3}
              {...register("description")}
            />
          </FormField>

          {/* Status */}
          <FormField id="status" label="الحالة" error={errors.status?.message}>
            <Select id="status" disabled={isLoading} {...register("status")}>
              <option value="active">نشط (Active)</option>
              <option value="archived">مؤرشف (Archived)</option>
            </Select>
          </FormField>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href={`/classes/${classId}`}>
              <Button variant="outline" type="button" disabled={isLoading}>
                إلغاء
              </Button>
            </Link>
            <Button type="submit" isLoading={isLoading} className="font-bold px-6">
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
