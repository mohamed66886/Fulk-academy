"use client";

import * as React from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks/use-cached-data";
import {
  Users,
  Layers,
  CalendarCheck,
  CreditCard,
  Clock,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

export default function TeacherDashboardPage() {
  const { data: result, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="font-semibold text-lg">جاري تحميل لوحة التحكم...</span>
      </div>
    );
  }

  const data = result?.data || {
    cairoDate: {
      dayOfWeek: "monday",
      formattedDate: "",
      arabicDayName: "اليوم",
      arabicFormattedDate: "",
      currentTime: "",
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
    weeklyAttendance: [],
    classDistribution: [],
  };

  const { cairoDate, teacherName, stats, todaySessions, weeklyAttendance, classDistribution } =
    data;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Welcome Banner with Sun/Moon Time Greeting & Working Analog Clock */}
      <WelcomeBanner
        initialTeacherName={teacherName}
        initialDate={cairoDate as React.ComponentProps<typeof WelcomeBanner>["initialDate"]}
      />

      {/* 1. Top Aggregated Statistics Cards (Dark Colored Backgrounds, 2 per row on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Total Students - Dark Rich Blue */}
        <Link href="/students" className="block group">
          <div className="h-full rounded-2xl bg-[#1e3a8a] p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5 shadow-none flex flex-col justify-between">
            {/* Top Row: Big SVG Icon on Right, Big Number on Left */}
            <div className="flex items-center justify-between gap-2">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-300 shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.totalStudents}
              </span>
            </div>
            {/* Bottom: Clarification & Label */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="text-xs sm:text-sm font-bold text-white">إجمالي الطلاب</div>
              <div className="text-[10px] sm:text-xs text-blue-200 font-medium mt-0.5 truncate">
                طالب نشط مسجل
              </div>
            </div>
          </div>
        </Link>

        {/* Stat 2: Total Groups - Dark Rich Purple */}
        <Link href="/groups" className="block group">
          <div className="h-full rounded-2xl bg-[#581c87] p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5 shadow-none flex flex-col justify-between">
            {/* Top Row: Big SVG Icon on Right, Big Number on Left */}
            <div className="flex items-center justify-between gap-2">
              <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-purple-300 shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.totalGroups}
              </span>
            </div>
            {/* Bottom: Clarification & Label */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="text-xs sm:text-sm font-bold text-white">عدد المجموعات</div>
              <div className="text-[10px] sm:text-xs text-purple-200 font-medium mt-0.5 truncate">
                مجموعة دراسية نشطة
              </div>
            </div>
          </div>
        </Link>

        {/* Stat 3: Today's Attendance - Dark Rich Emerald */}
        <Link href="/attendance" className="block group">
          <div className="h-full rounded-2xl bg-[#064e3b] p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5 shadow-none flex flex-col justify-between">
            {/* Top Row: Big SVG Icon on Right, Big Number on Left */}
            <div className="flex items-center justify-between gap-2">
              <CalendarCheck className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-300 shrink-0" />
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.todayAttendance}
              </span>
            </div>
            {/* Bottom: Clarification & Label */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="text-xs sm:text-sm font-bold text-white">حضور اليوم</div>
              <div className="text-[10px] sm:text-xs text-emerald-200 font-medium mt-0.5 truncate">
                طالب تم مسح حضوره
              </div>
            </div>
          </div>
        </Link>

        {/* Stat 4: Due Payments - Dark Rich Amber */}
        <Link href="/payments" className="block group">
          <div className="h-full rounded-2xl bg-[#78350f] p-4 sm:p-5 transition-transform group-hover:-translate-y-0.5 shadow-none flex flex-col justify-between">
            {/* Top Row: Big SVG Icon on Right, Big Number on Left */}
            <div className="flex items-center justify-between gap-2">
              <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-amber-300 shrink-0" />
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight text-left">
                {stats.duePaymentsAmount.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-normal text-amber-200">ج.م</span>
              </div>
            </div>
            {/* Bottom: Clarification & Label */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <div className="text-xs sm:text-sm font-bold text-white">المبالغ المستحقة</div>
              <div className="text-[10px] sm:text-xs text-amber-200 font-medium mt-0.5 truncate">
                {stats.duePaymentsCount > 0
                  ? `${stats.duePaymentsCount} اشتراك غير مسدد`
                  : "لا توجد متأخرات"}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* 2. Analytical Charts (Weekly Attendance & Students by Grade) */}
      <DashboardCharts
        weeklyAttendance={weeklyAttendance}
        classDistribution={classDistribution}
        totalStudents={stats.totalStudents}
      />

      {/* 3. Today's Classes / Sessions Section */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">حصص اليوم</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                  {todaySessions.length} {todaySessions.length === 1 ? "حصة مجدولة" : "حصص مجدولة"}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
          >
            <span>سجل الحضور الكامل</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Sessions Content */}
        {todaySessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 sm:p-12 text-center shadow-none">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">
                لا توجد حصص مجدولة اليوم ({cairoDate.arabicDayName})
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                جدول المواعيد خالٍ لليوم وفق توقيت مصر. يمكنك الانتقال إلى المجموعات أو تسجيل الحضور
                يدوياً.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/groups"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  <span>عرض المجموعات</span>
                </Link>
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                >
                  <span>سجل الحضور</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {todaySessions.map((session) => (
              <div
                key={session.groupId}
                className="h-full rounded-2xl bg-white border border-gray-200/80 p-5 shadow-none transition-all hover:border-blue-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Top: Class Name Tag + Student Count */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100/80">
                      <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                      <span>{session.className}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                      <Users className="h-3.5 w-3.5 text-gray-500" />
                      <span>{session.studentCount} طالب</span>
                    </span>
                  </div>

                  {/* Group Name */}
                  <div className="pt-3 pb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {session.groupName}
                    </h3>
                  </div>

                  {/* Time Information */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 mt-2">
                    <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="dir-ltr text-right font-medium">{session.formattedTime}</span>
                  </div>
                </div>

                {/* Action Button: Start Attendance */}
                <Link href={`/attendance?groupId=${session.groupId}`} className="mt-4 block w-full">
                  <div className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm transition-all shadow-none">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تسجيل الحضور</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
