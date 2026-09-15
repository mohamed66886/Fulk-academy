"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getExam,
  updateExam,
  getClassesAndGroupsForExams,
  type ExamListItem,
} from "@/lib/actions/exams";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  ClipboardList,
  ArrowRight,
  Check,
  Calendar,
  Layers,
  Award,
  BookOpen,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = React.useState<
    Array<{ id: string; name: string; classId: string; className: string }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [finalGrade, setFinalGrade] = React.useState("100");
  const [examDate, setExamDate] = React.useState("");
  const [originalExam, setOriginalExam] = React.useState<ExamListItem | null>(null);

  // Load Exam Data and Filters
  React.useEffect(() => {
    async function loadData() {
      if (!examId) return;
      setIsLoading(true);
      try {
        const [filtersRes, examRes] = await Promise.all([
          getClassesAndGroupsForExams(),
          getExam(examId),
        ]);

        if (filtersRes.success) {
          setClasses(filtersRes.classes);
          setGroups(filtersRes.groups);
        }

        if (examRes.success && examRes.exam) {
          const ex = examRes.exam;
          setOriginalExam(ex);
          setName(ex.name);
          setClassId(ex.classId);
          setGroupId(ex.groupId);
          setFinalGrade(String(ex.finalGrade));
          setExamDate(ex.examDate);
        } else {
          toast.error(examRes.error || "تعذر العثور على الامتحان");
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [examId]);

  const filteredGroups = classId ? groups.filter((g) => g.classId === classId) : groups;

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    const available = groups.filter((g) => g.classId === newClassId);
    const firstGroup = available[0];
    setGroupId(firstGroup ? firstGroup.id : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("اسم الامتحان مطلوب");
      return;
    }
    if (!classId) {
      toast.error("يرجى اختيار الصف الدراسي");
      return;
    }
    if (!groupId) {
      toast.error("يرجى اختيار المجموعة");
      return;
    }
    const numGrade = Number(finalGrade);
    if (isNaN(numGrade) || numGrade <= 0) {
      toast.error("الدرجة النهائية يجب أن تكون رقماً أكبر من صفر");
      return;
    }
    if (!examDate) {
      toast.error("يرجى تحديد تاريخ الامتحان");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateExam(examId, {
        name: name.trim(),
        classId,
        groupId,
        finalGrade: numGrade,
        examDate,
      });

      if (!res.success) {
        toast.error(res.error || "فشل تعديل الامتحان");
        return;
      }

      toast.success("تم تعديل بيانات الامتحان بنجاح!");
      router.push(`/exams/${examId}`);
    } catch {
      toast.error("حدث خطأ أثناء حفظ التعديل");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="h-6 w-48 rounded bg-muted/20 animate-pulse" />
        <div className="h-40 rounded-2xl bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  if (!originalExam) {
    return (
      <div className="p-12 text-center space-y-4" dir="rtl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-text">الامتحان غير موجود</h3>
        <Link href="/exams">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة للامتحانات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/exams" className="hover:text-primary transition-colors">
          الامتحانات
        </Link>
        <span>/</span>
        <Link href={`/exams/${examId}`} className="hover:text-primary transition-colors">
          {originalExam.name}
        </Link>
        <span>/</span>
        <span className="text-text font-bold">تعديل بيانات الامتحان</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
              تعديل بيانات الامتحان
            </h1>
            <p className="text-xs md:text-sm text-muted">
              تعديل اسم الامتحان، المجموعة، والدرجة النهائية والتاريخ.
            </p>
          </div>
        </div>

        <Link href={`/exams/${examId}`}>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
            <ArrowRight className="h-4 w-4" />
            <span>إلغاء</span>
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card className="border-border bg-surface shadow-xs">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            تعديل بيانات الامتحان
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Exam Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text">
                اسم / عنوان الامتحان <span className="text-danger">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-sm font-semibold"
              />
            </div>

            {/* Class and Group Linkage (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted" />
                  الصف الدراسي <span className="text-danger">*</span>
                </label>
                <Select
                  value={classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted" />
                  المجموعة الدراسية <span className="text-danger">*</span>
                </label>
                <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Final Grade and Exam Date (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-muted" />
                  الدرجة النهائية <span className="text-danger">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={finalGrade}
                  onChange={(e) => setFinalGrade(e.target.value)}
                  required
                  className="font-mono text-sm font-bold"
                />
                <p className="text-[11px] text-muted">
                  ملاحظة: إذا تم تغيير الدرجة النهائية، ستتم إعادة حساب النسب المئوية للطلاب
                  المسجلين تلقائياً.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted" />
                  تاريخ إجراء الامتحان <span className="text-danger">*</span>
                </label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <Link href={`/exams/${examId}`}>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  إلغاء
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 font-bold px-6 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
