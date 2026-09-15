"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeacherAccount } from "@/lib/actions/teachers";
import { createTeacherSchema, type CreateTeacherFormData } from "@/lib/validators/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import {
  ArrowRight,
  UserPlus,
  Mail,
  Lock,
  Phone,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";

export default function CreateTeacherPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      subject: "",
      photoUrl: "",
    },
  });

  const onSubmit = async (data: CreateTeacherFormData) => {
    setIsLoading(true);
    try {
      const res = await createTeacherAccount(data);
      if (!res.success) {
        toast.error(res.error || "حدث خطأ أثناء إنشاء حساب المدرس");
        return;
      }

      toast.success("تم إنشاء حساب المدرس بنجاح!");
      router.push("/super-admin/teachers");
      router.refresh();
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/teachers">
            <Button variant="ghost" size="sm" className="gap-1 p-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">إضافة مدرس جديد</h1>
            <p className="text-xs text-muted mt-1">
              إنشاء حساب معتمد جديد وتعيين بيانات الدخول وصلاحيات المدرس.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>بيانات المدرس والاعتماد</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted">
            سيتم إنشاء الحساب في Firebase Auth مع تعيين الدور كمدرس وإعداد مسار البيانات المخصص له.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField id="name" label="اسم المدرس ثلاثي" required error={errors.name?.message}>
              <Input
                id="name"
                placeholder="مثال: أ. محمد أحمد محمود"
                error={!!errors.name}
                disabled={isLoading}
                {...register("name")}
              />
            </FormField>

            {/* Email & Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="email"
                label="البريد الإلكتروني (لتسجيل الدخول)"
                required
                error={errors.email?.message}
              >
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher@example.com"
                    dir="ltr"
                    className="pl-9 font-mono text-left"
                    error={!!errors.email}
                    disabled={isLoading}
                    {...register("email")}
                  />
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>

              <FormField
                id="password"
                label="كلمة المرور المؤقتة"
                required
                error={errors.password?.message}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    dir="ltr"
                    className="pl-9 font-mono text-left"
                    error={!!errors.password}
                    disabled={isLoading}
                    {...register("password")}
                  />
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>
            </div>

            {/* Phone & Subject Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="phone" label="رقم الهاتف" required error={errors.phone?.message}>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    dir="ltr"
                    className="pl-9 font-mono text-left"
                    error={!!errors.phone}
                    disabled={isLoading}
                    {...register("phone")}
                  />
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>

              <FormField
                id="subject"
                label="المادة التعليمية"
                required
                error={errors.subject?.message}
              >
                <div className="relative">
                  <Input
                    id="subject"
                    placeholder="مثال: الرياضيات / الفيزياء"
                    error={!!errors.subject}
                    disabled={isLoading}
                    {...register("subject")}
                  />
                  <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </FormField>
            </div>

            {/* Photo URL */}
            <FormField
              id="photoUrl"
              label="رابط الصورة الشخصية (اختياري)"
              error={errors.photoUrl?.message}
              description="يمكن إدخال رابط مباشر لصورة المدرس إن توفر."
            >
              <div className="relative">
                <Input
                  id="photoUrl"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  dir="ltr"
                  className="pl-9 font-mono text-left"
                  error={!!errors.photoUrl}
                  disabled={isLoading}
                  {...register("photoUrl")}
                />
                <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </FormField>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link href="/super-admin/teachers">
                <Button variant="outline" type="button" disabled={isLoading}>
                  إلغاء
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading} className="font-bold px-6">
                إنشاء حساب المدرس
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
