"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getExamGrades, bulkSaveExamGrades, type ExamGradesData } from "@/lib/actions/exams";
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
import { toast } from "@/components/ui/toast";
import {
  Award,
  ArrowRight,
  Check,
  Calendar,
  Layers,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Edit2,
} from "lucide-react";

interface StudentGradeState {
  grade: string;
  notes: string;
}

export default function ExamGradeEntryPage() {
  const params = useParams();
  const examId = params.id as string;

  const [data, setData] = React.useState<ExamGradesData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Student grades in-memory state
  const [gradesMap, setGradesMap] = React.useState<Record<string, StudentGradeState>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

  // Load Exam and Students Data
  const loadExamData = React.useCallback(async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const res = await getExamGrades(examId);
      if (res.success && res.data) {
        setData(res.data);

        // Populate initial grades map
        const initialMap: Record<string, StudentGradeState> = {};
        res.data.students.forEach((s) => {
          initialMap[s.studentId] = {
            grade: s.grade !== null ? String(s.grade) : "",
            notes: s.notes || "",
          };
        });
        setGradesMap(initialMap);
      } else {
        toast.error(res.error || "تعذر تحميل بيانات رصد درجات الامتحان");
      }
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  React.useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  const finalGrade = data?.exam.finalGrade || 100;

  // Handle grade input change
  const handleGradeChange = (studentId: string, val: string) => {
    setGradesMap((prev) => {
      const current = prev[studentId] || { grade: "", notes: "" };
      return {
        ...prev,
        [studentId]: {
          grade: val,
          notes: current.notes,
        },
      };
    });
  };

  // Handle notes change
  const handleNotesChange = (studentId: string, val: string) => {
    setGradesMap((prev) => {
      const current = prev[studentId] || { grade: "", notes: "" };
      return {
        ...prev,
        [studentId]: {
          grade: current.grade,
          notes: val,
        },
      };
    });
  };

  // Quick fill buttons (e.g. Set all empty to 0 or full mark)
  const handleSetAllGrades = (value: string) => {
    if (!data) return;
    setGradesMap((prev) => {
      const updated = { ...prev };
      data.students.forEach((s) => {
        const cur = updated[s.studentId] || { grade: "", notes: "" };
        if (!cur.grade) {
          updated[s.studentId] = {
            grade: value,
            notes: cur.notes,
          };
        }
      });
      return updated;
    });
    toast.info(`تم تعبئة الدرجات الفارغة بالقيمة (${value})`);
  };

  // =========================================================================
  // REAL-TIME CLIENT-SIDE STATISTICS (Without server calls)
  // =========================================================================
  const stats = React.useMemo(() => {
    if (!data) {
      return {
        totalStudents: 0,
        recordedCount: 0,
        average: 0,
        averagePercentage: 0,
        highestGrade: 0,
        topStudents: [] as string[],
        lowestGrade: 0,
        hasErrors: false,
      };
    }

    const students = data.students;
    let sum = 0;
    let count = 0;
    let max = -1;
    let min = Infinity;
    const topNames: string[] = [];
    let hasValidationError = false;

    students.forEach((s) => {
      const entry = gradesMap[s.studentId];
      if (entry && entry.grade.trim() !== "") {
        const val = Number(entry.grade);
        if (!isNaN(val)) {
          if (val < 0 || val > finalGrade) {
            hasValidationError = true;
          } else {
            count++;
            sum += val;

            if (val > max) {
              max = val;
              topNames.length = 0;
              topNames.push(s.studentName);
            } else if (val === max) {
              topNames.push(s.studentName);
            }

            if (val < min) {
              min = val;
            }
          }
        }
      }
    });

    const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    const averagePercentage = finalGrade > 0 ? Math.round((average / finalGrade) * 100) : 0;

    return {
      totalStudents: students.length,
      recordedCount: count,
      average,
      averagePercentage,
      highestGrade: max >= 0 ? max : 0,
      topStudents: topNames,
      lowestGrade: min !== Infinity ? min : 0,
      hasErrors: hasValidationError,
    };
  }, [data, gradesMap, finalGrade]);

  // Bulk Save Submit
  const handleBulkSave = async () => {
    if (!data) return;

    if (stats.hasErrors) {
      toast.error(`يوجد درجات غير صحيحة تتجاوز الدرجة النهائية (${finalGrade}) أو سالبة`);
      return;
    }

    setIsSaving(true);
    try {
      const payloadGrades = data.students.map((s) => {
        const entry = gradesMap[s.studentId];
        const raw = entry?.grade?.trim();
        const num = raw !== "" && raw !== undefined ? Number(raw) : null;
        return {
          studentId: s.studentId,
          grade: num,
          notes: entry?.notes || undefined,
        };
      });

      const res = await bulkSaveExamGrades({
        examId,
        grades: payloadGrades,
      });

      if (!res.success) {
        toast.error(res.message || res.error || "فشل حفظ درجات الطلاب");
        return;
      }

      toast.success(res.message);
      // Reload updated info
      loadExamData();
    } catch {
      toast.error("حدث خطأ أثناء حفظ الدرجات");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="h-6 w-48 rounded bg-muted/20 animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
          <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center space-y-4" dir="rtl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-text">لم يتم العثور على الامتحان</h3>
        <p className="text-xs text-muted">ربما تم حذف الامتحان أو أن المعرف غير صحيح.</p>
        <Link href="/exams">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة لقائمة الامتحانات
          </Button>
        </Link>
      </div>
    );
  }

  const { exam, students } = data;

  // Filter students by name/phone query
  const filteredStudents = students.filter(
    (s) =>
      !searchQuery.trim() ||
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      s.studentPhone.includes(searchQuery.trim())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/exams" className="hover:text-primary transition-colors">
          الامتحانات
        </Link>
        <span>/</span>
        <span className="text-text font-bold">{exam.name}</span>
        <span>/</span>
        <span className="text-text font-bold">رصد الدرجات</span>
      </div>

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">{exam.name}</h1>
            <Badge variant="primary" className="text-xs font-bold gap-1 font-mono">
              الدرجة النهائية: {finalGrade} درجة
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted font-medium">
            <span className="flex items-center gap-1 font-bold text-text">
              <Layers className="h-3.5 w-3.5 text-primary" />
              {exam.groupName} ({exam.className})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              تاريخ: {exam.examDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-text">
              <Users className="h-3.5 w-3.5 text-muted" />
              {students.length} طالب بالمجموعة
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link href={`/exams/${exam.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
              <Edit2 className="h-3.5 w-3.5" />
              <span>تعديل الامتحان</span>
            </Button>
          </Link>

          <Button
            onClick={handleBulkSave}
            disabled={isSaving || stats.hasErrors}
            className="gap-2 font-bold shadow-sm bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm"
          >
            <Check className="h-4 w-4" />
            <span>{isSaving ? "جاري الحفظ..." : `حفظ جميع الدرجات (${stats.recordedCount})`}</span>
          </Button>
        </div>
      </div>

      {/* Real-time Statistics Summary Cards (Top overview) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted">الطلاب المرصود لهم</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-2xl font-black text-text">{stats.recordedCount}</h3>
              <span className="text-xs text-muted">/ {stats.totalStudents}</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{
                  width: `${stats.totalStudents > 0 ? (stats.recordedCount / stats.totalStudents) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-primary">المتوسط العام</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h3 className="text-2xl font-black text-primary font-mono">{stats.average}</h3>
              <span className="text-xs text-muted">من {finalGrade}</span>
            </div>
            <span className="text-[11px] font-bold text-muted mt-1 block">
              نسبة الدفعة: {stats.averagePercentage}%
            </span>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-success">أعلى درجة</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-2xl font-black text-success font-mono">
                {stats.recordedCount > 0 ? stats.highestGrade : "—"}
              </h3>
            </div>
            <span
              className="text-[11px] text-muted truncate block mt-1"
              title={stats.topStudents.join("، ")}
            >
              {stats.topStudents.length > 0
                ? `${stats.topStudents[0]}${stats.topStudents.length > 1 ? ` (+${stats.topStudents.length - 1})` : ""}`
                : "لم تُرصد بعد"}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-danger">أقل درجة</span>
              <TrendingDown className="h-4 w-4 text-danger" />
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <h3 className="text-2xl font-black text-danger font-mono">
                {stats.recordedCount > 0 ? stats.lowestGrade : "—"}
              </h3>
            </div>
            <span className="text-[11px] text-muted mt-1 block">من المسجلين حالياً</span>
          </CardContent>
        </Card>
      </div>

      {/* Validation Error Alert */}
      {stats.hasErrors && (
        <div className="p-3.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            تنبيه: يوجد طالب أو أكثر تم إدخال درجة له تتجاوز الدرجة النهائية ({finalGrade}) أو
            سالبة. يرجى تصحيح الدرجات المظللة بالأحمر قبل الحفظ.
          </span>
        </div>
      )}

      {/* Grades Entry Table */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-text">قائمة طلاب المجموعة</span>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredStudents.length} طالب
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Quick Fill Dropdown / Buttons */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSetAllGrades(String(finalGrade))}
              className="text-xs h-8 gap-1 font-bold"
            >
              <Sparkles className="h-3 w-3 text-warning" />
              <span>تعبئة الكل بالنهائية ({finalGrade})</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSetAllGrades("0")}
              className="text-xs h-8 font-bold"
            >
              تعبئة الباقي (0)
            </Button>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Input
                placeholder="بحث باسم الطالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 text-xs h-8"
              />
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">اسم الطالب</TableHead>
                  <TableHead className="w-36">رقم الهاتف</TableHead>
                  <TableHead className="w-48 text-center">
                    الدرجة المستحقة (من {finalGrade})
                  </TableHead>
                  <TableHead className="w-28 text-center">النسبة المئوية</TableHead>
                  <TableHead className="min-w-[220px]">ملاحظات (اختياري)</TableHead>
                  <TableHead className="w-24 text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableEmpty
                    colSpan={7}
                    title="لا يوجد طلاب مطابقون"
                    description="لم يتم العثور على أي طالب يطابق البحث."
                    icon={<Users className="h-10 w-10 stroke-[1.5]" />}
                  />
                ) : (
                  filteredStudents.map((student, idx) => {
                    const entry = gradesMap[student.studentId] || { grade: "", notes: "" };
                    const rawGrade = entry.grade.trim();
                    const numGrade = rawGrade !== "" ? Number(rawGrade) : null;
                    const isInvalid =
                      numGrade !== null &&
                      (isNaN(numGrade) || numGrade < 0 || numGrade > finalGrade);
                    const percentage =
                      numGrade !== null && !isNaN(numGrade) && finalGrade > 0
                        ? Math.round((numGrade / finalGrade) * 100)
                        : null;

                    return (
                      <TableRow
                        key={student.studentId}
                        className={`hover:bg-surface-raised/60 transition-colors ${
                          isInvalid ? "bg-danger/5" : ""
                        }`}
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

                        {/* Grade Input Column */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <Input
                              type="number"
                              min="0"
                              max={finalGrade}
                              step="0.5"
                              placeholder="—"
                              value={entry.grade}
                              onChange={(e) => handleGradeChange(student.studentId, e.target.value)}
                              className={`w-28 text-center font-mono font-bold text-sm transition-all ${
                                isInvalid
                                  ? "border-danger ring-1 ring-danger text-danger bg-danger/10"
                                  : rawGrade !== ""
                                    ? "border-primary/50 text-primary font-black bg-primary/5"
                                    : ""
                              }`}
                            />
                            {isInvalid && (
                              <span className="text-[10px] text-danger font-bold mt-0.5">
                                الحد الأقصى {finalGrade}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Percentage Column */}
                        <TableCell className="text-center">
                          {percentage !== null ? (
                            <Badge
                              variant={
                                percentage >= 85
                                  ? "success"
                                  : percentage >= 60
                                    ? "warning"
                                    : "danger"
                              }
                              className="font-mono text-xs font-bold"
                            >
                              {percentage}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </TableCell>

                        {/* Notes Column */}
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="مثلاً: غياب بعذر، متميز..."
                            value={entry.notes}
                            onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                            className="text-xs h-8"
                          />
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          {rawGrade !== "" && !isInvalid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              مرصود
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted">فارغ</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Bottom Bar with Real-time Stats & Bulk Save Button */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-surface/95 backdrop-blur-md p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Real-time Stats summary pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 bg-surface-raised px-3 py-1.5 rounded-xl border border-border">
            <span className="text-muted">المتوسط:</span>
            <span className="font-bold font-mono text-primary text-sm">{stats.average}</span>
            <span className="text-[11px] text-muted">({stats.averagePercentage}%)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-raised px-3 py-1.5 rounded-xl border border-border">
            <span className="text-muted">الأعلى:</span>
            <span className="font-bold font-mono text-success text-sm">{stats.highestGrade}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-raised px-3 py-1.5 rounded-xl border border-border">
            <span className="text-muted">الأقل:</span>
            <span className="font-bold font-mono text-danger text-sm">{stats.lowestGrade}</span>
          </div>

          <div className="text-muted text-[11px] font-medium hidden md:inline">
            تم رصد {stats.recordedCount} من أصل {stats.totalStudents} طالب
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadExamData}
            disabled={isSaving}
            className="gap-1.5 text-xs font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إلغاء التغييرات</span>
          </Button>

          <Button
            type="button"
            onClick={handleBulkSave}
            disabled={isSaving || stats.hasErrors}
            className="gap-2 font-bold shadow-md text-xs sm:text-sm px-5"
          >
            <Check className="h-4 w-4" />
            <span>
              {isSaving ? "جاري الحفظ الجماعي..." : `حفظ جماعي (${stats.recordedCount} درجات)`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
