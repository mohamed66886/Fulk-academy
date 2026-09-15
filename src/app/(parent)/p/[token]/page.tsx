"use client";

import * as React from "react";
import Image from "next/image";
import {
  CalendarCheck,
  CreditCard,
  Award,
  AlertCircle,
  Clock,
  User,
  BookOpen,
  Users,
  GraduationCap,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  startTime?: string;
  status: "present" | "absent" | "late";
}

interface PaymentRecord {
  id: string;
  month: string;
  status: "paid" | "partial" | "unpaid";
  remaining: number;
}

interface ExamRecord {
  id: string;
  examName: string;
  examDate: string;
  grade: number;
  finalGrade: number;
  percentage: number;
}

interface ParentPortalData {
  student: {
    name: string;
    className: string;
    groupName: string;
    teacherName: string;
    subject: string;
    photoUrl?: string;
  };
  attendance: {
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    totalSessions: number;
    lastAttendance: {
      date: string;
      status: "present" | "absent" | "late";
    } | null;
    records: AttendanceRecord[];
  };
  payments: PaymentRecord[];
  exams: ExamRecord[];
}

interface ParentPortalPageProps {
  params: {
    token: string;
  };
}

function formatArabicMonth(monthStr: string): string {
  if (!monthStr) return "—";
  const parts = monthStr.split("-");
  if (parts.length < 2 || !parts[0] || !parts[1]) return monthStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  const name = monthNames[month - 1];
  return name ? `${name} ${year}` : monthStr;
}

