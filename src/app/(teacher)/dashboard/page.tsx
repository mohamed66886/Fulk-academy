import Link from "next/link";
import { getTeacherDashboardData } from "@/lib/actions/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Layers,
  CalendarCheck,
  CreditCard,
  Clock,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const result = await getTeacherDashboardData();

  const data = result.data || {
    cairoDate: {
      dayOfWeek: "monday",
      formattedDate: "",
      arabicDayName: "اليوم",
      arabicFormattedDate: "",
    },
    teacherName: "المدرس",
    stats: {
      totalStudents: 0,
      totalGroups: 0,
      todayAttendance: 0,
      duePaymentsAmount: 0,
      duePaymentsCount: 0,
    },
    todaySessions: [],
  };

  const { cairoDate, teacherName, stats, todaySessions } = data;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Welcome & Timezone Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <span>مرحبًا، {teacherName}</span>
            <Sparkles className="h-5 w-5 text-warning" />
          </h1>
          <p className="text-xs text-muted mt-1">
            لوحة المتابعة اليومية — ملخص الطلاب، الحصص المجدولة، والتحصيل المالي.
          </p>
        </div>

        {/* Cairo Timezone Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-border bg-surface px-3.5 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <div className="text-xs flex items-center gap-1.5 font-medium">
            <span className="text-text font-bold">{cairoDate.arabicDayName}</span>
            <span className="text-muted">({cairoDate.arabicFormattedDate})</span>
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold mr-1">
              توقيت مصر
            </span>
          </div>
        </div>
      </div>

      {/* 1. Top Aggregated Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Students */}
        <Link href="/students" className="block group">
          <Card className="hover:border-primary/50 transition-all group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted">إجمالي الطلاب</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-text">{stats.totalStudents}</div>
              <p className="text-[11px] text-muted mt-1 flex items-center justify-between">
                <span>طالب نشط مسجل</span>
                <ArrowLeft className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Stat 2: Total Groups */}
        <Link href="/groups" className="block group">
          <Card className="hover:border-primary/50 transition-all group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted">عدد المجموعات</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground group-hover:scale-105 transition-transform">
                <Layers className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-text">{stats.totalGroups}</div>
              <p className="text-[11px] text-muted mt-1 flex items-center justify-between">
                <span>مجموعة دراسية نشطة</span>
                <ArrowLeft className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Stat 3: Today's Attendance */}
        <Link href="/attendance" className="block group">
          <Card className="hover:border-success/50 transition-all group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted">حضور اليوم</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success group-hover:scale-105 transition-transform">
                <CalendarCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-success">{stats.todayAttendance}</div>
              <p className="text-[11px] text-muted mt-1 flex items-center justify-between">
                <span>طالب تم مسح حضوره اليوم</span>
                <ArrowLeft className="h-3.5 w-3.5 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Stat 4: Due Payments */}
        <Link href="/payments" className="block group">
          <Card className="hover:border-warning/50 transition-all group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted">المبالغ المستحقة</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning group-hover:scale-105 transition-transform">
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-warning">
                {stats.duePaymentsAmount.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-normal text-muted">ج.م</span>
              </div>
              <p className="text-[11px] text-muted mt-1 flex items-center justify-between">
                <span>
                  {stats.duePaymentsCount > 0
                    ? `${stats.duePaymentsCount} اشتراك غير مسدد`
                    : "لا توجد متأخرات"}
                </span>
                <ArrowLeft className="h-3.5 w-3.5 text-warning opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 2. Today's Classes / Sessions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text">حصص اليوم</h2>
            <Badge variant="primary" size="sm">
              {todaySessions.length} {todaySessions.length === 1 ? "حصة" : "حصص"}
            </Badge>
          </div>

          <Link href="/attendance">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>سجل الحضور الكامل</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Sessions Content */}
        {todaySessions.length === 0 ? (
          <Card className="border-dashed border-border bg-surface/50 p-8 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2 text-muted">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted">
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-text">
                لا توجد حصص مجدولة اليوم ({cairoDate.arabicDayName})
              </p>
              <p className="text-xs text-muted leading-relaxed">
                لا توجد مجموعات لديها مواعيد مسجلة اليوم وفق جدول المواعيد بتوقيت مصر.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySessions.map((session) => (
              <Card
                key={session.groupId}
                className="hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold">{session.groupName}</CardTitle>
                      <p className="text-xs text-primary font-medium mt-0.5">{session.className}</p>
                    </div>
                    <Badge variant="default" size="sm">
                      {session.studentCount} طالب
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 space-y-4">
                  {/* Time info */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-text bg-secondary/50 px-3 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>{session.formattedTime}</span>
                  </div>

                  {/* Action Button linking to attendance page with preselected groupId */}
                  <Link href={`/attendance?groupId=${session.groupId}`} className="block w-full">
                    <Button size="md" className="w-full gap-2 font-bold shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>بدء الحضور</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
