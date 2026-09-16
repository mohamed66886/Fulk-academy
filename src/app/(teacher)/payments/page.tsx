"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Users,
  CheckCheck,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Phone,
} from "lucide-react";
import { usePayments, queryKeys } from "@/hooks/use-cached-data";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMonthPayments,
  updatePayment,
  type StudentPaymentRow,
  type MonthlyPaymentAggregation,
} from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Format YYYY-MM to Arabic Month & Year (e.g. سبتمبر 2026)
function formatArabicMonth(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const parts = monthStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
}

// Get next/previous month string
function getOffsetMonth(monthStr: string, offset: number): string {
  const parts = monthStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const d = new Date(year, month - 1 + offset, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function PaymentsPage() {
  const currentMonthStr = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [month, setMonth] = React.useState<string>(currentMonthStr);
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState<string>("");

  const queryClient = useQueryClient();
  const { data: paymentsQueryData, isLoading: queryLoading } = usePayments({ month });

  // Debounce search query (350ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [students, setStudents] = React.useState<StudentPaymentRow[]>([]);
  const [groups, setGroups] = React.useState<
    Array<{ id: string; name: string; className: string }>
  >([]);
  const [aggregation, setAggregation] = React.useState<MonthlyPaymentAggregation | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // Sync state whenever cached query data changes
  React.useEffect(() => {
    if (paymentsQueryData?.success) {
      setStudents(paymentsQueryData.students);
      setAggregation(paymentsQueryData.aggregation);
      setGroups(paymentsQueryData.groups);

      const initialEditing: Record<string, number> = {};
      paymentsQueryData.students.forEach((s) => {
        initialEditing[s.studentId] = s.paid;
      });
      setEditingAmounts(initialEditing);
      setLoading(false);
    } else if (queryLoading && students.length === 0) {
      setLoading(true);
    }
  }, [paymentsQueryData, queryLoading, students.length]);

  // Editable paid amount state per student
  const [editingAmounts, setEditingAmounts] = React.useState<Record<string, number>>({});

  // Notes Modal State
  const [notesModal, setNotesModal] = React.useState<{
    studentId: string;
    studentName: string;
    notes: string;
    paidAmount: number;
  } | null>(null);

  // Load payments data
  const loadPayments = React.useCallback(
    async (targetMonth: string, showToast = false) => {
      setLoading(true);
      try {
        const res = await getMonthPayments({
          month: targetMonth,
        });

        if (res.success) {
          setStudents(res.students);
          setAggregation(res.aggregation);
          setGroups(res.groups);

          // Initialize editing amounts
          const initialEditing: Record<string, number> = {};
          res.students.forEach((s) => {
            initialEditing[s.studentId] = s.paid;
          });
          setEditingAmounts(initialEditing);

          // Update React Query cache
          queryClient.setQueryData(queryKeys.payments({ month: targetMonth }), res);

          if (showToast) {
            toast.success(`تم تحميل مستحقات شهر ${formatArabicMonth(targetMonth)}`);
          }
        } else {
          toast.error(res.error || "فشل تحميل بيانات الشهر");
        }
      } catch (err) {
        console.error("Error loading payments:", err);
        toast.error("حدث خطأ أثناء تحميل بيانات المدفوعات");
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  // Handle single payment update
  const handleUpdatePayment = async (studentId: string, newPaid: number, customNotes?: string) => {
    const student = students.find((s) => s.studentId === studentId);
    if (!student) return;

    const cleanPaid = Math.max(0, Number(newPaid) || 0);
    setUpdatingId(studentId);

    // Optimistic calculation for instant feedback
    const prevPaid = student.paid;
    const prevRemaining = student.remaining;
    const prevStatus = student.status;
    const newRemaining = Math.max(0, student.required - cleanPaid);
    const newStatus = newRemaining === 0 ? "paid" : cleanPaid > 0 ? "partial" : "unpaid";

    // Optimistically update student list
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              paid: cleanPaid,
              remaining: newRemaining,
              status: newStatus,
              notes: customNotes !== undefined ? customNotes : s.notes,
            }
          : s
      )
    );

    try {
      const res = await updatePayment({
        studentId,
        month,
        paidAmount: cleanPaid,
        notes: customNotes !== undefined ? customNotes : student.notes,
      });

      if (res.success && res.payment) {
        // Sync with verified server calculation
        setStudents((prev) => prev.map((s) => (s.studentId === studentId ? res.payment! : s)));
        if (res.aggregation) {
          setAggregation(res.aggregation);
        }
        setEditingAmounts((prev) => ({ ...prev, [studentId]: cleanPaid }));
        toast.success(`تم حفظ سداد الطالب ${student.studentName} بنجاح`);
      } else {
        // Revert on failure
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === studentId
              ? {
                  ...s,
                  paid: prevPaid,
                  remaining: prevRemaining,
                  status: prevStatus,
                }
              : s
          )
        );
        setEditingAmounts((prev) => ({ ...prev, [studentId]: prevPaid }));
        toast.error(res.error || res.message || "فشل تسجيل الدفع");
      }
    } catch (err) {
      console.error("Update payment error:", err);
      // Revert
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentId
            ? {
                ...s,
                paid: prevPaid,
                remaining: prevRemaining,
                status: prevStatus,
              }
            : s
        )
      );
      toast.error("حدث خطأ أثناء حفظ الدفع");
    } finally {
      setUpdatingId(null);
    }
  };

  // Quick Action: Full Pay (سداد كامل)
  const handleFullPay = (student: StudentPaymentRow) => {
    handleUpdatePayment(student.studentId, student.required);
  };

  // Quick Action: Reset to 0 (تصفير)
  const handleResetPay = (student: StudentPaymentRow) => {
    handleUpdatePayment(student.studentId, 0);
  };

  // Filtered students list
  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      // Group filter
      if (selectedGroup !== "all" && s.groupId !== selectedGroup) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && s.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase().trim();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchPhone = s.studentPhone.includes(q);
        const matchParent = s.parentPhone.includes(q);
        if (!matchName && !matchPhone && !matchParent) {
          return false;
        }
      }
      return true;
    });
  }, [students, selectedGroup, selectedStatus, debouncedSearchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              إدارة المدفوعات والاشتراكات
            </h1>
          </div>
          <p className="text-sm text-muted">
            متابعة مستحقات الطلاب الشهرية، رصد المدفوعات وتحديث الأرصدة تلقائياً
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPayments(month, true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
            تحديث
          </Button>

          <Link href={`/payments/reports?month=${month}`}>
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover shadow-md hover:shadow-lg transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>تقارير المستحقات والتحصيل</span>
              <ArrowUpRight className="w-4 h-4 opacity-70" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Month Selector & Navigator Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(getOffsetMonth(month, -1))}
            className="p-2"
            title="الشهر السابق"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 px-3 py-1.5 bg-background border border-border rounded-xl">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-bold text-base text-text">{formatArabicMonth(month)}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
              className="opacity-0 w-6 cursor-pointer absolute"
              title="اختر شهراً محدداً"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(getOffsetMonth(month, 1))}
            className="p-2"
            title="الشهر القادم"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {month !== currentMonthStr && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonth(currentMonthStr)}
              className="text-xs text-primary font-medium hover:bg-primary/10"
            >
              العودة للشهر الحالي
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="w-4 h-4 text-warning" />
          <span>
            يتم توليد مستندات الدفع تلقائياً لجميع الطلاب النشطين بناءً على سعر المجموعة والخصم
            الفردي
          </span>
        </div>
      </div>

      {/* 3. Monthly Dues KPI Cards (from Persistent Aggregation) */}
      {aggregation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Required */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">إجمالي المستحق</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-text">
                {aggregation.totalRequired.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-medium text-muted">ج.م</span>
              </div>
              <p className="text-xs text-muted mt-1">لكل {aggregation.totalStudents} طالب مسجل</p>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-success">المحصّل الفعلي</span>
              <div className="p-2 rounded-xl bg-success/10 text-success">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-success">
                {aggregation.totalCollected.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-medium text-muted">ج.م</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-border/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-success h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, aggregation.collectionRate)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-success">
                  {aggregation.collectionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Remaining */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-500">المتبقي المطلوب تحصيله</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-500">
                {aggregation.totalRemaining.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-medium text-muted">ج.م</span>
              </div>
              <p className="text-xs text-muted mt-1">من الطلاب غير المسددين أو المسددين جزئياً</p>
            </div>
          </div>

          {/* Card 4: Students Status Breakdown */}
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">توزيع سداد الطلاب</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <button
                type="button"
                onClick={() => setSelectedStatus("paid")}
                className={cn(
                  "p-2 rounded-xl border transition-all text-center",
                  selectedStatus === "paid"
                    ? "bg-success/15 border-success text-success font-bold"
                    : "bg-success/5 border-success/20 text-success hover:bg-success/10"
                )}
                title="تصفية المسددين بالكامل"
              >
                <div className="text-lg font-extrabold">{aggregation.paidCount}</div>
                <div className="text-[10px] mt-0.5">مسدد بالكامل</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("partial")}
                className={cn(
                  "p-2 rounded-xl border transition-all text-center",
                  selectedStatus === "partial"
                    ? "bg-warning/15 border-warning text-warning font-bold"
                    : "bg-warning/5 border-warning/20 text-warning hover:bg-warning/10"
                )}
                title="تصفية المسددين جزئياً"
              >
                <div className="text-lg font-extrabold">{aggregation.partialCount}</div>
                <div className="text-[10px] mt-0.5">مسدد جزئي</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("unpaid")}
                className={cn(
                  "p-2 rounded-xl border transition-all text-center",
                  selectedStatus === "unpaid"
                    ? "bg-danger/15 border-danger text-danger font-bold"
                    : "bg-danger/5 border-danger/20 text-danger hover:bg-danger/10"
                )}
                title="تصفية غير المسددين"
              >
                <div className="text-lg font-extrabold">{aggregation.unpaidCount}</div>
                <div className="text-[10px] mt-0.5">غير مسدد</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Filters & Search Toolbar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الطالب أو رقم الهاتف أو ولي الأمر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-text"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Group Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
            >
              <option value="all">كل المجموعات ({students.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} - {g.className}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="paid">مدفوع بالكامل</option>
              <option value="partial">مدفوع جزئياً</option>
              <option value="unpaid">غير مدفوع</option>
            </select>
          </div>

          {(selectedGroup !== "all" || selectedStatus !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedGroup("all");
                setSelectedStatus("all");
                setSearchQuery("");
              }}
              className="text-xs text-muted hover:text-text"
            >
              إعادة ضبط الفلاتر
            </Button>
          )}
        </div>
      </div>

      {/* 5. Payments Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted">
              جاري تجهيز بيانات مستحقات شهر {formatArabicMonth(month)}...
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-3 bg-muted/10 rounded-2xl w-fit mx-auto text-muted">
              <Filter className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-text">لا توجد سجلات مطابقة</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              لم يتم العثور على أي طلاب مطابقين لشروط البحث والفلاتر المحددة لهذا الشهر.
            </p>
            {(selectedGroup !== "all" || selectedStatus !== "all" || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGroup("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
              >
                إلغاء الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[180px]">الطالب</th>
                  <th className="py-3.5 px-4 min-w-[140px]">المجموعة</th>
                  <th className="py-3.5 px-4 text-center">سعر المجموعة</th>
                  <th className="py-3.5 px-4 text-center">الخصم</th>
                  <th className="py-3.5 px-4 text-center font-bold text-text">المطلوب</th>
                  <th className="py-3.5 px-4 min-w-[160px] text-center font-bold text-text">
                    المدفوع (ج.م)
                  </th>
                  <th className="py-3.5 px-4 text-center font-bold">المتبقي</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 min-w-[160px] text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredStudents.map((student, idx) => {
                  const isUpdating = updatingId === student.studentId;
                  const currentEditValue = editingAmounts[student.studentId] ?? student.paid;
                  const hasUnsavedAmount = currentEditValue !== student.paid;

                  return (
                    <tr
                      key={student.studentId}
                      className={cn(
                        "hover:bg-background/60 transition-colors",
                        isUpdating && "opacity-50 pointer-events-none"
                      )}
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center text-xs text-muted">{idx + 1}</td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-text text-sm">{student.studentName}</div>
                        <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                          {student.studentPhone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" />
                              {student.studentPhone}
                            </span>
                          )}
                          {student.parentPhone && (
                            <span className="text-[11px] text-muted">
                              ولي الأمر: {student.parentPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Group & Class */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-text text-xs">{student.groupName}</div>
                        {student.className && (
                          <Badge variant="outline" size="sm" className="mt-1 text-[10px]">
                            {student.className}
                          </Badge>
                        )}
                      </td>

                      {/* Group Price */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-muted">
                        {student.groupPrice} ج.م
                      </td>

                      {/* Discount */}
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        {student.discount > 0 ? (
                          <span className="text-danger font-medium">-{student.discount} ج.م</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>

                      {/* Required */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-sm text-text">
                        {student.required} ج.م
                      </td>

                      {/* Paid (Inline Editable) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={student.required}
                            value={currentEditValue}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setEditingAmounts((prev) => ({
                                ...prev,
                                [student.studentId]: val,
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdatePayment(student.studentId, currentEditValue);
                              }
                            }}
                            className={cn(
                              "w-24 text-center font-mono font-bold text-sm px-2.5 py-1.5 rounded-lg border bg-background text-text transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                              hasUnsavedAmount ? "border-primary bg-primary/5" : "border-border"
                            )}
                          />

                          {hasUnsavedAmount && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() =>
                                handleUpdatePayment(student.studentId, currentEditValue)
                              }
                              disabled={isUpdating}
                              className="px-2 py-1 text-xs h-8"
                              title="حفظ المبلغ المدفوع"
                            >
                              حفظ
                            </Button>
                          )}
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                        {student.remaining > 0 ? (
                          <span className="text-rose-500">{student.remaining} ج.م</span>
                        ) : (
                          <span className="text-success">0 ج.م</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {student.status === "paid" && (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="w-3 h-3" />
                            مدفوع بالكامل
                          </Badge>
                        )}
                        {student.status === "partial" && (
                          <Badge variant="warning" size="sm">
                            <Clock className="w-3 h-3" />
                            مدفوع جزئياً
                          </Badge>
                        )}
                        {student.status === "unpaid" && (
                          <Badge variant="danger" size="sm">
                            <AlertCircle className="w-3 h-3" />
                            غير مدفوع
                          </Badge>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {student.status !== "paid" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFullPay(student)}
                              disabled={isUpdating}
                              className="text-xs h-7 px-2 text-success hover:bg-success/10 hover:border-success/30 border-success/20 flex items-center gap-1 font-medium"
                              title="تسجيل سداد كامل المبلغ المطلوب"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              سداد كامل
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResetPay(student)}
                              disabled={isUpdating}
                              className="text-xs h-7 px-2 text-muted hover:text-danger hover:bg-danger/10 flex items-center gap-1"
                              title="إلغاء السداد وتصفير المبلغ"
                            >
                              <RotateCcw className="w-3 h-3" />
                              تصفير
                            </Button>
                          )}

                          {/* Notes Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setNotesModal({
                                studentId: student.studentId,
                                studentName: student.studentName,
                                notes: student.notes || "",
                                paidAmount: student.paid,
                              })
                            }
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors",
                              student.notes
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-transparent border-transparent text-muted hover:bg-surface hover:text-text"
                            )}
                            title={student.notes ? `ملاحظات: ${student.notes}` : "إضافة ملاحظة"}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-text">
                  ملاحظات الدفع: {notesModal.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotesModal(null)}
                className="text-muted hover:text-text text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                ملاحظات أو تفاصيل الدفع (مثلاً: طريقة السداد، كود فودافون كاش، موعد سداد الباقي)
              </label>
              <textarea
                value={notesModal.notes}
                onChange={(e) =>
                  setNotesModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                }
                rows={4}
                placeholder="اكتب ملاحظات السداد هنا..."
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setNotesModal(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (notesModal) {
                    await handleUpdatePayment(
                      notesModal.studentId,
                      notesModal.paidAmount,
                      notesModal.notes
                    );
                    setNotesModal(null);
                  }
                }}
              >
                حفظ الملاحظات
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
