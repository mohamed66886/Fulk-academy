"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useStudents, useClassesForSelect, useGroups } from "@/hooks/use-cached-data";
import { deleteStudent, toggleStudentBlock, type StudentListItem } from "@/lib/actions/students";
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
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock3,
  Ban,
  ShieldCheck,
} from "lucide-react";

export default function StudentsListPage() {
  const queryClient = useQueryClient();

  // Filters & Search
  const [rawSearch, setRawSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("all");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "blocked">("all");

  // Sorting
  const [sortBy, setSortBy] = React.useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(20);

  // Cached Filter options
  const { data: classesData } = useClassesForSelect();
  const { data: groupsData } = useGroups();
  const classesList = classesData || [];
  const groupsList = React.useMemo(() => {
    if (groupsData?.success && groupsData.groups) {
      return groupsData.groups.map((g) => ({
        id: g.id,
        name: g.name,
        classId: g.classId,
      }));
    }
    return [];
  }, [groupsData]);

  // Modals state
  const [deleteTarget, setDeleteTarget] = React.useState<StudentListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [blockTarget, setBlockTarget] = React.useState<StudentListItem | null>(null);
  const [isTogglingBlock, setIsTogglingBlock] = React.useState(false);

  // Debounce search input (350ms)
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [rawSearch]);

  // Filter groups dropdown based on selected class
  const availableFilterGroups = React.useMemo(() => {
    if (classFilter === "all") return groupsList;
    return groupsList.filter((g) => g.classId === classFilter);
  }, [groupsList, classFilter]);

  // Cached Students query
  const queryParams = React.useMemo(
    () => ({
      search: debouncedSearch,
      classId: classFilter,
      groupId: groupFilter,
      status: statusFilter,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
    [debouncedSearch, classFilter, groupFilter, statusFilter, sortBy, sortOrder, page, pageSize]
  );

  const { data: studentsRes, isLoading } = useStudents(queryParams);
  const students = studentsRes?.success && studentsRes.students ? studentsRes.students : [];
  const totalCount = studentsRes?.success && studentsRes.totalCount ? studentsRes.totalCount : 0;

  // Handle Soft Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteStudent(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الطالب");
        return;
      }
      toast.success("تم نقل الطالب إلى سلة المحذوفات بنجاح");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Block / Unblock Toggle
  const handleToggleBlock = async () => {
    if (!blockTarget) return;
    setIsTogglingBlock(true);
    try {
      const res = await toggleStudentBlock(blockTarget.id);
      if (!res.success) {
        toast.error(res.error || "فشل تغيير حالة الطالب");
        return;
      }
      toast.success(
        res.newStatus === "blocked" ? "تم حظر الطالب بنجاح" : "تم إلغاء حظر الطالب بنجاح"
      );
      setBlockTarget(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    } finally {
      setIsTogglingBlock(false);
    }
  };

  // Toggle sort order
  const toggleSort = (column: "createdAt" | "name") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(column === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text tracking-tight">سجل الطلاب</h1>
            <Badge variant="primary" size="sm">
              {totalCount} طالب
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            إدارة بيانات الطلاب المسجلين، الاشتراكات الشهرية، بطاقات الحضور، ومتابعة أولياء الأمور.
          </p>
        </div>

        <Link href="/students/create">
          <Button size="md" className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>إضافة طالب جديد</span>
          </Button>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Debounced Search */}
        <div className="relative sm:col-span-2">
          <Input
            placeholder="بحث بالاسم، رقم الطالب، أو رقم ولي الأمر..."
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            className="pl-9 pr-3"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>

        {/* Class Filter */}
        <div>
          <Select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setGroupFilter("all");
              setPage(1);
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

        {/* Group Filter */}
        <div>
          <Select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">جميع المجموعات</option>
            {availableFilterGroups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "blocked");
              setPage(1);
            }}
          >
            <option value="all">جميع الحالات</option>
            <option value="active">الطلاب النشطون</option>
            <option value="blocked">الطلاب المحظورون</option>
          </Select>
        </div>
      </div>

      {/* Sort & Page Size Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">ترتيب حسب:</span>
          <Button
            type="button"
            variant={sortBy === "name" ? "primary" : "outline"}
            size="sm"
            onClick={() => toggleSort("name")}
            className="h-8 gap-1 text-xs"
          >
            <span>الاسم</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant={sortBy === "createdAt" ? "primary" : "outline"}
            size="sm"
            onClick={() => toggleSort("createdAt")}
            className="h-8 gap-1 text-xs"
          >
            <span>تاريخ التسجيل</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>

        {/* User Selectable Page Size (20 / 50 / 100) */}
        <div className="flex items-center gap-2">
          <span>عرض بالصفحة:</span>
          <div className="flex items-center gap-1">
            {[20, 50, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setPageSize(size);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  pageSize === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface hover:bg-surface/80 text-muted border border-border"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="space-y-2">
        <Table stickyHeader>
          <TableHeader>
            <TableRow>
              <TableHead>الطالب</TableHead>
              <TableHead>الصف الدراسي</TableHead>
              <TableHead>المجموعة</TableHead>
              <TableHead>أرقام التواصل</TableHead>
              <TableHead className="text-center">حالة الطالب</TableHead>
              <TableHead className="text-center">دفع الشهر الحالي</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : students.length === 0 ? (
              <TableEmpty
                colSpan={7}
                icon={<Users className="h-10 w-10 text-muted stroke-[1.5]" />}
                title="لا يوجد طلاب مسجلون"
                description={
                  rawSearch || classFilter !== "all" || groupFilter !== "all"
                    ? "لا توجد نتائج مطابقة لمعايير البحث والفلترة."
                    : "ابدأ بتسجيل أول طالب في إحدى المجموعات الدراسية."
                }
              />
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  {/* Student Avatar & Name */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold overflow-hidden">
                        {student.photoUrl ? (
                          <Image
                            src={student.photoUrl}
                            alt={student.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span>{student.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-bold text-text hover:text-primary transition-colors text-sm"
                        >
                          {student.name}
                        </Link>
                        <span className="text-[11px] text-muted font-medium">
                          {student.finalPrice} ج.م شهرياً
                          {student.discount > 0 && ` (خصم ${student.discount} ج)`}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Class Name */}
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-text">
                      <Layers className="h-3 w-3 text-primary" />
                      {student.className}
                    </span>
                  </TableCell>

                  {/* Group Name */}
                  <TableCell>
                    <Link
                      href={`/groups/${student.groupId}`}
                      className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-text hover:text-primary transition-colors"
                    >
                      {student.groupName}
                    </Link>
                  </TableCell>

                  {/* Contact Phones */}
                  <TableCell>
                    <div className="flex flex-col text-xs font-mono" dir="ltr">
                      <span className="text-text font-semibold">{student.phone}</span>
                      <span className="text-[11px] text-muted">
                        ولي الأمر: {student.parentPhone}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {student.status === "active" ? (
                      <Badge variant="success" size="sm" dot>
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="sm">
                        محظور
                      </Badge>
                    )}
                  </TableCell>

                  {/* Current Month Payment Status */}
                  <TableCell className="text-center">
                    {student.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-success/10 text-success px-2 py-0.5 text-xs font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        مسدد
                      </span>
                    ) : student.paymentStatus === "partial" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning px-2 py-0.5 text-xs font-bold">
                        <Clock3 className="h-3 w-3" />
                        سداد جزئي
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 text-danger px-2 py-0.5 text-xs font-bold">
                        <XCircle className="h-3 w-3" />
                        غير مسدد
                      </span>
                    )}
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/students/${student.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-text"
                          title="عرض بروفايل الطالب"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Link href={`/students/${student.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBlockTarget(student)}
                        className={`h-8 w-8 p-0 ${
                          student.status === "blocked"
                            ? "text-success hover:bg-success/10"
                            : "text-warning hover:bg-warning/10"
                        }`}
                        title={student.status === "blocked" ? "إلغاء الحظر" : "حظر الطالب"}
                      >
                        {student.status === "blocked" ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(student)}
                        className="h-8 w-8 p-0 text-muted hover:text-danger"
                        title="حذف الطالب"
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

        {/* Cursor Pagination footer */}
        {totalCount > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={page}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              onNextPage={() => setPage((p) => p + 1)}
              onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
              totalCount={totalCount}
              pageSize={pageSize}
              itemLabel="طالب"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="تأكيد حذف الطالب"
      >
        <div className="space-y-4" dir="rtl">
          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-text">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-text">
                هل أنت متأكد من رغبتك في نقل الطالب &quot;{deleteTarget?.name}&quot; إلى سلة
                المحذوفات؟
              </p>
              <p className="text-xs text-muted leading-relaxed">
                سيتم إخفاء الطالب من قوائم الحضور والامتحانات الحالية، مع إمكانية استعادته لاحقاً من
                سلة المحذوفات.
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

      {/* Block Confirmation Modal */}
      <Modal
        isOpen={!!blockTarget}
        onClose={() => !isTogglingBlock && setBlockTarget(null)}
        title={blockTarget?.status === "blocked" ? "تأكيد فك حظر الطالب" : "تأكيد حظر الطالب"}
      >
        <div className="space-y-4" dir="rtl">
          <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-text">
            <Ban className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-text">
                {blockTarget?.status === "blocked"
                  ? `هل تريد إعادة تفعيل حساب الطالب "${blockTarget?.name}" والسماح له بحضور الحصص؟`
                  : `هل أنت متأكد من حظر الطالب "${blockTarget?.name}"؟ سيتم منعه من تسجيل الحضور ودخول الحصص فوراً.`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setBlockTarget(null)}
              disabled={isTogglingBlock}
            >
              إلغاء
            </Button>
            <Button
              variant={blockTarget?.status === "blocked" ? "primary" : "danger"}
              onClick={handleToggleBlock}
              isLoading={isTogglingBlock}
              className="font-bold"
            >
              {blockTarget?.status === "blocked" ? "إلغاء الحظر والتفعيل" : "تأكيد الحظر"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