function formatArabicDate(dateStr: string): string {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("ar-EG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function ParentPortalPage({ params }: ParentPortalPageProps) {
  const [data, setData] = React.useState<ParentPortalData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/p/${encodeURIComponent(params.token)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "الرابط غير صالح أو منتهي");
      } else {
        setData(json);
      }
    } catch {
      setError("الرابط غير صالح أو منتهي");
    } finally {
      setIsLoading(false);
    }
  }, [params.token]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-36 rounded-2xl bg-surface border border-border" />
        {/* Tabs Skeleton */}
        <div className="h-12 rounded-xl bg-surface border border-border" />
        {/* Metrics Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-surface border border-border" />
          <div className="h-24 rounded-xl bg-surface border border-border" />
        </div>
        {/* Content Skeleton */}
        <div className="h-44 rounded-2xl bg-surface border border-border" />
      </div>
    );
  }

  // Error State: "الرابط غير صالح أو منتهي"
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 text-danger border border-danger/20 shadow-inner">
          <AlertCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-black tracking-tight text-text">الرابط غير صالح أو منتهي</h1>
          <p className="text-sm text-muted leading-relaxed">
            عفواً، لا يمكن الوصول إلى بيانات الطالب. قد يكون الرابط المدخل غير صحيح أو تم إيقافه من
            قبل إدارة الأكاديمية.
          </p>
        </div>

        <div className="pt-2 flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-xs text-muted/80 bg-surface border border-border rounded-xl p-3 w-full">
            💡 يرجى مراجعة المعلم أو إدارة المركز للحصول على رابط صالح.
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-secondary hover:bg-secondary/80 text-text transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  const { student, attendance, payments, exams } = data;

  return (
    <div className="space-y-5">
      {/* 1. Student Identity Header Card */}
      <Card className="overflow-hidden border-border/80 bg-surface shadow-xs rounded-2xl">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {student.photoUrl ? (
                <Image
                  src={student.photoUrl}
                  alt={student.name}
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-14 w-14 rounded-2xl object-cover border border-border shadow-xs"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs font-black text-xl">
                  {student.name.charAt(0) || <User className="h-7 w-7" />}
                </div>
              )}

              <div className="space-y-1 text-right">
                <h1 className="text-xl sm:text-2xl font-black text-text leading-tight">
                  {student.name}
                </h1>
                <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {student.teacherName}
                    {student.subject ? ` — مادة ${student.subject}` : ""}
                  </span>
                </p>
              </div>
            </div>

            <Badge variant="success" dot className="shrink-0 text-xs px-2.5 py-1">
              طالب مقيّد
            </Badge>
          </div>

          {/* Academic Placement Tags */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate text-right">
                <span className="block text-[10px] text-muted font-medium">الصف الدراسي</span>
                <span className="text-xs font-bold text-text truncate block">
                  {student.className}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate text-right">
                <span className="block text-[10px] text-muted font-medium">المجموعة</span>
                <span className="text-xs font-bold text-text truncate block">
                  {student.groupName}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Navigation Tabs */}
      <Tabs defaultValue="attendance" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-surface border border-border shadow-xs rounded-xl">
          <TabsTrigger
            value="attendance"
            className="flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold"
          >
            <CalendarCheck className="h-4 w-4 shrink-0" />
            <span>الحضور</span>
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold"
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>المصاريف</span>
          </TabsTrigger>
          <TabsTrigger
            value="exams"
            className="flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold"
          >
            <Award className="h-4 w-4 shrink-0" />
            <span>الامتحانات</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= Tab 1: Attendance ================= */}
        <TabsContent value="attendance" className="space-y-4 focus-visible:outline-none">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Attendance Rate */}
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl border border-border bg-surface flex flex-col justify-between shadow-xs">
              <span className="text-xs font-bold text-muted">نسبة الالتزام بالحضور</span>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-3xl font-black",
                    attendance.attendanceRate >= 85
                      ? "text-success"
                      : attendance.attendanceRate >= 70
                        ? "text-warning"
                        : "text-danger"
                  )}
                >
                  {attendance.attendanceRate}%
                </span>
                <span className="text-[11px] text-muted">من {attendance.totalSessions} حصة</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    attendance.attendanceRate >= 85
                      ? "bg-success"
                      : attendance.attendanceRate >= 70
                        ? "bg-warning"
                        : "bg-danger"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, attendance.attendanceRate))}%` }}
                />
              </div>
            </div>

            {/* Present Count */}
            <div className="p-4 rounded-2xl border border-success/20 bg-success/5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-muted">أيام الحضور</span>
                <h3 className="text-2xl font-black text-text mt-0.5">
                  {attendance.presentCount}{" "}
                  <span className="text-xs font-medium text-muted">يوم</span>
                </h3>
              </div>
            </div>

            {/* Absent Count */}
            <div className="p-4 rounded-2xl border border-danger/20 bg-danger/5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-muted">أيام الغياب</span>
                <h3 className="text-2xl font-black text-text mt-0.5">
                  {attendance.absentCount}{" "}
                  <span className="text-xs font-medium text-muted">يوم</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Last Recorded Session */}
          {attendance.lastAttendance && (
            <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted shrink-0" />
                <span className="text-xs text-muted">آخر حصة مسجلة:</span>
                <span className="text-xs font-bold text-text">
                  {formatArabicDate(attendance.lastAttendance.date)}
                </span>
              </div>
              <Badge
                variant={
                  attendance.lastAttendance.status === "present"
                    ? "success"
                    : attendance.lastAttendance.status === "late"
                      ? "warning"
                      : "danger"
                }
                className="text-xs font-bold"
              >
                {attendance.lastAttendance.status === "present"
                  ? "حاضر"
                  : attendance.lastAttendance.status === "late"
                    ? "متأخر"
                    : "غائب"}
              </Badge>
            </div>
          )}

          {/* Detailed Attendance List (Card-based, No horizontal scroll) */}
          <Card className="border-border/80 bg-surface rounded-2xl shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <span>سجل الحصص السابقة</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {attendance.records.length === 0 ? (
                <p className="text-xs text-center text-muted py-6">
                  لا توجد حصص مسجلة للطالب حتى الآن.
                </p>
              ) : (
                attendance.records.map((rec) => {
                  const isPresent = rec.status === "present";
                  const isLate = rec.status === "late";

                  return (
                    <div
                      key={rec.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors",
                        isPresent
                          ? "border-border bg-surface hover:bg-success/5"
                          : isLate
                            ? "border-warning/30 bg-warning/5"
                            : "border-danger/30 bg-danger/5"
                      )}
                    >
                      <div className="space-y-0.5 text-right">
                        <p className="text-xs sm:text-sm font-bold text-text">
                          {formatArabicDate(rec.date)}
                        </p>
                        {rec.startTime && (
                          <p className="text-[11px] text-muted font-mono">
                            الساعة: {rec.startTime}
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={isPresent ? "success" : isLate ? "warning" : "danger"}
                        className="text-xs font-bold px-2.5 py-1"
                      >
                        {isPresent ? "حاضر" : isLate ? "متأخر" : "غائب"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Tab 2: Payments ================= */}
        <TabsContent value="payments" className="space-y-4 focus-visible:outline-none">
          <Card className="border-border/80 bg-surface rounded-2xl shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-text flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>حالة الاشتراكات الشهرية</span>
                </CardTitle>
                <span className="text-[11px] text-muted">للعام الحالي</span>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2.5">
              {payments.length === 0 ? (
                <p className="text-xs text-center text-muted py-6">
                  لا توجد اشتراكات مسجلة لهذا الطالب بعد.
                </p>
              ) : (
                payments.map((p) => {
                  const isPaid = p.status === "paid";
                  const isPartial = p.status === "partial";

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                        isPaid
                          ? "border-success/20 bg-success/5"
                          : isPartial
                            ? "border-warning/30 bg-warning/5"
                            : "border-danger/25 bg-danger/5"
                      )}
                    >
                      <div className="space-y-1 text-right">
                        <h4 className="text-sm sm:text-base font-bold text-text">
                          {formatArabicMonth(p.month)}
                        </h4>
                        {isPartial && p.remaining > 0 ? (
                          <p className="text-xs font-semibold text-warning">
                            المتبقي: {p.remaining} ج.م
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <Badge variant="success" className="gap-1 text-xs font-bold px-3 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>مدفوع</span>
                          </Badge>
                        ) : isPartial ? (
                          <Badge variant="warning" className="gap-1 text-xs font-bold px-3 py-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>متبقي</span>
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="gap-1 text-xs font-bold px-3 py-1">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>غير مدفوع</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <p className="text-[11px] text-center text-muted px-2">
            ℹ️ البيانات المالية المعروضة هنا خاصة بتأكيد سداد المصاريف الشهرية لدى الأكاديمية.
          </p>
        </TabsContent>

        {/* ================= Tab 3: Exams ================= */}
        <TabsContent value="exams" className="space-y-4 focus-visible:outline-none">
          <Card className="border-border/80 bg-surface rounded-2xl shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>سجل الاختبارات والدرجات</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-3">
              {exams.length === 0 ? (
                <p className="text-xs text-center text-muted py-6">
                  لم يتم رصد نتائج اختبارات لهذا الطالب حتى الآن.
                </p>
              ) : (
                exams.map((ex) => {
                  const percentage = ex.percentage;
                  const isExcellent = percentage >= 90;
                  const isVeryGood = percentage >= 80 && percentage < 90;
                  const isGood = percentage >= 65 && percentage < 80;

                  return (
                    <div
                      key={ex.id}
                      className="p-3.5 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 text-right">
                          <h4 className="text-sm sm:text-base font-bold text-text">
                            {ex.examName}
                          </h4>
                          {ex.examDate && (
                            <p className="text-[11px] text-muted">
                              {formatArabicDate(ex.examDate)}
                            </p>
                          )}
                        </div>

                        {/* Rating Badge */}
                        <Badge
                          variant={
                            isExcellent
                              ? "success"
                              : isVeryGood
                                ? "default"
                                : isGood
                                  ? "warning"
                                  : "danger"
                          }
                          className="text-[11px] font-bold px-2 py-0.5 shrink-0"
                        >
                          {isExcellent
                            ? "ممتاز"
                            : isVeryGood
                              ? "جيد جداً"
                              : isGood
                                ? "جيد"
                                : "يحتاج متابعة"}
                        </Badge>
                      </div>

                      {/* Grade & Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted font-medium">الدرجة المحصلة:</span>
                          <span className="font-mono font-black text-sm text-text">
                            {ex.grade}{" "}
                            <span className="text-muted font-normal text-xs">
                              / {ex.finalGrade}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isExcellent
                                  ? "bg-success"
                                  : isVeryGood
                                    ? "bg-primary"
                                    : isGood
                                      ? "bg-warning"
                                      : "bg-danger"
                              )}
                              style={{
                                width: `${Math.min(100, Math.max(0, percentage))}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-muted shrink-0 w-9 text-left">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
