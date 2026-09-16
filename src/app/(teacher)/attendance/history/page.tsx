"use client";

import * as React from "react";
import Link from "next/link";
import { useAttendanceHistory } from "@/hooks/use-cached-data";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableSkeleton,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

import { Pagination } from "@/components/ui/pagination";
import { formatArabicTime } from "@/lib/utils/date";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  CalendarCheck,
  Calendar,
  Layers,
  RotateCcw,
  Eye,
  Plus,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function AttendanceHistoryPage() {
  // Filters
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Cached History Data
  const historyParams = React.useMemo(
    () => ({
      page: currentPage,
      pageSize,
      groupId: selectedGroupId || undefined,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    }),
    [currentPage, pageSize, selectedGroupId, selectedDate]
  );

  const { data: historyRes, isLoading } = useAttendanceHistory(historyParams);
  const historyData = historyRes?.success ? historyRes.data : null;
  const sessions = historyData?.sessions || [];
  const groups = historyData?.groups || [];
  const totalPages = historyData?.totalPages || 1;
  const totalCount = historyData?.totalCount || 0;

  const handleResetFilters = () => {
    setSelectedGroupId("");
    setSelectedDate(undefined);
    setCurrentPage(1);
  };

  // Summary Metrics calculations
  const totalPresentSum = sessions.reduce((acc, s) => acc + s.presentCount + s.lateCount, 0);
  const averageAttendanceRate =
    sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.attendanceRate, 0) / sessions.length)
      : 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
                سجل جلسات الحضور
              </h1>
              <p className="text-xs md:text-sm text-muted">
                استعراض وتتبع كافة جلسات الحضور السابقة، ونسب الالتزام والغياب لكل مجموعة وتاريخ.
              </p>
            </div>
          </div>
        </div>

        <Link href="/attendance">
          <Button className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>تسجيل حضور جديد</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted">إجمالي الجلسات</span>
              <h3 className="text-2xl font-black text-text mt-0.5">{totalCount} جلسة</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted">الطلاب المسجلين بالصفحة</span>
              <h3 className="text-2xl font-black text-success mt-0.5">{totalPresentSum} حاضر</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted">متوسط الحضور بالصفحة</span>
              <h3 className="text-2xl font-black text-primary mt-0.5">{averageAttendanceRate}%</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-surface shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-text flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted" />
                تصفية بالمجموعة
              </label>
              <Select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">جميع المجموعات الدراسية</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.className}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-text flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted" />
                تصفية بالتاريخ
              </label>
              <DatePicker
                date={selectedDate}
                setDate={(date: Date | undefined) => {
                  setSelectedDate(date);
                  setCurrentPage(1);
                }}
                placeholder="جميع التواريخ"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="w-full gap-1.5 font-bold text-xs"
                disabled={!selectedGroupId && !selectedDate}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold">جلسات الحضور السابقة</CardTitle>
            <p className="text-xs text-muted mt-0.5">
              يعرض الجدول تفاصيل الحصص ومعدلات الحضور ونسب الغياب والتأخير.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold">
            {totalCount} جلسة مسجلة
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>المجموعة والصف</TableHead>
                  <TableHead>التاريخ والتوقيت</TableHead>
                  <TableHead className="text-center">المقيدون</TableHead>
                  <TableHead className="text-center">الحاضرون</TableHead>
                  <TableHead className="text-center">المتأخرون</TableHead>
                  <TableHead className="text-center">الغائبون</TableHead>
                  <TableHead className="text-center">نسبة الحضور</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-left pl-4">الإجراء</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableSkeleton cols={10} rows={5} />
                ) : sessions.length === 0 ? (
                  <TableEmpty
                    colSpan={10}
                    title="لا توجد جلسات حضور مطابقة"
                    description="لم يتم العثور على أي جلسات حضور مسجلة تطابق الفلاتر المحددة."
                    icon={<CalendarCheck className="h-10 w-10 stroke-[1.5]" />}
                  />
                ) : (
                  sessions.map((session, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const rate = session.attendanceRate;

                    return (
                      <TableRow
                        key={session.id}
                        className="hover:bg-surface-raised/60 transition-colors"
                      >
                        <TableCell className="text-center font-bold text-muted text-xs">
                          {rowNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-text text-sm hover:text-primary transition-colors">
                              {session.groupName}
                            </span>
                            <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                              <Layers className="h-3 w-3 text-muted" />
                              {session.className}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-text font-mono">
                              {session.date}
                            </span>
                            <span className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-muted" />
                              {formatArabicTime(session.startTime)}
                              {session.endTime ? ` — ${formatArabicTime(session.endTime)}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-bold text-text text-sm">
                          {session.totalStudents}
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-black text-success text-sm bg-success/10 px-2 py-0.5 rounded-md">
                            {session.presentCount}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-bold text-warning text-xs bg-warning/10 px-2 py-0.5 rounded-md">
                            {session.lateCount}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-bold text-danger text-xs bg-danger/10 px-2 py-0.5 rounded-md">
                            {session.absentCount}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant={rate >= 80 ? "success" : rate >= 50 ? "warning" : "danger"}
                            className="font-bold text-xs"
                          >
                            {rate}%
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant={session.status === "completed" ? "outline" : "success"}
                            size="sm"
                            dot={session.status === "active"}
                          >
                            {session.status === "completed" ? "مكتملة" : "نشطة"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-left pl-4">
                          <Link href={`/attendance/history/${session.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs font-bold shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span>الطلاب والتفاصيل</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="p-4 border-t border-border flex justify-center">
              <Pagination
                currentPage={currentPage}
                hasNextPage={currentPage < totalPages}
                hasPrevPage={currentPage > 1}
                onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
                totalCount={totalCount}
                pageSize={pageSize}
                itemLabel="جلسة"
                isLoading={isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
