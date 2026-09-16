"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useClasses, queryKeys } from "@/hooks/use-cached-data";
import { deleteClass } from "@/lib/actions/classes";
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
import { GraduationCap, Plus, Search, Eye, Edit2, Trash2, Layers, Users } from "lucide-react";

export default function ClassesListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: classesData, isLoading } = useClasses();
  const classes = React.useMemo(
    () => (classesData?.success && classesData.classes ? classesData.classes : []),
    [classesData]
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "archived">("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Debounce search query (350ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Delete with TableActions confirmation
  const handleDelete = async (classId: string, className: string) => {
    try {
      const res = await deleteClass(classId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف الصف الدراسي");
        return;
      }
      toast.success(`تم نقل الصف "${className}" إلى سلة المحذوفات بنجاح`);
      queryClient.invalidateQueries({ queryKey: queryKeys.classes() });
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    }
  };

  // Filter classes based on search query and status filter
  const filteredClasses = React.useMemo(() => {
    return classes.filter((c) => {
      // Status Filter
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }

      // Search Query Filter
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesDesc = c.description && c.description.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [classes, debouncedSearchQuery, statusFilter]);

  // Pagination calculation
  const totalCount = filteredClasses.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + pageSize < totalCount;
  const hasPrevPage = currentPage > 1;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Unified Search & Filters Card */}
      <SearchFilterCard
        title="الصفوف الدراسية"
        description="إدارة المراحل والصفوف التعليمية وتوزيع المجموعات والطلاب."
        icon={GraduationCap}
        iconColor="text-primary"
        resultsCount={filteredClasses.length}
        addHref="/classes/create"
        addButtonText="إضافة صف جديد"
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
                label: "إضافة صف دراسي جديد",
                icon: <Plus className="w-4 h-4 text-primary" />,
                onClick: () => router.push("/classes/create"),
              },
              {
                label: "عرض كافة المجموعات",
                icon: <Layers className="w-4 h-4 text-slate-500" />,
                onClick: () => router.push("/groups"),
              },
              {
                label: "سجل الطلاب العام",
                icon: <Users className="w-4 h-4 text-slate-500" />,
                onClick: () => router.push("/students"),
              },
            ]}
          />
        }
      >
        {/* Search Field */}
        <FilterField label="البحث السريع">
          <Input
            placeholder="بحث باسم الصف الدراسي أو الوصف..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            clearable
            onClear={() => {
              setSearchQuery("");
              setCurrentPage(1);
            }}
            leftIcon={<InputIcon icon={Search} className="text-slate-400" />}
            sizeVariant="md"
          />
        </FilterField>

        {/* Status Filter */}
        <FilterField label="حالة الصف الدراسي">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "archived");
              setCurrentPage(1);
            }}
            searchable={false}
            sizeVariant="md"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">الصفوف النشطة فقط</option>
            <option value="archived">الصفوف المؤرشفة</option>
          </Select>
        </FilterField>
      </SearchFilterCard>

      {/* Classes Table */}
      <div className="space-y-4">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right pr-6">اسم الصف الدراسي</TableHead>
              <TableHead className="text-center">عدد المجموعات</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center w-28">الإجراءات</TableHead>
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
                  searchQuery || statusFilter !== "all"
                    ? "لا توجد صفوف تطابق معايير البحث والفلترة الحالية."
                    : "ابدأ بإضافة أول صف دراسي (مثل: الصف الأول الثانوي) لتنظيم المجموعات."
                }
              />
            ) : (
              paginatedClasses.map((cls) => (
                <TableRow key={cls.id}>
                  {/* Class Info */}
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-right">
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

                  {/* Groups Count */}
                  <TableCell className="text-center">
                    <Link href={`/classes/${cls.id}`}>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-text hover:bg-secondary/80 transition-colors">
                        {cls.groupsCount} مجموعة
                      </span>
                    </Link>
                  </TableCell>

                  {/* Students Count */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold">
                      {cls.studentsCount} طالب
                    </span>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="text-center">
                    {cls.status === "active" ? (
                      <Badge variant="success" dot>
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="default">مؤرشف</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Quick View Button */}
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

                      {/* Quick Edit Button */}
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

                      {/* Dropdown Menu TableActions */}
                      <TableActions
                        actions={[
                          {
                            icon: <Eye className="w-4 h-4 text-primary" />,
                            label: "عرض التفاصيل",
                            onClick: () => router.push(`/classes/${cls.id}`),
                          },
                          {
                            icon: <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
                            label: "تعديل الصف",
                            onClick: () => router.push(`/classes/${cls.id}/edit`),
                          },
                          {
                            icon: (
                              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ),
                            label: "إضافة مجموعة",
                            onClick: () => router.push(`/groups/create?classId=${cls.id}`),
                          },
                          {
                            icon: <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                            label: "حذف الصف",
                            danger: true,
                            onClick: () => handleDelete(cls.id, cls.name),
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
            onNextPage={() => setCurrentPage((p) => p + 1)}
            onPrevPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="صف"
          />
        )}
      </div>
    </div>
  );
}
