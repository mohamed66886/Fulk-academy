"use client";

import * as React from "react";
import { BarChart3, PieChart, Users, TrendingUp } from "lucide-react";
import type { WeeklyAttendancePoint, ClassDistributionItem } from "@/lib/actions/dashboard";

// Palette requested by user: Light Blue, Green, Orange, Yellow
const PALETTE = ["#0EA5E9", "#10B981", "#F97316", "#EAB308"];

interface DashboardChartsProps {
  weeklyAttendance?: WeeklyAttendancePoint[];
  classDistribution?: ClassDistributionItem[];
  totalStudents?: number;
}

export function DashboardCharts({
  weeklyAttendance = [],
  classDistribution = [],
  totalStudents = 0,
}: DashboardChartsProps) {
  // 1. Calculations for Weekly Attendance Chart
  const maxAttendance = Math.max(...weeklyAttendance.map((d) => d.presentCount), 10);
  const totalWeeklyAttendance = weeklyAttendance.reduce((acc, d) => acc + d.presentCount, 0);

  // 2. Calculations for Class Distribution Donut Chart
  const totalClassStudents =
    classDistribution.reduce((acc, c) => acc + c.studentCount, 0) || totalStudents || 0;

  // Compute SVG Donut segments using stroke-dasharray & stroke-dashoffset
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  let accumulatedPercent = 0;

  const donutSegments = classDistribution.map((item, index) => {
    const itemColor = PALETTE[index % PALETTE.length] || item.color;
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      color: itemColor,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Weekly Attendance Bar Chart - No border, No shadow */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border-0 shadow-none p-5 sm:p-6 flex flex-col justify-between transition-all">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-[#0EA5E9]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  حضور الأيام الأخيرة
                </h3>
                <p className="text-xs text-gray-400">مقارنة أعداد الحضور المسجل يومياً</p>
              </div>
            </div>

            {/* Total Week Badge - Green Accent */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-emerald-50 text-[#10B981] text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>إجمالي الأسبوع: {totalWeeklyAttendance}</span>
            </div>
          </div>

          {/* Bar Chart Canvas */}
          <div className="mt-6 pt-2">
            <div className="relative h-48 w-full flex items-end justify-between gap-2 sm:gap-4 px-1 pb-6">
              {/* Horizontal Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="border-b border-gray-100 w-full" />
                <div className="border-b border-gray-100 w-full" />
                <div className="border-b border-gray-100 w-full" />
                <div className="border-b border-gray-100 w-full" />
              </div>

              {/* Bars for each day */}
              {weeklyAttendance.map((item, index) => {
                const heightPercent = Math.max(
                  Math.round((item.presentCount / maxAttendance) * 100),
                  6
                );

                return (
                  <div
                    key={index}
                    className="relative z-10 flex-1 flex flex-col items-center h-full justify-end group"
                  >
                    {/* Tooltip / Number Above Bar */}
                    <div
                      className={`mb-1 text-[11px] sm:text-xs font-bold transition-transform group-hover:scale-110 ${
                        item.isToday ? "text-[#0EA5E9]" : "text-gray-600"
                      }`}
                    >
                      {item.presentCount}
                    </div>

                    {/* The Bar */}
                    <div className="w-full max-w-[34px] bg-gray-100 rounded-t-lg overflow-hidden h-full flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 group-hover:brightness-95 ${
                          item.isToday ? "bg-[#0EA5E9]" : "bg-[#BAE6FD]"
                        }`}
                      />
                    </div>

                    {/* Day Label Below Bar */}
                    <div className="absolute -bottom-6 flex flex-col items-center">
                      <span
                        className={`text-[11px] font-bold ${
                          item.isToday ? "text-[#0EA5E9]" : "text-gray-500"
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9] inline-block" />
            <span className="font-semibold text-gray-700">اليوم الحالي</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#BAE6FD] inline-block" />
            <span>الأيام السابقة</span>
          </div>
        </div>
      </div>

      {/* Chart 2: Students Distribution by Grade - No border, No shadow (Yellow, Green, Orange, Light Blue) */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border-0 shadow-none p-5 sm:p-6 flex flex-col justify-between transition-all">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-[#EAB308]">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  توزيع الطلاب حسب الصفوف
                </h3>
                <p className="text-xs text-gray-400">نسبة قيد الطلاب بكل مرحلة دراسية</p>
              </div>
            </div>

            {/* Total Students Badge - Orange Accent */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-orange-50 text-[#F97316] text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>{totalClassStudents} طالب مسجل</span>
            </div>
          </div>

          {/* Content: Donut + Progress Breakdown */}
          {classDistribution.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs sm:text-sm">
              لا توجد صفوف دراسية مسجلة حالياً لعرض الرسم البياني.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* SVG Donut */}
              <div className="sm:col-span-5 flex items-center justify-center relative">
                <svg
                  width="136"
                  height="136"
                  viewBox="0 0 100 100"
                  className="rotate-[-90deg] select-none"
                >
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />

                  {/* Donut Segments */}
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.classId}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={segment.color}
                      strokeWidth="12"
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      className="transition-all duration-700"
                    />
                  ))}
                </svg>

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-gray-900">{totalClassStudents}</span>
                  <span className="text-[10px] font-bold text-gray-400">طالب</span>
                </div>
              </div>

              {/* Breakdown Bars & Legend */}
              <div className="sm:col-span-7 space-y-3">
                {classDistribution.map((item, index) => {
                  const itemColor = PALETTE[index % PALETTE.length] || item.color;

                  return (
                    <div key={item.classId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: itemColor }}
                          />
                          <span className="text-gray-800 font-bold truncate">{item.className}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-gray-500 font-medium">
                          <span>{item.studentCount} طالب</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-bold text-gray-800">{item.percentage}%</span>
                        </div>
                      </div>

                      {/* Horizontal Progress Bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: itemColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>يتم احتساب النسب تلقائياً بناءً على الطلاب النشطين</span>
        </div>
      </div>
    </div>
  );
}
