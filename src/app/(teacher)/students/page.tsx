"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useStudents, useClassesForSelect, useGroups } from "@/hooks/use-cached-data";
import { deleteStudentClient, toggleStudentBlockClient } from "@/lib/client-actions/students";
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
import { toast } from "@/components/ui/toast";
import { SearchFilterCard, FilterField } from "@/components/ui/SearchFilterCard";
import { InputIcon } from "@/components/ui/InputIcon";
import { DropdownButton } from "@/components/ui/DropdownButton";
import { TableActions } from "@/components/ui/TableActions";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock3,
  Ban,
  ShieldCheck,
  IdCard,
  Printer,
  GraduationCap,
} from "lucide-react";

export default function StudentsListPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Multi-select for Card Printing & Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<Set<string>>(new Set());

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
  const classesList = React.useMemo(() => classesData || [], [classesData]);
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
  const students = React.useMemo(
    () => (studentsRes?.success && studentsRes.students ? studentsRes.students : []),
    [studentsRes]
  );
  const totalCount = studentsRes?.success && studentsRes.totalCount ? studentsRes.totalCount : 0;

  // Selection handlers
  const currentPageIds = React.useMemo(() => students.map((s) => s.id), [students]);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedStudentIds.has(id));

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handlePrintSelectedCards = () => {
    if (selectedStudentIds.size === 0) return;
    const idsArray = Array.from(selectedStudentIds);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selectedStudentIdsForPrint", JSON.stringify(idsArray));
    }
    router.push(`/students/print-cards?ids=${idsArray.join(",")}`);
  };

  // Handle Soft Delete with TableActions confirmation
  const handleDelete = async (studentId: string, studentName: string) => {
    try {
      const res = await deleteStudentClient(studentId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الطالب");
        return;
      }
      toast.success(`تم نقل الطالب "${studentName}" إلى سلة المحذوفات بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    }
  };

  // Handle Block / Unblock Toggle
  const handleToggleBlock = async (studentId: string, studentName: string) => {
    try {
      const res = await toggleStudentBlockClient(studentId);
      if (!res.success) {
        toast.error(res.error || "فشل تغيير حالة الطالب");
        return;
      }
      toast.success(
        res.newStatus === "blocked"
          ? `تم حظر الطالب "${studentName}" بنجاح`
          : `تم إلغاء حظر الطالب "${studentName}" بنجاح`
      );
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("حدث خطأ أثناء تغيير الحالة");
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

  const handleResetFilters = () => {
    setRawSearch("");
    setDebouncedSearch("");
    setClassFilter("all");
    setGroupFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Unified Search & Filters Card */}
      <SearchFilterCard
        title="سجل الطلاب"
        description="إدارة بيانات الطلاب المسجلين، الاشتراكات الشهرية، بطاقات الحضور، ومتابعة أولياء الأمور."
        icon={Users}
        iconColor="text-primary"
        resultsCount={totalCount}
        addHref="/students/create"
        addButtonText="إضافة طالب جديد"
        onSearch={() => {}}
        onReset={handleResetFilters}
        headerActions={
          <DropdownButton
            label="إجراءات سريعة"
            variant="outline"
            size="md"
            split={false}
            items={[
              {
                label: "إضافة طالب جديد",
                icon: <Plus className="w-4 h-4 text-primary" />,
                onClick: () => router.push("/students/create"),
              },
              {
                label: "استوديو طباعة الكروت (A4)",
                icon: <IdCard className="w-4 h-4 text-primary" />,
                onClick: () =>
                  router.push(
                    classFilter !== "all" || groupFilter !== "all"
                      ? `/students/print-cards?classId=${classFilter}&groupId=${groupFilter}`
                      : "/students/print-cards"
                  ),
              },
              {
                label: "عرض كافة المجموعات",
                icon: <Layers className="w-4 h-4 text-slate-500" />,
                onClick: () => router.push("/groups"),
              },
              {
                label: "عرض كافة الصفوف الدراسية",
                icon: <GraduationCap className="w-4 h-4 text-slate-500" />,
                onClick: () => router.push("/classes"),
              },
            ]}
          />
        }
      >
        {/* Search Field */}
        <FilterField label="البحث السريع">
          <Input
            placeholder="بحث بالاسم، رقم الطالب، أو رقم ولي الأمر..."
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            clearable
            onClear={() => {
              setRawSearch("");
              setDebouncedSearch("");
              setPage(1);
            }}
            leftIcon={<InputIcon icon={Search} className="text-slate-400" />}
            sizeVariant="md"
          />
        </FilterField>

        {/* Class Filter */}
        <FilterField label="الصف الدراسي">
          <Select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setGroupFilter("all");
              setPage(1);
            }}
            searchable={false}
            sizeVariant="md"
          >
            <option value="all">جميع الصفوف الدراسية</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </Select>
        </FilterField>

        {/* Group Filter */}
        <FilterField label="المجموعة الدراسية">
          <Select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
            searchable={false}
            sizeVariant="md"
          >
            <option value="all">جميع المجموعات</option>
            {availableFilterGroups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </Select>
        </FilterField>

        {/* Status Filter */}
        <FilterField label="حالة الطالب">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "blocked");
              setPage(1);
            }}
            searchable={false}
            sizeVariant="md"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">الطلاب النشطون</option>
            <option value="blocked">الطلاب المحظورون</option>
          </Select>
        </FilterField>
      </SearchFilterCard>

      {/* Sort & Page Size Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">ترتيب حسب:</span>
          <Button
            type="button"
            variant={sortBy === "name" ? "primary" : "outline"}
            size="sm"
            onClick={() => toggleSort("name")}
            className="h-8 gap-1 text-xs font-bold"
          >
            <span>الاسم</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant={sortBy === "createdAt" ? "primary" : "outline"}
            size="sm"
            onClick={() => toggleSort("createdAt")}
            className="h-8 gap-1 text-xs font-bold"
          >
            <span>تاريخ التسجيل</span>
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Page Size Selector */}
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

      {/* Floating Multi-select Bar for Bulk Printing */}
      {selectedStudentIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-sm font-bold">تم تحديد {selectedStudentIds.size} طالب</span>
          <div className="h-4 w-px bg-slate-700" />
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrintSelectedCards}
            className="gap-2 font-bold text-xs"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الكروت المحددة</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedStudentIds(new Set())}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            إلغاء التحديد
          </Button>
        </div>
      )}

      {/* Students Table */}
      <div className="space-y-4">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={toggleSelectAllCurrentPage}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  title="تحديد كل طلاب الصفحة الحالية"
                />
              </TableHead>
              <TableHead className="text-right pr-4">الطالب</TableHead>
              <TableHead className="text-right">الصف الدراسي</TableHead>
              <TableHead className="text-right">المجموعة</TableHead>
              <TableHead className="text-right">أرقام التواصل</TableHead>
              <TableHead className="text-center">حالة الطالب</TableHead>
              <TableHead className="text-center">دفع الشهر الحالي</TableHead>
              <TableHead className="text-center w-28">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} cols={8} />
            ) : students.length === 0 ? (
              <TableEmpty
                colSpan={8}
                icon={<Users className="h-10 w-10 text-muted stroke-[1.5]" />}
                title="لا يوجد طلاب مسجلون"
                description={
                  rawSearch ||
                  classFilter !== "all" ||
                  groupFilter !== "all" ||
                  statusFilter !== "all"
                    ? "لا توجد نتائج مطابقة لمعايير البحث والفلترة المحددة."
                    : "ابدأ بتسجيل أول طالب في إحدى المجموعات الدراسية."
                }
              />
            ) : (
              students.map((student) => (
                <TableRow
                  key={student.id}
                  data-state={selectedStudentIds.has(student.id) ? "selected" : undefined}
                >
                  {/* Row Checkbox */}
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => toggleSelectStudent(student.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      title="تحديد الطالب للطباعة"
                    />
                  </TableCell>

                  {/* Student Avatar & Name */}
                  <TableCell className="text-right pr-4">
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
                      <div className="flex flex-col text-right">
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
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-text">
                      <Layers className="h-3 w-3 text-primary" />
                      {student.className}
                    </span>
                  </TableCell>

                  {/* Group Name */}
                  <TableCell className="text-right">
                    <Link
                      href={`/groups/${student.groupId}`}
                      className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-text hover:text-primary transition-colors"
                    >
                      {student.groupName}
                    </Link>
                  </TableCell>

                  {/* Contact Phones */}
                  <TableCell className="text-right">
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
                      {/* Quick View */}
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

                      {/* Quick Print Card */}
                      <Link href={`/students/print-cards?ids=${student.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="طباعة كارت الطالب الذكي"
                        >
                          <IdCard className="h-4 w-4" />
                        </Button>
                      </Link>

                      {/* Quick Edit */}
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

                      {/* Dropdown Menu TableActions */}
                      <TableActions
                        actions={[
                          {
                            icon: <Eye className="w-4 h-4 text-primary" />,
                            label: "عرض البروفايل",
                            onClick: () => router.push(`/students/${student.id}`),
                          },
                          {
                            icon: (
                              <IdCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ),
                            label: "طباعة الكارت الذكي",
                            onClick: () => router.push(`/students/print-cards?ids=${student.id}`),
                          },
                          {
                            icon: <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
                            label: "تعديل البيانات",
                            onClick: () => router.push(`/students/${student.id}/edit`),
                          },
                          {
                            icon:
                              student.status === "blocked" ? (
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Ban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              ),
                            label: student.status === "blocked" ? "إلغاء الحظر" : "حظر الطالب",
                            onClick: () => handleToggleBlock(student.id, student.name),
                          },
                          {
                            icon: <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                            label: "حذف الطالب",
                            danger: true,
                            onClick: () => handleDelete(student.id, student.name),
                          },
                        ]}
                      />
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
            onNextPage={() => setPage((p) => p + 1)}
            onPrevPage={() => setPage((p) => Math.max(p - 1, 1))}
            currentPage={page}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="طالب"
          />
        )}
      </div>
    </div>
  );
}
