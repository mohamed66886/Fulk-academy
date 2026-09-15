"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Printer,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Users,
  Phone,
  MessageCircle,
  RotateCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { getPaymentReports, type PaymentReportsResult } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Format YYYY-MM to Arabic Month & Year
function formatArabicMonth(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const parts = monthStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
}

// Get offset month string
function getOffsetMonth(monthStr: string, offset: number): string {
  const parts = monthStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const d = new Date(year, month - 1 + offset, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Clean phone for WhatsApp (handles Egyptian format 010... -> 2010...)
function formatWhatsAppUrl(
  phone: string,
  studentName: string,
  monthName: string,
  remaining: number
): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "2" + cleaned;
  } else if (!cleaned.startsWith("20") && cleaned.length === 10) {
    cleaned = "20" + cleaned;
  }

  const message = `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب/ة (${studentName}) المحترم. نود تذكيركم بمستحقات شهر (${monthName}) وقدرها (${remaining} ج.م) لدى أكاديمية فُلك. شاكرين ومقدرين حسن تعاونكم.`;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

function PaymentReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentMonthStr = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const queryMonth = searchParams.get("month") || currentMonthStr;
  const [month, setMonth] = React.useState<string>(queryMonth);
  const [reportData, setReportData] = React.useState<PaymentReportsResult | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Filter for unpaid list
  const [debtSearch, setDebtSearch] = React.useState<string>("");
  const [selectedDebtGroup, setSelectedDebtGroup] = React.useState<string>("all");

  const loadReport = React.useCallback(async (targetMonth: string, showToast = false) => {
    setLoading(true);
    try {
      const res = await getPaymentReports(targetMonth);
      if (res.success && res.data) {
        setReportData(res.data);
        if (showToast) {
          toast.success(`تم تحديث تقرير شهر ${formatArabicMonth(targetMonth)}`);
        }
      } else {
        toast.error(res.error || "فشل تحميل تقرير المستحقات");
      }
    } catch (err) {
      console.error("Error loading payment reports:", err);
      toast.error("حدث خطأ أثناء تحميل التقرير");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReport(month);
  }, [month, loadReport]);

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    router.replace(`/payments/reports?month=${newMonth}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredUnpaid = React.useMemo(() => {
    if (!reportData) return [];
    return reportData.unpaidStudents.filter((s) => {
      if (selectedDebtGroup !== "all" && s.groupName !== selectedDebtGroup) {
        return false;
      }
      if (debtSearch.trim()) {
        const q = debtSearch.toLowerCase().trim();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchPhone = s.studentPhone.includes(q);
        const matchParent = s.parentPhone.includes(q);
        if (!matchName && !matchPhone && !matchParent) return false;
      }
      return true;
    });
  }, [reportData, selectedDebtGroup, debtSearch]);

  const monthArabic = formatArabicMonth(month);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4"
      dir="rtl"
    >
      {/* 1. Header (Hidden during print except title) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6 print:pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2 print:hidden">
            <Link
              href="/payments"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة إلى جدول المدفوعات
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary print:hidden">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
                تقرير مستحقات الشهر والتحصيل المالي
              </h1>
              <p className="text-sm text-muted print:text-xs">
                متابعة معدلات التحصيل، تفصيل المجموعات، وقائمة المتأخرين لشهر {monthArabic}
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReport(month, true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
            تحديث
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-surface hover:bg-background"
          >
            <Printer className="w-4 h-4" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* 2. Month Selector (Print: shows as simple title) */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange(getOffsetMonth(month, -1))}
            className="p-2"
            title="الشهر السابق"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 px-3 py-1.5 bg-background border border-border rounded-xl">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-bold text-base text-text">{monthArabic}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) handleMonthChange(e.target.value);
              }}
              className="opacity-0 w-6 cursor-pointer absolute"
              title="اختر شهراً محدداً"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange(getOffsetMonth(month, 1))}
            className="p-2"
            title="الشهر القادم"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {month !== currentMonthStr && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMonthChange(currentMonthStr)}
              className="text-xs text-primary font-medium hover:bg-primary/10"
            >
              العودة للشهر الحالي
            </Button>
          )}
        </div>

        <div className="text-xs text-muted">
          يتم تجميع هذه المؤشرات وتحديثها تلقائياً مع كل عملية دفع
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-surface border border-border rounded-2xl">
          <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted">
            جاري معالجة وتوليد تقرير مستحقات شهر {monthArabic}...
          </p>
        </div>
      ) : !reportData ? (
        <div className="p-12 text-center space-y-3 bg-surface border border-border rounded-2xl">
          <AlertCircle className="w-8 h-8 text-danger mx-auto" />
          <p className="text-base font-bold text-text">تعذر تحميل بيانات التقرير</p>
          <Button variant="outline" size="sm" onClick={() => loadReport(month)}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3. Executive KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Required */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between print:border print:p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">إجمالي المستحق</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 print:hidden">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-text">
                  {reportData.aggregation.totalRequired.toLocaleString("ar-EG")}{" "}
                  <span className="text-xs font-medium text-muted">ج.م</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  إجمالي اشتراكات {reportData.aggregation.totalStudents} طالب
                </p>
              </div>
            </div>

            {/* Collected */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between print:border print:p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-success">المحصّل الفعلي</span>
                <div className="p-2 rounded-xl bg-success/10 text-success print:hidden">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-success">
                  {reportData.aggregation.totalCollected.toLocaleString("ar-EG")}{" "}
                  <span className="text-xs font-medium text-muted">ج.م</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-border/40 h-2 rounded-full overflow-hidden print:hidden">
                    <div
                      className="bg-success h-full rounded-full"
                      style={{ width: `${Math.min(100, reportData.aggregation.collectionRate)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-success">
                    نسبة التحصيل: {reportData.aggregation.collectionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Remaining Debt */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between print:border print:p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-500">إجمالي المتبقي والديون</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 print:hidden">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-500">
                  {reportData.aggregation.totalRemaining.toLocaleString("ar-EG")}{" "}
                  <span className="text-xs font-medium text-muted">ج.م</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  لدى {reportData.aggregation.unpaidCount + reportData.aggregation.partialCount}{" "}
                  طالب
                </p>
              </div>
            </div>

            {/* Breakdown Status */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between print:border print:p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">حالة سداد الطلاب</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary print:hidden">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                <div className="p-2 rounded-xl bg-success/10 border border-success/20 text-success">
                  <div className="text-lg font-bold">{reportData.aggregation.paidCount}</div>
                  <div className="text-[10px]">كامل</div>
                </div>
                <div className="p-2 rounded-xl bg-warning/10 border border-warning/20 text-warning">
                  <div className="text-lg font-bold">{reportData.aggregation.partialCount}</div>
                  <div className="text-[10px]">جزئي</div>
                </div>
                <div className="p-2 rounded-xl bg-danger/10 border border-danger/20 text-danger">
                  <div className="text-lg font-bold">{reportData.aggregation.unpaidCount}</div>
                  <div className="text-[10px]">لم يدفع</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Groups Collection Comparison Table */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden print:border">
            <div className="p-4 border-b border-border flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base text-text">
                  مقارنة التحصيل المالي حسب المجموعات
                </h2>
              </div>
              <span className="text-xs text-muted">
                {reportData.groupsPerformance.length} مجموعة
              </span>
            </div>

            {reportData.groupsPerformance.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                لا توجد مجموعات مسجلة لهذا الشهر
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                      <th className="py-3 px-4">المجموعة</th>
                      <th className="py-3 px-4 text-center">عدد الطلاب</th>
                      <th className="py-3 px-4 min-w-[160px] text-center">نسبة التحصيل</th>
                      <th className="py-3 px-4 text-center">المطلوب</th>
                      <th className="py-3 px-4 text-center text-success">المحصّل</th>
                      <th className="py-3 px-4 text-center text-rose-500">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {reportData.groupsPerformance.map((grp) => (
                      <tr key={grp.groupId} className="hover:bg-background/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-text text-sm">{grp.groupName}</div>
                          {grp.className && (
                            <span className="text-xs text-muted">{grp.className}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {grp.totalStudents} طالب
                          <span className="text-[11px] text-muted block">
                            (سدد: {grp.paidStudents})
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-24 bg-border/40 h-2 rounded-full overflow-hidden print:hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, grp.collectionRate)}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-text font-mono">
                              {grp.collectionRate}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-medium text-xs">
                          {grp.totalRequired.toLocaleString("ar-EG")} ج.م
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-xs text-success">
                          {grp.totalCollected.toLocaleString("ar-EG")} ج.م
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-xs text-rose-500">
                          {grp.totalRemaining.toLocaleString("ar-EG")} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Unpaid / Debtor Students Directory */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden print:border">
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <div>
                  <h2 className="font-bold text-base text-text">
                    الطلاب المتأخرون عن السداد ({filteredUnpaid.length} طالب)
                  </h2>
                  <p className="text-xs text-muted">
                    قائمة الطلاب غير المسددين أو المسددين جزئياً مع روابط تواصل سريعة عبر واتساب
                  </p>
                </div>
              </div>

              {/* Filters for Unpaid List (Hidden on Print) */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="بحث في المتأخرين..."
                    value={debtSearch}
                    onChange={(e) => setDebtSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pr-8 pl-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={selectedDebtGroup}
                  onChange={(e) => setSelectedDebtGroup(e.target.value)}
                  className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-text focus:outline-none cursor-pointer"
                >
                  <option value="all">كل المجموعات</option>
                  {reportData.groupsPerformance.map((g) => (
                    <option key={g.groupId} value={g.groupName}>
                      {g.groupName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredUnpaid.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <p className="text-base font-bold text-text">رائع! لا يوجد متأخرون</p>
                <p className="text-xs text-muted">
                  جميع الطلاب في هذه الفئة قاموا بسداد كامل المستحقات لشهر {monthArabic}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">اسم الطالب</th>
                      <th className="py-3 px-4">المجموعة</th>
                      <th className="py-3 px-4 text-center">المطلوب</th>
                      <th className="py-3 px-4 text-center">المدفوع</th>
                      <th className="py-3 px-4 text-center font-bold text-rose-500">
                        المبلغ المتبقي
                      </th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                      <th className="py-3 px-4 text-center print:hidden">تواصل وتذكير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {filteredUnpaid.map((st, idx) => {
                      const contactPhone = st.parentPhone || st.studentPhone;
                      const waUrl = contactPhone
                        ? formatWhatsAppUrl(contactPhone, st.studentName, monthArabic, st.remaining)
                        : "";

                      return (
                        <tr key={st.studentId} className="hover:bg-background/50 transition-colors">
                          <td className="py-3 px-4 text-center text-xs text-muted">{idx + 1}</td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-text text-sm">{st.studentName}</div>
                            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                              {st.parentPhone && (
                                <span>
                                  ولي الأمر: <span className="font-mono">{st.parentPhone}</span>
                                </span>
                              )}
                              {st.studentPhone && !st.parentPhone && (
                                <span className="font-mono">{st.studentPhone}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-xs font-medium text-text">
                            {st.groupName}
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-xs">
                            {st.required} ج.م
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-xs text-muted">
                            {st.paid} ج.م
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold text-sm text-rose-500">
                            {st.remaining} ج.م
                          </td>

                          <td className="py-3 px-4 text-center">
                            {st.status === "partial" ? (
                              <Badge variant="warning" size="sm">
                                دفع جزء ({st.paid})
                              </Badge>
                            ) : (
                              <Badge variant="danger" size="sm">
                                لم يدفع
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center print:hidden">
                            <div className="flex items-center justify-center gap-2">
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-all"
                                  title="إرسال رسالة تذكير مهذبة عبر واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>تذكير واتساب</span>
                                </a>
                              ) : (
                                <span className="text-xs text-muted">لا يوجد هاتف</span>
                              )}

                              {contactPhone && (
                                <a
                                  href={`tel:${contactPhone}`}
                                  className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:bg-surface transition-colors"
                                  title="اتصال هاتفي"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
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
        </div>
      )}
    </div>
  );
}

export default function PaymentReportsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 text-center">
          <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted mt-2">جاري تجهيز تقارير المستحقات...</p>
        </div>
      }
    >
      <PaymentReportsContent />
    </React.Suspense>
  );
}
