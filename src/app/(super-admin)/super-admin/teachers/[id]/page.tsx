import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherDetails } from "@/lib/actions/teachers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeacherStatusToggle } from "./status-toggle";
import {
  ArrowRight,
  BookOpen,
  Mail,
  Phone,
  Calendar,
  Layers,
  GraduationCap,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface TeacherDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function TeacherDetailsPage({ params }: TeacherDetailsPageProps) {
  const result = await getTeacherDetails(params.id);

  if (!result.success || !result.teacher) {
    notFound();
  }

  const { teacher, counts } = result;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/teachers">
            <Button variant="ghost" size="sm" className="gap-1 p-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-text tracking-tight">{teacher.name}</h1>
              {teacher.status === "active" ? (
                <Badge variant="success" dot>
                  حساب نشط
                </Badge>
              ) : (
                <Badge variant="danger" dot>
                  حساب موقوف
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-1 font-mono">معرّف المدرس: {teacher.id}</p>
          </div>
        </div>

        {/* Status Toggle Action Button */}
        <div className="flex items-center gap-2">
          <TeacherStatusToggle teacherId={teacher.id} currentStatus={teacher.status} />
        </div>
      </div>

      {/* Teacher Profile Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-border bg-surface">
          <CardHeader className="pb-3 text-center flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl border-2 border-primary/20 mb-3 shadow-inner">
              {teacher.name.slice(0, 2)}
            </div>
            <CardTitle className="text-lg font-bold">{teacher.name}</CardTitle>
            <p className="text-xs text-primary font-medium">{teacher.subject}</p>
          </CardHeader>

          <CardContent className="space-y-3 pt-2 text-xs border-t border-border">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>البريد الإلكتروني:</span>
              </span>
              <span className="font-mono text-text">{teacher.email}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>رقم الهاتف:</span>
              </span>
              <span className="font-mono text-text">{teacher.phone}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>المادة الأساسية:</span>
              </span>
              <span className="font-semibold text-text">{teacher.subject}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>تاريخ التسجيل:</span>
              </span>
              <span className="text-text font-mono">
                {new Date(teacher.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Aggregated Counters (Read-Only Summary) */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Classes Count */}
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted">الصفوف الدراسية</CardTitle>
                <FolderKanban className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-text">{counts?.classes ?? 0}</div>
                <p className="text-[11px] text-muted mt-1">صف دراسي مسجل</p>
              </CardContent>
            </Card>

            {/* Groups Count */}
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted">المجموعات</CardTitle>
                <Layers className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-text">{counts?.groups ?? 0}</div>
                <p className="text-[11px] text-muted mt-1">مجموعة تعليمية نشطة</p>
              </CardContent>
            </Card>

            {/* Students Count */}
            <Card className="hover:border-success/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted">إجمالي الطلاب</CardTitle>
                <GraduationCap className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-success">{counts?.students ?? 0}</div>
                <p className="text-[11px] text-muted mt-1">طالب مسجل مع المدرس</p>
              </CardContent>
            </Card>
          </div>

          {/* Strict Tenant Isolation Notice */}
          <Card className="border-border bg-secondary/20">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>حماية الخصوصية وعزل بيانات المستأجر (Tenant Isolation)</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted leading-relaxed">
              وفق سياسة أمان المنصة وقواعد Firestore Security Rules، لا يحق للمسؤول العام الاطلاع
              على قوائم الطلاب الفردية، نتائج الاختبارات، أو سجلات المدفوعات والاشتراكات المالية
              الخاصة بالمدرس. تُعرض فقط المؤشرات الإجمالية لدعم الرقابة الفنية وإدارة الحسابات.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
