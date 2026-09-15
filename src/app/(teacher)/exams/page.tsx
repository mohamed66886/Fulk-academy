"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useExams, useClassesAndGroupsForExams } from "@/hooks/use-cached-data";
import {
  deleteExam,
  type ExamListItem,
} from "@/lib/actions/exams";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import {
  ClipboardList,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
} from "lucide-react";

export default function ExamsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Cached Classes and Groups
  const { data: filtersData } = useClassesAndGroupsForExams();
  const classes = filtersData?.success && filtersData.classes ? filtersData.classes : [];
  const groups = filtersData?.success && filtersData.groups ? filtersData.groups : [];

  // Debounce search query (350ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = React.useState<ExamListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Cached Exams
  const examParams = React.useMemo(
    () => ({
      page: currentPage,
      pageSize,
      classId: selectedClassId || undefined,
      groupId: selectedGroupId || undefined,
      query: debouncedSearchQuery || undefined,
    }),
    [currentPage, pageSize, selectedClassId, selectedGroupId, debouncedSearchQuery]
  );

  const { data: examsRes, isLoading } = useExams(examParams);
  const exams = examsRes?.success && examsRes.exams ? examsRes.exams : [];
  const totalPages = examsRes?.success && examsRes.totalPages ? examsRes.totalPages : 1;
  const totalCount = examsRes?.success && examsRes.totalCount ? examsRes.totalCount : 0;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClassId("");
    setSelectedGroupId("");
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteExam(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الامتحان");
        return;
      }
      toast.success("تم نقل الامتحان إلى سلة المحذوفات بنجاح");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter groups dropdown based on selectedClassId
  const filteredGroups = selectedClassId
    ? groups.filter((g) => g.classId === selectedClassId)
    : groups;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-text tracking-tight">
                إدارة الامتحانات والدرجات
              </h1>
              <p className="text-xs md:text-sm text-muted">
                إنشاء وتتبع الامتحانات الدورية والشهرية، ورصد درجات الطلاب وحساب الإحصائيات.
              </p>
            </div>
          </div>
        </div>

        <Link href="/exams/create">
          <Button className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>إضافة امتحان جديد</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-surface shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-text flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-muted" />
                بحث باسم الامتحان
              </label>
              <Input
                placeholder="ابحث باسم الامتحان..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-text">تصفية بالصف</label>
              <Select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedGroupId("");
                  setCurrentPage(1);
                }}
              >
                <option value="">جميع الصفوف الدراسية</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-text">تصفية بالمجموعة</label>
              <Select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">جميع المجموعات</option>
                {filteredGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.className}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="w-full gap-1.5 font-bold text-xs"
                disabled={!searchQuery && !selectedClassId && !selectedGroupId}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <CardTitle className="text-base font-bold">قائمة الامتحانات</CardTitle>
            <p className="text-xs text-muted mt-0.5">
              الامتحانات المجدولة والمنعقدة ومعدل رصد الدرجات لكل مجموعة.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold">
            {totalCount} امتحان
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم الامتحان</TableHead>
                  <TableHead>الصف والمجموعة</TableHead>
                  <TableHead className="text-center">الدرجة النهائية</TableHead>
                  <TableHead>تاريخ الامتحان</TableHead>
                  <TableHead className="text-center">الدرجات المرصودة</TableHead>
                  <TableHead className="text-center">متوسط الدرجات</TableHead>
                  <TableHead className="text-left pl-4">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableSkeleton cols={8} rows={5} />
                ) : exams.length === 0 ? (
                  <TableEmpty
                    colSpan={8}
                    title="لا توجد امتحانات مسجلة"
                    description="لم يتم العثور على أي امتحان يطابق معايير البحث المحددة."
                    icon={<ClipboardList className="h-10 w-10 stroke-[1.5]" />}
                  />
                ) : (
                  exams.map((exam, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const hasResults = (exam.resultsCount || 0) > 0;

                    return (
                      <TableRow
                        key={exam.id}
                        className="hover:bg-surface-raised/60 transition-colors"
                      >
                        <TableCell className="text-center font-bold text-muted text-xs">
                          {rowNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/exams/${exam.id}`}
                              className="font-bold text-sm text-text hover:text-primary transition-colors"
                            >
                              {exam.name}
                            </Link>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-text text-xs">
                              {exam.groupName || "—"}
                            </span>
                            <span className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                              <Layers className="h-3 w-3 text-muted" />
                              {exam.className || "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="font-mono font-bold text-xs bg-surface px-2.5 py-1 rounded-lg border border-border">
                            {exam.finalGrade} درجة
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-text">
                            <Calendar className="h-3.5 w-3.5 text-muted" />
                            {exam.examDate}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant={hasResults ? "success" : "warning"}
                            className="font-bold text-xs"
                          >
                            {exam.resultsCount || 0} طالب
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          {hasResults ? (
                            <span className="font-bold text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {exam.averageGrade} / {exam.finalGrade}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">لم يُرصد</span>
                          )}
                        </TableCell>

                        <TableCell className="text-left pl-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/exams/${exam.id}`}>
                              <Button
                                size="sm"
                                variant="primary"
                                className="gap-1.5 text-xs font-bold shadow-xs"
                              >
                                <Award className="h-3.5 w-3.5" />
                                <span>رصد الدرجات</span>
                              </Button>
                            </Link>

                            <Link href={`/exams/${exam.id}/edit`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                title="تعديل بيانات الامتحان"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-muted" />
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteTarget(exam)}
                              className="h-8 w-8 p-0 text-danger hover:bg-danger/10 border-danger/20"
                              title="حذف الامتحان"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                itemLabel="امتحان"
                isLoading={isLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal isOpen={true} onClose={() => setDeleteTarget(null)} title="تأكيد حذف الامتحان">
          <div className="space-y-4" dir="rtl">
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 flex items-start gap-2.5 text-xs text-danger">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تحذير حذف الامتحان</p>
                <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف الامتحان{" "}
                  <strong className="text-text">{deleteTarget.name}</strong>؟ سيتم نقل الامتحان لسلة
                  المحذوفات ولن يظهر في قائمة الامتحانات النشطة.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5 font-bold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
