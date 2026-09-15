import Link from "next/link";
import { getSuperAdminDashboardStats } from "@/lib/actions/teachers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Layers,
  UserPlus,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const result = await getSuperAdminDashboardStats();
  const stats = result.stats || {
    totalTeachers: 0,
    activeTeachers: 0,
    disabledTeachers: 0,
    totalStudents: 0,
    totalGroups: 0,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              لوحة تحكم المسؤول العام
            </h1>
            <Badge variant="primary" dot>
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            إحصائيات شاملة ومؤشرات أداء منصة فُلك أكاديمي لإدارة المدرسين.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/super-admin/teachers/create">
            <Button size="md" className="gap-2 shadow-sm font-bold">
              <UserPlus className="h-4 w-4" />
              <span>إضافة مدرس جديد</span>
            </Button>
          </Link>
          <Link href="/super-admin/teachers">
            <Button variant="outline" size="md" className="gap-1.5">
              <span>عرض المدرسين</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistical Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Teachers */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">إجمالي المدرسين</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{stats.totalTeachers}</div>
            <p className="text-[11px] text-muted mt-1">حسابات مدرسين مسجلة</p>
          </CardContent>
        </Card>

        {/* Card 2: Active Teachers */}
        <Card className="hover:border-success/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">المدرسين النشطين</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeTeachers}</div>
            <p className="text-[11px] text-muted mt-1">حسابات نشطة وتعمل</p>
          </CardContent>
        </Card>

        {/* Card 3: Disabled Teachers */}
        <Card className="hover:border-danger/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">الحسابات الموقوفة</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <UserX className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{stats.disabledTeachers}</div>
            <p className="text-[11px] text-muted mt-1">ممنوعون من الدخول</p>
          </CardContent>
        </Card>

        {/* Card 4: Total Students */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">إجمالي الطلاب</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{stats.totalStudents}</div>
            <p className="text-[11px] text-muted mt-1">طالب مسجل بالمنصة</p>
          </CardContent>
        </Card>

        {/* Card 5: Total Groups */}
        <Card className="hover:border-secondary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted">عدد المجموعات</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{stats.totalGroups}</div>
            <p className="text-[11px] text-muted mt-1">مجموعة تعليمية نشطة</p>
          </CardContent>
        </Card>
      </div>

      {/* Security & Multi-Tenant Info Banner */}
      <Card className="bg-surface border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>نظام عزل البيانات المتعدد (Multi-Tenant Isolation)</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 text-xs text-muted leading-relaxed">
          جميع بيانات الطلاب، الامتحانات، الدرجات، والمدفوعات معزولة بالكامل تحت مسار كل مدرس (
          <code className="font-mono text-[11px] bg-secondary px-1.5 py-0.5 rounded text-text">
            teachers/{"{teacherId}"}
          </code>
          ). المسؤول العام يشرف على الحسابات والأرقام الإجمالية دون الاطلاع على التفاصيل الخاصة
          بالطلاب احترامًا لخصوصية كل أكاديمية.
        </CardContent>
      </Card>
    </div>
  );
}
