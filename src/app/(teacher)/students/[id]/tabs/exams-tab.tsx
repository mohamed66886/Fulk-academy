"use client";

import * as React from "react";
import { getStudentExams, type StudentExamRecord } from "@/lib/actions/students";
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
import { FileText, Award, Percent } from "lucide-react";

interface ExamsTabProps {
  studentId: string;
}

export function ExamsTab({ studentId }: ExamsTabProps) {
  const [exams, setExams] = React.useState<StudentExamRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadExams() {
      setIsLoading(true);
      try {
        const res = await getStudentExams(studentId);
        if (res.success && res.exams) {
          setExams(res.exams);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadExams();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="space-y-4" dir="rtl">
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  const averagePercentage =
    exams.length > 0
      ? Math.round(exams.reduce((acc, e) => acc + e.percentage, 0) / exams.length)
      : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Exams Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface/40 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">إجمالي الامتحانات</span>
            <h3 className="text-2xl font-black text-text mt-0.5">{exams.length}</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">متوسط النسبة المئوية</span>
            <h3 className="text-2xl font-black text-primary mt-0.5">{averagePercentage}%</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-success/20 bg-success/5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted">التقييم العام</span>
            <h3 className="text-base font-bold text-success mt-0.5">
              {averagePercentage >= 85
                ? "ممتاز 🌟"
                : averagePercentage >= 75
                  ? "جيد جداً 👍"
                  : averagePercentage >= 65
                    ? "جيد"
                    : "يحتاج لمتابعة"}
            </h3>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">سجل درجات الامتحانات والواجبات</CardTitle>
          </div>
          <CardDescription>
            تفاصيل جميع الاختبارات الدورية والنهائية ودرجة الطالب في كل اختبار.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الامتحان</TableHead>
                <TableHead>تاريخ الامتحان</TableHead>
                <TableHead className="text-center">الدرجة</TableHead>
                <TableHead className="text-center">النسبة المئوية</TableHead>
                <TableHead className="text-center">التقدير</TableHead>
                <TableHead>ملاحظات المعلم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  icon={<Award className="h-10 w-10 text-muted stroke-[1.5]" />}
                  title="لا توجد درجات امتحانات مسجلة"
                  description="لم يتم رصد درجات امتحانات لهذا الطالب بعد."
                />
              ) : (
                exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-bold text-text text-sm">{e.examName}</TableCell>

                    <TableCell className="text-xs text-muted">{e.examDate || "—"}</TableCell>

                    <TableCell className="text-center font-bold text-sm text-text">
                      {e.grade} / {e.finalGrade}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-black">
                        {e.percentage}%
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      {e.percentage >= 85 ? (
                        <Badge variant="success" size="sm">
                          ممتاز
                        </Badge>
                      ) : e.percentage >= 65 ? (
                        <Badge variant="primary" size="sm">
                          جيد
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          ضعيف
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted">{e.notes || "—"}</TableCell>
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
