"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createExam, getClassesAndGroupsForExams } from "@/lib/actions/exams";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { ClipboardList, ArrowRight, Check, Calendar, Layers, Award, BookOpen } from "lucide-react";

export default function CreateExamPage() {
  const router = useRouter();

  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = React.useState<
    Array<{ id: string; name: string; classId: string; className: string }>
  >([]);
  const [isLoadingFilters, setIsLoadingFilters] = React.useState(true);

  // Form state
  const [name, setName] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [finalGrade, setFinalGrade] = React.useState("100");
  const [examDate, setExamDate] = React.useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load Classes & Groups
  React.useEffect(() => {
    async function loadData() {
      setIsLoadingFilters(true);
      try {
        const res = await getClassesAndGroupsForExams();
        if (res.success) {
          setClasses(res.classes);
          setGroups(res.groups);
          if (res.classes.length > 0) {
            const firstClass = res.classes[0];
            if (firstClass) {
              setClassId(firstClass.id);
              const firstGroup = res.groups.find((g) => g.classId === firstClass.id);
              if (firstGroup) setGroupId(firstGroup.id);
            }
          }
        }
      } finally {
        setIsLoadingFilters(false);
      }
    }
    loadData();
  }, []);

  // Filter groups by class
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
      toast.error("يرجى إدخال عنوان أو اسم الامتحان");
      return;
    }
    if (!classId) {
      toast.error("يرجى اختيار الصف الدراسي");
      return;
    }
    if (!groupId) {
      toast.error("يرجى اختيار المجموعة الدراسية");
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
      const res = await createExam({
        name: name.trim(),
        classId,
        groupId,
        finalGrade: numGrade,
        examDate: format(examDate, "yyyy-MM-dd"),
      });

      if (!res.success || !res.examId) {
        toast.error(res.error || "فشل إنشاء الامتحان");
        return;
      }

      toast.success("تم إنشاء الامتحان بنجاح! جاري الانتقال لرصد الدرجات...");
      router.push(`/exams/${res.examId}`);
    } catch {
      toast.error("حدث خطأ أثناء حفظ الامتحان");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Link href="/exams" className="hover:text-primary transition-colors">
          الامتحانات
        </Link>
        <span>/</span>
        <span className="text-text font-bold">إضافة امتحان جديد</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
              إضافة امتحان جديد
            </h1>
            <p className="text-xs md:text-sm text-muted">
              حدد اسم الامتحان والمجموعة والدرجة النهائية لبدء رصد درجات الطلاب.
            </p>
          </div>
        </div>

        <Link href="/exams">
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
            بيانات الامتحان الأساسية
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
                placeholder="مثلاً: امتحان شهر أكتوبر — الباب الأول..."
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
                  disabled={isLoadingFilters || classes.length === 0}
                  required
                >
                  <option value="" disabled>
                    اختر الصف الدراسي...
                  </option>
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
                <Select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={isLoadingFilters || filteredGroups.length === 0}
                  required
                >
                  <option value="" disabled>
                    {filteredGroups.length === 0
                      ? "لا توجد مجموعات بهذا الصف"
                      : "اختر المجموعة الدراسية..."}
                  </option>
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
                  الدرجة النهائية (الدرجة العظمى) <span className="text-danger">*</span>
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
                  الدرجة الكاملة للامتحان (مثلاً 50 أو 100). لن يُسمح برصد درجة أعلى منها لأي طالب.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted" />
                  تاريخ إجراء الامتحان <span className="text-danger">*</span>
                </label>
                <DatePicker date={examDate} setDate={setExamDate} />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <Link href="/exams">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  إلغاء
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 font-bold px-6 shadow-sm"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? "جاري الإنشاء..." : "حفظ وبدء رصد الدرجات"}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
