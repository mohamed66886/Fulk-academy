"use client";

import * as React from "react";
import Link from "next/link";
import { getTeachersList } from "@/lib/actions/teachers";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { UserPlus, Search, Eye } from "lucide-react";

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  photoUrl: string;
  status: "active" | "disabled";
  createdAt: string;
  studentCount: number;
}

export default function SuperAdminTeachersPage() {
  const [teachers, setTeachers] = React.useState<TeacherItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Load teachers data
  const fetchTeachers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTeachersList({
        search: searchQuery,
        status: statusFilter,
      });
      if (res.success && res.teachers) {
        setTeachers(res.teachers);
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  React.useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalCount = teachers.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTeachers = teachers.slice(startIndex, startIndex + pageSize);
  const hasNextPage = startIndex + pageSize < totalCount;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-text tracking-tight">إدارة المدرسين</h1>
          <p className="text-xs text-muted mt-1">
            عرض وتعديل وتفعيل أو إيقاف حسابات المدرسين المسجلين في النظام.
          </p>
        </div>

        <Link href="/super-admin/teachers/create">
          <Button size="md" className="gap-2 font-bold shadow-sm">
            <UserPlus className="h-4 w-4" />
            <span>إضافة مدرس جديد</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Input
            placeholder="بحث بالاسم، رقم الهاتف، أو المادة..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 pr-3"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onChange={handleStatusChange}>
            <option value="all">جميع الحالات</option>
            <option value="active">الحسابات النشطة فقط</option>
            <option value="disabled">الحسابات الموقوفة فقط</option>
          </Select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="space-y-2">
        <Table stickyHeader>
          <TableHeader>
            <TableRow>
              <TableHead>المدرس</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>المادة التعليمية</TableHead>
              <TableHead className="text-center">عدد الطلاب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : paginatedTeachers.length === 0 ? (
              <TableEmpty
                colSpan={6}
                title="لم يتم العثور على أي مدرسين"
                description={
                  searchQuery || statusFilter !== "all"
                    ? "لا توجد نتائج تطابق معايير البحث المحددة."
                    : "لم تقم بإضافة أي مدرسين حتى الآن. ابدأ بإضافة المدرس الأول."
                }
              />
            ) : (
              paginatedTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                        {teacher.name.slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-text text-sm">{teacher.name}</span>
                        <span className="text-[11px] text-muted font-mono">{teacher.email}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-text">{teacher.phone}</TableCell>

                  <TableCell className="text-xs font-medium text-text">{teacher.subject}</TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-text">
                      {teacher.studentCount} طالب
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    {teacher.status === "active" ? (
                      <Badge variant="success" dot>
                        نشط
                      </Badge>
                    ) : (
                      <Badge variant="danger" dot>
                        متوقف
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <Link href={`/super-admin/teachers/${teacher.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        <span>التفاصيل</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {!isLoading && totalCount > 0 && (
          <Pagination
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={() => setCurrentPage((p) => p + 1)}
            onPrevPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            itemLabel="مدرس"
          />
        )}
      </div>
    </div>
  );
}
