"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getAttendanceSessionDetails,
  updateStudentAttendanceStatus,
  type AttendanceSessionFullDetails,
  type SessionStudentDetailItem,
} from "@/lib/actions/attendance";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { formatArabicTime } from "@/lib/utils/date";
import {
  ArrowRight,
  Calendar,
  Clock,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Edit2,
  Search,
  Check,
  ShieldAlert,
  RotateCcw,
  UserX,
} from "lucide-react";

export default function AttendanceSessionDetailsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [details, setDetails] = React.useState<AttendanceSessionFullDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "present" | "late" | "absent">(
    "all"
  );

  // Edit Student Status Modal
  const [editingStudent, setEditingStudent] = React.useState<SessionStudentDetailItem | null>(null);
  const [newStatus, setNewStatus] = React.useState<"present" | "late" | "absent">("present");
  const [editReason, setEditReason] = React.useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  const fetchDetails = React.useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await getAttendanceSessionDetails(sessionId);
      if (res.success && res.data) {
        setDetails(res.data);
      } else {
        toast.error(res.error || "تعذر العثور على جلسة الحضور");
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Open Edit Modal for a student
  const handleOpenEditModal = (student: SessionStudentDetailItem) => {
    setEditingStudent(student);
    setNewStatus(student.status);
    setEditReason("");
  };

  // Submit Status Change
  const handleSubmitStatusChange = async () => {
    if (!editingStudent || !details) return;

    if (editingStudent.status === newStatus) {
      toast.info("لم يتم تغيير الحالة");
      setEditingStudent(null);
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await updateStudentAttendanceStatus({
        sessionId,
        studentId: editingStudent.studentId,
        newStatus,
        reason: editReason.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.message || res.error || "فشل تعديل حالة الطالب");
        return;
      }

      toast.success(res.message);

      // Optimistic local state update
      setDetails((prev) => {
        if (!prev) return prev;

        const updatedRecords = prev.records.map((r) => {
          if (r.studentId === editingStudent.studentId) {
            return {
              ...r,
              status: newStatus,
              source: "manual_teacher" as const,
              notes: editReason.trim() || "تعديل يدوي من المدرس",
            };
          }
          return r;
        });

        const newPresentCount = res.updatedCounts
          ? res.updatedCounts.presentCount
          : prev.session.presentCount;
        const newAbsentCount = res.updatedCounts
          ? res.updatedCounts.absentCount
          : prev.session.absentCount;
        const newLateCount = res.updatedCounts
          ? res.updatedCounts.lateCount
          : prev.session.lateCount;
        const newRate =
          prev.session.totalStudents > 0
            ? Math.round(((newPresentCount + newLateCount) / prev.session.totalStudents) * 100)
            : 0;

        return {
          ...prev,
          records: updatedRecords,
          session: {
            ...prev.session,
            presentCount: newPresentCount,
            absentCount: newAbsentCount,
            lateCount: newLateCount,
            attendanceRate: newRate,
          },
        };
      });

      setEditingStudent(null);
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء حفظ التعديل");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="h-6 w-48 rounded bg-muted/20 animate-pulse" />
        <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-12 text-center space-y-4" dir="rtl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-text">لم يتم العثور على الجلسة</h3>
        <p className="text-xs text-muted">ربما تم حذف الجلسة أو أن المعرف غير صحيح.</p>
        <Link href="/attendance/history">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة إلى سجل الحضور
          </Button>
        </Link>
      </div>
    );
  }

  const { session, records } = details;

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchQuery =
      !searchQuery.trim() ||
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      r.studentPhone.includes(searchQuery.trim());

    const matchStatus = statusFilter === "all" || r.status === statusFilter;

    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/attendance" className="hover:text-primary transition-colors">
          الحضور
        </Link>
        <span>/</span>
        <Link href="/attendance/history" className="hover:text-primary transition-colors">
          سجل الحضور
        </Link>
        <span>/</span>
        <span className="text-text font-bold">تفاصيل الجلسة ({session.date})</span>
      </div>

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
              {session.groupName}
            </h1>
            <Badge variant="outline" className="text-xs font-bold gap-1">
              <Layers className="h-3 w-3 text-primary" />
              {session.className}
            </Badge>
            <Badge
              variant={session.status === "completed" ? "outline" : "success"}
              size="sm"
              dot={session.status === "active"}
            >
              {session.status === "completed" ? "جلسة مكتملة" : "جلسة نشطة"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted font-medium">
            <span className="flex items-center gap-1 font-mono font-bold text-text">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {session.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              من {formatArabicTime(session.startTime)}
              {session.endTime ? ` حتى ${formatArabicTime(session.endTime)}` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/attendance/history">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
              <ArrowRight className="h-4 w-4" />
              <span>العودة للسجل</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted">إجمالي الطلاب</span>
              <h3 className="text-2xl font-black text-text mt-0.5">{session.totalStudents}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/10 text-text">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-success">الحاضرون</span>
              <h3 className="text-2xl font-black text-success mt-0.5">{session.presentCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-warning">المتأخرون</span>
              <h3 className="text-2xl font-black text-warning mt-0.5">{session.lateCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <Clock3 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-danger">الغائبون</span>
              <h3 className="text-2xl font-black text-danger mt-0.5">{session.absentCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Student Records Section */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-surface-raised p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              الكل ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("present")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "present"
                  ? "bg-success text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              حاضر ({session.presentCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("late")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "late"
                  ? "bg-warning text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              متأخر ({session.lateCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("absent")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "absent"
                  ? "bg-danger text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              غائب ({session.absentCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Input
              placeholder="بحث باسم الطالب أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 text-xs"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        {/* Table of Students */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">طريقة التسجيل</TableHead>
                  <TableHead>وقت التسجيل</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead className="text-left pl-4">إجراء المدرس</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableEmpty
                    colSpan={8}
                    title="لا يوجد طلاب مطابقون"
                    description="لم يتم العثور على أي طالب يطابق معايير البحث المحددة."
                    icon={<Users className="h-10 w-10 stroke-[1.5]" />}
                  />
                ) : (
                  filteredRecords.map((student, idx) => (
                    <TableRow
                      key={student.studentId}
                      className="hover:bg-surface-raised/60 transition-colors"
                    >
                      <TableCell className="text-center font-bold text-muted text-xs">
                        {idx + 1}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/students/${student.studentId}`}
                          className="font-bold text-sm text-text hover:text-primary transition-colors"
                        >
                          {student.studentName}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-mono text-muted" dir="ltr">
                          {student.studentPhone || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={
                            student.status === "present"
                              ? "success"
                              : student.status === "late"
                                ? "warning"
                                : "danger"
                          }
                          size="sm"
                          dot
                          className="font-bold text-xs"
                        >
                          {student.status === "present"
                            ? "حاضر"
                            : student.status === "late"
                              ? "متأخر"
                              : "غائب"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-[11px] font-semibold text-muted bg-surface px-2.5 py-1 rounded-lg border border-border">
                          {student.source === "camera"
                            ? "كاميرا QR"
                            : student.source === "scanner"
                              ? "ماسح USB"
                              : student.source === "manual_teacher"
                                ? "تعديل مدرس"
                                : "رصد يدوي"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-mono text-muted" dir="ltr">
                          {student.scannedAt
                            ? formatArabicTime(student.scannedAt.slice(11, 16))
                            : "—"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-muted max-w-xs truncate block">
                          {student.notes || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="text-left pl-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(student)}
                          className="gap-1 text-xs font-bold shadow-2xs hover:border-primary hover:text-primary"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>تعديل الحالة</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Student Status Modal */}
      {editingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStudent(null)}
          title={`تعديل حالة حضور: ${editingStudent.studentName}`}
        >
          <div className="space-y-4" dir="rtl">
            {/* Audit Log Warning Notice */}
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 flex items-start gap-2.5 text-xs text-warning">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه تدقيق ورقابة (Audit Log)</p>
                <p className="text-[11px] text-muted mt-0.5 opacity-90 leading-relaxed">
                  بصفتك المدرس المشرف، سيتم تسجيل هذا التعديل وتوثيقه باسمك وتوقيته في سجلات الرقابة
                  (Audit Logs).
                </p>
              </div>
            </div>

            {/* Current vs New Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text">اختر الحالة الجديدة للطالب</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStatus("present")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    newStatus === "present"
                      ? "border-success bg-success/15 font-black text-success shadow-xs"
                      : "border-border bg-surface text-muted hover:text-text hover:bg-surface-raised"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">حاضر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewStatus("late")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    newStatus === "late"
                      ? "border-warning bg-warning/15 font-black text-warning shadow-xs"
                      : "border-border bg-surface text-muted hover:text-text hover:bg-surface-raised"
                  }`}
                >
                  <Clock3 className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">متأخر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewStatus("absent")}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    newStatus === "absent"
                      ? "border-danger bg-danger/15 font-black text-danger shadow-xs"
                      : "border-border bg-surface text-muted hover:text-text hover:bg-surface-raised"
                  }`}
                >
                  <UserX className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs">غائب</span>
                </button>
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text">سبب التعديل (اختياري)</label>
              <textarea
                rows={2}
                placeholder="مثلاً: حضر متأخر بعذر رسمي، تصحيح مسح خاطئ..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(null)}
                disabled={isSubmittingEdit}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitStatusChange}
                disabled={isSubmittingEdit}
                className="gap-2 font-bold"
              >
                {isSubmittingEdit ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري الحفظ والتوثيق...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>حفظ التعديل</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
