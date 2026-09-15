"use client";

import * as React from "react";
import { getStudentAttendance, type StudentAttendanceSummary } from "@/lib/actions/students";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock3, Percent, Calendar, UserCheck } from "lucide-react";

interface AttendanceTabProps {
  studentId: string;
}

export function AttendanceTab({ studentId }: AttendanceTabProps) {
  const [data, setData] = React.useState<StudentAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAttendance() {
      setIsLoading(true);
      try {
        const res = await getStudentAttendance(studentId);
        if (res.success && res.data) {
          setData(res.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadAttendance();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  const summary = data || {
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
    records: [],
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Attendance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Present */}
        <div className="p-4 rounded-xl border border-success/20 bg-success/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">حضور</span>
            <h3 className="text-2xl font-black text-text mt-0.5">{summary.presentCount}</h3>
          </div>
        </div>

        {/* Absent */}
        <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">غياب</span>
            <h3 className="text-2xl font-black text-text mt-0.5">{summary.absentCount}</h3>
          </div>
        </div>

        {/* Late */}
        <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">تأخير</span>
            <h3 className="text-2xl font-black text-text mt-0.5">{summary.lateCount}</h3>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">نسبة الحضور</span>
            <h3 className="text-2xl font-black text-primary mt-0.5">{summary.attendanceRate}%</h3>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">سجل الحصص السابقة</CardTitle>
          </div>
          <CardDescription>سجل تفصيلي بحضور وغياب الطالب في جميع الحصص المنعقدة.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاريخ الحصة</TableHead>
                <TableHead>وقت الحضور</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">طريقة الرصد</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.records.length === 0 ? (
                <TableEmpty
                  colSpan={5}
                  icon={<Calendar className="h-10 w-10 text-muted stroke-[1.5]" />}
                  title="لا توجد سجلات حضور"
                  description="لم يتم رصد أي جلسات حضور مسجلة لهذا الطالب حتى الآن."
                />
              ) : (
                summary.records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-semibold text-text text-sm">{rec.date}</TableCell>

                    <TableCell className="text-xs text-muted font-mono" dir="ltr">
                      {rec.startTime}
                    </TableCell>

                    <TableCell className="text-center">
                      {rec.status === "present" ? (
                        <Badge variant="success" size="sm" dot>
                          حاضر
                        </Badge>
                      ) : rec.status === "late" ? (
                        <Badge variant="warning" size="sm">
                          متأخر
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          غائب
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-xs font-medium text-muted bg-surface px-2 py-0.5 rounded border border-border">
                        {rec.source === "camera"
                          ? "كاميرا QR"
                          : rec.source === "scanner"
                            ? "ماسح كروت"
                            : "يدوي"}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-muted">{rec.notes || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
