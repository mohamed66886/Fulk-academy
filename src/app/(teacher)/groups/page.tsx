"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useGroups, useClassesForSelect, queryKeys } from "@/hooks/use-cached-data";
import { deleteGroup } from "@/lib/actions/groups";
import { DAY_LABELS } from "@/lib/validators/group";
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
  Calendar,
  Building2,
  Layers,
  GraduationCap,
} from "lucide-react";

export default function GroupsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: groupsData, isLoading: isGroupsLoading } = useGroups();
  const { data: classesData } = useClassesForSelect();

  const groups = React.useMemo(
    () => (groupsData?.success && groupsData.groups ? groupsData.groups : []),
    [groupsData]
  );
  const classesList = React.useMemo(() => classesData || [], [classesData]);
  const isLoading = isGroupsLoading && groups.length === 0;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [selectedClassFilter, setSelectedClassFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "archived">("all");
  const [centerFilter, setCenterFilter] = React.useState<"all" | "center" | "private">("all");
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
  const handleDelete = async (groupId: string, groupName: string) => {
    try {
      const res = await deleteGroup(groupId);
      if (!res.success) {
        toast.error(res.error || "فشل حذف المجموعة الدراسية");
        return;
      }
      toast.success(`تم نقل المجموعة "${groupName}" إلى سلة المحذوفات بنجاح`);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch {
      toast.error("حدث خطأ أثناء محاولة الحذف");
    }
  };

  // Filter groups based on search query, class, status, and center
  const filteredGroups = React.useMemo(() => {
    return groups.filter((group) => {
      // Class Filter
      if (selectedClassFilter !== "all" && group.classId !== selectedClassFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "all" && group.status !== statusFilter) {
        return false;
      }

      // Center Filter
      if (centerFilter === "center" && !group.hasCenter) {
        return false;
      }
      if (centerFilter === "private" && group.hasCenter) {
        return false;
      }

      // Search Query Filter
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase().trim();
        const matchesName = group.name.toLowerCase().includes(q);
        const matchesClass = group.className && group.className.toLowerCase().includes(q);
        if (!matchesName && !matchesClass) return false;
      }

      return true;
    });
  }, [groups, debouncedSearchQuery, selectedClassFilter, statusFilter, centerFilter]);

  // Pagination calculation
  const totalCount = filteredGroups.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + pageSize < totalCount;
  const hasPrevPage = currentPage > 1;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedClassFilter("all");
    setStatusFilter("all");
    setCenterFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Unified Search & Filters Card */}
      <SearchFilterCard
        title="المجموعات الدراسية"
        description="إدارة مواعيد الحصص الأسبوعية، توزيع الطلاب، وأسعار الاشتراكات وسناتر التدريس."
        icon={Users}
        iconColor="text-primary"
        resultsCount={filteredGroups.length}
        addHref="/groups/create"
        addButtonText="إضافة مجموعة جديدة"
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
                label: "إضافة مجموعة جديدة",
                icon: <Plus className="w-4 h-4 text-primary" />,
                onClick: () => router.push("/groups/create"),
              },
              {
                label: "عرض كافة الصفوف الدراسية",
                icon: <GraduationCap className="w-4 h-4 text-slate-500" />,
                onClick: () => router.push("/classes"),
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
            placeholder="بحث باسم المجموعة أو الصف الدراسي..."
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

        {/* Class Filter */}
        <FilterField label="الصف الدراسي">
          <Select
            value={selectedClassFilter}
            onChange={(e) => {
              setSelectedClassFilter(e.target.value);
              setCurrentPage(1);
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

        {/* Status Filter */}
        <FilterField label="حالة المجموعة">
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
            <option value="active">المجموعات النشطة فقط</option>
            <option value="archived">المجموعات المؤرشفة</option>
          </Select>
        </FilterField>

        {/* Center / Type Filter */}
        <FilterField label="مكان التدريس / السنتر">
          <Select
            value={centerFilter}
            onChange={(e) => {
              setCenterFilter(e.target.value as "all" | "center" | "private");
              setCurrentPage(1);
            }}
            searchable={false}
            sizeVariant="md"
          >
            <option value="all">الكل (سنتر وخاص)</option>
            <option value="center">مجموعات السناتر فقط</option>
            <option value="private">خاص / أونلاين فقط</option>
          </Select>
        </FilterField>
      </SearchFilterCard>

      {/* Groups Table */}
      <div className="space-y-4">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right pr-6">اسم المجموعة والصف</TableHead>
              <TableHead className="text-right">المواعيد الأسبوعية</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">السعر الشهري</TableHead>
              <TableHead className="text-center">السنتر</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center w-28">الإجراءات</TableHead>
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
                  searchQuery ||
                  selectedClassFilter !== "all" ||
                  statusFilter !== "all" ||
                  centerFilter !== "all"
                    ? "لا توجد مجموعات تطابق معايير البحث والفلترة المحددة."
                    : "ابدأ بإضافة أول مجموعة وتحديد مواعيد حصصها الأسبوعية."
                }
              />
            ) : (
              paginatedGroups.map((group) => (
                <TableRow key={group.id}>
                  {/* Group Name & Class */}
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-right">
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
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {group.schedule && group.schedule.length > 0 ? (
                        group.schedule.map((sch, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary/70 border border-border/60 px-2 py-0.5 text-[11px] font-medium text-text"
                          >
                            <Calendar className="h-2.5 w-2.5 text-primary shrink-0" />
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
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <Building2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
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
                      {/* Quick View Button */}
                      <Link href={`/groups/${group.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-primary"
                          title="عرض تفاصيل المجموعة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>

                      {/* Quick Edit Button */}
                      <Link href={`/groups/${group.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted hover:text-text"
                          title="تعديل بيانات المجموعة"
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
                            onClick: () => router.push(`/groups/${group.id}`),
                          },
                          {
                            icon: <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />,
                            label: "تعديل المجموعة",
                            onClick: () => router.push(`/groups/${group.id}/edit`),
                          },
                          {
                            icon: (
                              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ),
                            label: "إضافة طالب للمجموعة",
                            onClick: () => router.push(`/students/create?groupId=${group.id}`),
                          },
                          {
                            icon: <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                            label: "حذف المجموعة",
                            danger: true,
                            onClick: () => handleDelete(group.id, group.name),
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
            itemLabel="مجموعة"
          />
        )}
      </div>
    </div>
  );
}
