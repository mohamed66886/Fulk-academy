"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useGroups, useClassesForSelect } from "@/hooks/use-cached-data";
import { deleteGroup, type GroupListItem } from "@/lib/actions/groups";
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
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { DAY_LABELS } from "@/lib/validators/group";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
  Building2,
  Layers,
} from "lucide-react";

export default function GroupsListPage() {
  const queryClient = useQueryClient();
  const { data: groupsData, isLoading: isGroupsLoading } = useGroups();
  const { data: classesData } = useClassesForSelect();

  const groups = groupsData?.success && groupsData.groups ? groupsData.groups : [];
  const classesList = classesData || [];
  const isLoading = isGroupsLoading && groups.length === 0;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [selectedClassFilter, setSelectedClassFilter] = React.useState("all");
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
  const [deleteTarget, setDeleteTarget] = React.useState<GroupListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteGroup(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || "فشل حذف المجموعة الدراسية");
        return;
      }
      toast.success("تم نقل المجموعة الدراسية إلى سلة المحذوفات بنجاح");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter groups based on search query and class filter
  const filteredGroups = React.useMemo(() => {
    return groups.filter((group) => {
      const matchesSearch =
        group.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        group.className.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesClass = selectedClassFilter === "all" || group.classId === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [groups, debouncedSearchQuery, selectedClassFilter]);

  // Pagination calculations
  const totalCount = filteredGroups.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + pageSize < totalCount;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">المجموعات الدراسية</h1>
            <Badge variant="primary" size="sm">
              {groups.length} مجموعة
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            إدارة مواعيد الحصص الأسبوعية، توزيع الطلاب، وأسعار الاشتراكات وسناتر التدريس.
          </p>
        </div>

        <Link href="/groups/create">
          <Button size="md" className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>إضافة مجموعة جديدة</span>
          </Button>
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Input
            placeholder="بحث باسم المجموعة أو الصف الدراسي..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-3"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>

        {/* Class Filter */}
        <div className="w-full sm:w-60 shrink-0">
          <Select
            value={selectedClassFilter}
            onChange={(e) => {
              setSelectedClassFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">جميع الصفوف الدراسية</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Groups Table */}
      <div className="space-y-2">
        <Table stickyHeader>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المجموعة والصف</TableHead>
              <TableHead>المواعيد الأسبوعية</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">السعر الشهري</TableHead>
              <TableHead className="text-center">السنتر</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={4} cols={7} />
            ) : paginatedGroups.length === 0 ? (
              <TableEmpty
                colSpan={7}
                icon={<Users className="h-10 w-10 text-muted stroke-[1.5]" />}
                title="لا توجد مجموعات دراسية"
                description={
                  searchQuery || selectedClassFilter !== "all"
                    ? "لا توجد نتائج تطابق معايير البحث والفلترة المحددة."
                    : "ابدأ بإضافة أول مجموعة وتحديد مواعيد حصصها الأسبوعية."
                }
              />
            ) : (
              paginatedGroups.map((group) => (
                <TableRow key={group.id}>
                  {/* Group Name & Class */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/groups/${group.id}`}
                          className="font-bold text-text hover:text-primary transition-colors text-sm"
                        >
                          {group.name}
                        </Link>
                        <span className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                          <Layers className="h-3 w-3 text-muted" />
                          {group.className}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Schedule */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {group.schedule && group.schedule.length > 0 ? (
                        group.schedule.map((sch, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-text"
                          >
                            <Calendar className="h-2.5 w-2.5 text-primary" />
                            {DAY_LABELS[sch.day]} {sch.startTime}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted">غير محدد</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Students Count */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold">
                      {group.studentsCount} طالب
                    </span>
                  </TableCell>

                  {/* Monthly Price */}
                  <TableCell className="text-center font-bold text-text text-sm">
                    {group.price > 0 ? `${group.price} ج.م` : "مجانية"}
                  </TableCell>

                  {/* Center Badge */}
                  <TableCell className="text-center">
                    {group.hasCenter ? (
                      <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-text">
                        <Building2 className="h-3 w-3 text-primary" />
                        {group.centerSessionPrice !== undefined && group.centerSessionPrice > 0
                          ? `${group.centerSessionPrice} ج/حصة`
                          : "سنتر"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">خاص/أونلاين</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {group.status === "active" ? (
                      <Badge variant="success" dot>
                        نشطة
                      </Badge>
                    ) : (
                      <Badge variant="default">مؤرشفة</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/groups/${group.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-text"
                          title="عرض تفاصيل المجموعة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Link href={`/groups/${group.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="تعديل المجموعة"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(group)}
                        className="h-8 w-8 p-0 text-muted hover:text-danger"
                        title="حذف المجموعة"
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

        {/* Pagination footer */}
        {totalCount > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              onNextPage={() => setCurrentPage((p) => p + 1)}
              onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
              totalCount={totalCount}
              pageSize={pageSize}
              itemLabel="مجموعة"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="تأكيد حذف المجموعة الدراسية"
      >
        <div className="space-y-4" dir="rtl">
          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-text">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-text">
                هل أنت متأكد من رغبتك في نقل المجموعة الدراسية &quot;{deleteTarget?.name}&quot; إلى
                سلة المحذوفات؟
              </p>
              <p className="text-xs text-muted leading-relaxed">
                سيتم إخفاء المجموعة من الجداول الحالية مع الاحتفاظ ببيانات الطلاب والحضور المسجلة
                سابقاً في سلة المحذوفات.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="font-bold gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>نقل للمحذوفات</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
