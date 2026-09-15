"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useClasses, queryKeys } from "@/hooks/use-cached-data";
import { deleteClass, type ClassListItem } from "@/lib/actions/classes";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { GraduationCap, Plus, Search, Eye, Edit2, Trash2, AlertTriangle } from "lucide-react";

export default function ClassesListPage() {
  const queryClient = useQueryClient();
  const { data: classesData, isLoading } = useClasses();
  const classes = classesData?.success && classesData.classes ? classesData.classes : [];

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 8;

  // Debounce search query (350ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = React.useState<ClassListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteClass(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الصف الدراسي");
        return;
      }
      toast.success("تم نقل الصف الدراسي إلى سلة المحذوفات بنجاح");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.classes() });
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter by debounced search query
  const filteredClasses = React.useMemo(() => {
    if (!debouncedSearchQuery.trim()) return classes;
    const q = debouncedSearchQuery.toLowerCase().trim();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [classes, debouncedSearchQuery]);

  // Pagination calculation
  const totalCount = filteredClasses.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + pageSize < totalCount;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">الصفوف الدراسية</h1>
            <Badge variant="primary" size="sm">
              {classes.length} صف
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            إدارة المراحل والصفوف التعليمية وتوزيع المجموعات والطلاب.
          </p>
        </div>

        <Link href="/classes/create">
          <Button size="md" className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>إضافة صف جديد</span>
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="بحث باسم الصف الدراسي أو الوصف..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-3"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* Classes Table */}
      <div className="space-y-2">
        <Table stickyHeader>
          <TableHeader>
            <TableRow>
              <TableHead>اسم الصف الدراسي</TableHead>
              <TableHead className="text-center">عدد المجموعات</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : paginatedClasses.length === 0 ? (
              <TableEmpty
                colSpan={5}
                icon={<GraduationCap className="h-10 w-10 text-muted stroke-[1.5]" />}
                title="لا توجد صفوف دراسية"
                description={
                  searchQuery
                    ? "لا توجد صفوف تطابق كلمة البحث."
                    : "ابدأ بإضافة أول صف دراسي (مثل: الصف الأول الثانوي) لتنظيم المجموعات."
                }
              />
            ) : (
              paginatedClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/classes/${cls.id}`}
                          className="font-bold text-text hover:text-primary transition-colors text-sm"
                        >
                          {cls.name}
                        </Link>
                        {cls.description && (
                          <span className="text-[11px] text-muted line-clamp-1">
                            {cls.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-text">
                      {cls.groupsCount} مجموعة
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold">
                      {cls.studentsCount} طالب
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    {cls.status === "active" ? (
                      <Badge variant="success" dot>
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="default">مؤرشف</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link href={`/classes/${cls.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="عرض التفاصيل والمجموعات"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/classes/${cls.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-text"
                          title="تعديل بيانات الصف"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted hover:text-danger"
                        title="حذف الصف"
                        onClick={() => setDeleteTarget(cls)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <Pagination
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={() => setCurrentPage((p) => p + 1)}
            onPrevPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="صف"
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="تأكيد حذف الصف الدراسي"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/10 text-danger shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text">
                هل أنت متأكد من حذف &quot;{deleteTarget?.name}&quot;؟
              </p>
              <p className="text-xs text-muted leading-relaxed">
                سيتم نقل الصف الدراسي إلى سلة المحذوفات (Soft Delete) مع الاحتفاظ بالبيانات وإمكانية
                استرجاعه لاحقًا.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              type="button"
              isLoading={isDeleting}
              onClick={handleDelete}
              className="font-bold"
            >
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
