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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ... (نفس الـ Interfaces والـ Helper Functions السابقة بدون تغيير) ...

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
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
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

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-40 rounded-3xl bg-secondary" />
        <div className="h-14 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-3xl bg-secondary" />
          <div className="h-28 rounded-3xl bg-secondary" />
        </div>
        <div className="h-48 rounded-3xl bg-secondary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-black text-text">عفواً، لا يمكن الوصول</h1>
          <p className="text-sm text-muted leading-relaxed">
            الرابط غير صالح أو تم إيقافه. يرجى مراجعة إدارة المركز للحصول على رابط جديد.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center justify-center gap-2 w-full max-w-xs py-3 px-6 text-sm font-bold rounded-2xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors active:scale-95"
        >
          <RotateCw className="h-4 w-4" />
          <span>تحديث الصفحة</span>
        </button>
      </div>
    );
  }

  const { student, attendance, payments, exams } = data;

  return (
    <div className="space-y-5 pb-6">
      {/* 1. Student Identity Card - Clean Flat UI */}
      <div className="bg-surface rounded-[24px] p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div className="relative h-[68px] w-[68px] shrink-0 rounded-[18px] overflow-hidden bg-secondary">
            {student.photoUrl ? (
              <Image
                src={student.photoUrl}
                alt={student.name}
                fill
                sizes="68px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text font-black text-2xl">
                {student.name.charAt(0) || <User className="h-8 w-8" />}
              </div>
            )}
          </div>
          
          <div className="space-y-2 flex-1">
            <h1 className="text-xl sm:text-[22px] font-black text-text leading-tight">
              {student.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-muted bg-secondary px-3 py-1.5 rounded-xl">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {student.teacherName} {student.subject ? `• ${student.subject}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Info Tags */}
{/* Info Tags - Fixed for long text */}
        <div className="grid grid-cols-2 gap-3">
          {/* Class Name */}
          <div className="flex flex-col gap-2.5 p-4 rounded-[20px] bg-secondary">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 bg-surface rounded-[12px] shrink-0 shadow-sm">
                <BookOpen className="h-4 w-4 text-text" />
              </div>
              <span className="text-[11px] text-muted font-bold">الصف الدراسي</span>
            </div>
            {/* إزالة truncate والسماح بـ break-words ليأخذ سطرين أو أكثر إذا لزم الأمر */}
            <span className="text-sm sm:text-base font-black text-text leading-snug break-words">
              {student.className}
            </span>
          </div>
          
          {/* Group Name */}
          <div className="flex flex-col gap-2.5 p-4 rounded-[20px] bg-secondary">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 bg-surface rounded-[12px] shrink-0 shadow-sm">
                <Users className="h-4 w-4 text-text" />
              </div>
              <span className="text-[11px] text-muted font-bold">المجموعة</span>
            </div>
            <span className="text-sm sm:text-base font-black text-text leading-snug break-words">
              {student.groupName}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tabs - High Contrast & Mobile Optimized */}
      <Tabs defaultValue="attendance" className="w-full space-y-4">
        <TabsList className="flex w-full h-auto p-1.5 bg-secondary rounded-[20px]">
          {["attendance", "payments", "exams"].map((tab) => {
            const icons = {
              attendance: <CalendarCheck className="h-4 w-4 shrink-0" />,
              payments: <CreditCard className="h-4 w-4 shrink-0" />,
              exams: <Award className="h-4 w-4 shrink-0" />,
            };
            const labels = { attendance: "الحضور", payments: "الماليات", exams: "التقييم" };
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-2xl data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm transition-all text-muted"
              >
                {icons[tab as keyof typeof icons]}
                <span>{labels[tab as keyof typeof labels]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ================= Tab 1: Attendance ================= */}
        <TabsContent value="attendance" className="space-y-3 focus-visible:outline-none">
          <div className="grid grid-cols-2 gap-3">
            {/* Rate Card */}
            <div className="col-span-2 p-5 rounded-[20px] bg-surface shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted">نسبة الانضباط</span>
                <span className="text-xs font-bold text-text bg-secondary px-2.5 py-1 rounded-lg">
                  {attendance.totalSessions} حصة
                </span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className={cn(
                  "text-4xl font-black leading-none",
                  attendance.attendanceRate >= 85 ? "text-emerald-600" : attendance.attendanceRate >= 70 ? "text-amber-600" : "text-rose-600"
                )}>
                  {attendance.attendanceRate}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    attendance.attendanceRate >= 85 ? "bg-emerald-500" : attendance.attendanceRate >= 70 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, attendance.attendanceRate))}%` }}
                />
              </div>
            </div>

            {/* Present Count */}
            <div className="p-4 rounded-[20px] bg-emerald-50 flex flex-col justify-center border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-emerald-700">أيام الحضور</span>
              </div>
              <h3 className="text-2xl font-black text-emerald-700">{attendance.presentCount} <span className="text-sm font-bold opacity-80">يوم</span></h3>
            </div>
            
            {/* Absent Count */}
            <div className="p-4 rounded-[20px] bg-rose-50 flex flex-col justify-center border border-rose-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                  <XCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-rose-700">أيام الغياب</span>
              </div>
              <h3 className="text-2xl font-black text-rose-700">{attendance.absentCount} <span className="text-sm font-bold opacity-80">يوم</span></h3>
            </div>
          </div>

          <div className="pt-3">
            <h3 className="text-sm font-black text-text mb-3 px-1">سجل الحصص</h3>
            <div className="space-y-3">
              {attendance.records.length === 0 ? (
                <div className="py-10 text-center bg-surface rounded-[20px] shadow-sm">
                  <p className="text-sm font-bold text-muted">لا توجد حصص مسجلة بعد.</p>
                </div>
              ) : (
                attendance.records.map((rec) => {
                  const isPresent = rec.status === "present";
                  const isLate = rec.status === "late";
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-4 rounded-[20px] bg-surface shadow-sm"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          isPresent ? "bg-emerald-50 text-emerald-600" : isLate ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {isPresent ? <CheckCircle2 className="h-5 w-5" /> : isLate ? <Clock className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p className="text-sm font-bold text-text">{formatArabicDate(rec.date)}</p>
                          {rec.startTime && <p className="text-xs font-bold text-muted">{rec.startTime}</p>}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[11px] font-black px-3 py-1.5 rounded-lg",
                        isPresent ? "bg-emerald-100 text-emerald-700" : isLate ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {isPresent ? "حاضر" : isLate ? "متأخر" : "غائب"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* ================= Tab 2: Payments ================= */}
        <TabsContent value="payments" className="space-y-3 focus-visible:outline-none">
          {payments.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center bg-surface rounded-[20px] shadow-sm mt-2">
              <CreditCard className="h-10 w-10 text-muted mb-3 opacity-50" />
              <p className="text-sm font-bold text-muted">لا توجد اشتراكات مسجلة.</p>
            </div>
          ) : (
            payments.map((p) => {
              const isPaid = p.status === "paid";
              const isPartial = p.status === "partial";
              return (
                <div key={p.id} className="flex flex-col p-4 rounded-[20px] bg-surface shadow-sm gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isPaid ? "bg-emerald-50 text-emerald-600" : isPartial ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {isPaid ? <CheckCircle2 className="h-5 w-5" /> : isPartial ? <Clock3 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <h4 className="text-base font-black text-text">{formatArabicMonth(p.month)}</h4>
                    </div>
                    <span className={cn(
                      "text-[11px] font-black px-3 py-1.5 rounded-lg",
                      isPaid ? "bg-emerald-100 text-emerald-700" : isPartial ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {isPaid ? "مدفوع" : isPartial ? "جزء" : "غير مدفوع"}
                    </span>
                  </div>
                  {isPartial && p.remaining > 0 && (
                    <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-amber-800">المبلغ المتبقي:</span>
                      <span className="text-sm font-black text-amber-600">{p.remaining} ج.م</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ================= Tab 3: Exams ================= */}
        <TabsContent value="exams" className="space-y-3 focus-visible:outline-none">
          {exams.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center bg-surface rounded-[20px] shadow-sm mt-2">
              <Award className="h-10 w-10 text-muted mb-3 opacity-50" />
              <p className="text-sm font-bold text-muted">لم يتم رصد نتائج اختبارات حتى الآن.</p>
            </div>
          ) : (
            exams.map((ex) => {
              const pct = ex.percentage;
              const isExc = pct >= 90;
              const isVG = pct >= 80 && pct < 90;
              const isGood = pct >= 65 && pct < 80;
              
              return (
                <div key={ex.id} className="p-5 rounded-[20px] bg-surface shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-text mb-1">{ex.examName}</h4>
                      <span className="text-[11px] font-bold text-muted">{formatArabicDate(ex.examDate)}</span>
                    </div>
                    <span className={cn(
                      "text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0",
                      isExc ? "bg-emerald-100 text-emerald-700" : isVG ? "bg-blue-100 text-blue-700" : isGood ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {isExc ? "ممتاز" : isVG ? "جيد جداً" : isGood ? "جيد" : "يحتاج متابعة"}
                    </span>
                  </div>

                  <div className="bg-secondary rounded-2xl p-4">
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-xs font-bold text-muted">الدرجة</span>
                      <div className="font-black">
                        <span className="text-xl text-text">{ex.grade}</span>
                        <span className="text-sm text-muted"> / {ex.finalGrade}</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isExc ? "bg-emerald-500" : isVG ? "bg-blue-500" : isGood ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}