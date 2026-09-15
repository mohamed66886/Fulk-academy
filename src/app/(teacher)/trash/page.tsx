"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trash2,
  RotateCcw,
  Search,
  RotateCw,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  getTrashItems,
  restoreTrashItem,
  permanentDeleteTrashItem,
  type TrashItem,
} from "@/lib/actions/trash";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function TrashPage() {
  const [items, setItems] = React.useState<TrashItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [entityFilter, setEntityFilter] = React.useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Hard Delete Modal State
  const [hardDeleteTarget, setHardDeleteTarget] = React.useState<TrashItem | null>(null);
  const [confirmationInput, setConfirmationInput] = React.useState<string>("");

  const loadTrash = React.useCallback(
    async (showToast = false) => {
      setLoading(true);
      try {
        const res = await getTrashItems(entityFilter);
        if (res.success) {
          setItems(res.items);
          if (showToast) {
            toast.success("تم تحديث سلة المحذوفات");
          }
        } else {
          toast.error(res.error || "فشل جلب سلة المحذوفات");
        }
      } catch {
        toast.error("حدث خطأ أثناء تحميل المحذوفات");
      } finally {
        setLoading(false);
      }
    },
    [entityFilter]
  );

  React.useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // Handle Restore
  const handleRestore = async (item: TrashItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await restoreTrashItem({
        entityType: item.entityType,
        entityId: item.id,
      });

      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success(`تم استرجاع ${item.name} بنجاح`);
      } else {
        toast.error(res.error || "فشل استرجاع العنصر");
      }
    } catch {
      toast.error("حدث خطأ أثناء استرجاع العنصر");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Permanent Delete
  const handlePermanentDelete = async () => {
    if (!hardDeleteTarget) return;

    if (confirmationInput.trim() !== hardDeleteTarget.name.trim()) {
      toast.error("الاسم المكتوب غير متطابق تماماً");
      return;
    }

    const target = hardDeleteTarget;
    setActionLoadingId(target.id);
    try {
      const res = await permanentDeleteTrashItem({
        entityType: target.entityType,
        entityId: target.id,
        confirmedName: confirmationInput.trim(),
      });

      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== target.id));
        toast.success(`تم الحذف النهائي لـ ${target.name} نهائياً`);
        setHardDeleteTarget(null);
        setConfirmationInput("");
      } else {
        toast.error(res.error || "فشل الحذف النهائي");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف النهائي");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDetails = item.details?.toLowerCase().includes(q);
        if (!matchName && !matchDetails) return false;
      }
      return true;
    });
  }, [items, searchQuery]);

  const isConfirmationMatched =
    hardDeleteTarget && confirmationInput.trim() === hardDeleteTarget.name.trim();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Trash2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              سلة المحذوفات
            </h1>
          </div>
          <p className="text-sm text-muted">
            إدارة العناصر المحذوفة مؤقتاً، استعادتها بضغطة زر، أو حذفها نهائياً وفيزيائياً من النظام
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTrash(true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
            تحديث
          </Button>

          <Link href="/students">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted hover:text-text"
            >
              <Users className="w-4 h-4" />
              الطلاب النشطون
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Safety Notification Banner */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text">
              الحذف الآمن القابل للاسترجاع (Soft Delete)
            </h3>
            <p className="text-xs text-muted leading-relaxed mt-1">
              يتم الاحتفاظ بجميع السجلات المحذوفة هنا لحمايتها من الأخطاء العرضية، ويمكنك استعادتها
              فوراً مع كافة سجلاتها السابقة أو الحذف النهائي المشدد.
            </p>
          </div>
        </div>

        <div className="p-3 bg-background border border-border rounded-xl text-center shrink-0 hidden sm:block">
          <div className="font-bold text-lg text-text font-mono">{items.length}</div>
          <div className="text-[10px] text-muted">عنصر محذوف</div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في العناصر المحذوفة..."
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

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
          >
            <option value="all">كل الكيانات ({items.length})</option>
            <option value="student">الطلاب فقط</option>
          </select>
        </div>
      </div>

      {/* 4. Trash Items Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted">جاري تحميل سلة المحذوفات...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="p-4 bg-success/10 rounded-2xl w-fit mx-auto text-success">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-text">
              {searchQuery ? "لا توجد نتائج مطابقة لبحثك" : "سلة المحذوفات فارغة"}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              {searchQuery
                ? "جرب البحث بكلمات أخرى أو مسح حقل البحث"
                : "لا توجد عناصر محذوفة حالياً، كافة البيانات نشطة"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[200px]">العنصر المحذوف</th>
                  <th className="py-3.5 px-4 min-w-[160px]">التفاصيل</th>
                  <th className="py-3.5 px-4 min-w-[150px]">تاريخ الحذف</th>
                  <th className="py-3.5 px-4 text-center min-w-[200px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredItems.map((item, idx) => {
                  const isActing = actionLoadingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-background/50 transition-colors",
                        isActing && "opacity-50 pointer-events-none"
                      )}
                    >
                      <td className="py-3.5 px-4 text-center text-xs text-muted font-mono">
                        {idx + 1}
                      </td>

                      {/* Item Name & Entity Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text text-sm flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span>{item.name}</span>
                        </div>
                        <Badge variant="outline" size="sm" className="mt-1 text-[10px]">
                          طالب
                        </Badge>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-xs text-muted">{item.details || "—"}</td>

                      {/* Deleted At */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          <span>
                            {item.deletedAt
                              ? new Date(item.deletedAt).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Restore Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(item)}
                            disabled={isActing}
                            className="text-xs h-8 px-3 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 border-emerald-500/20 font-medium flex items-center gap-1.5"
                            title="استرجاع العنصر إلى القائمة النشطة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استرجاع</span>
                          </Button>

                          {/* Hard Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setHardDeleteTarget(item);
                              setConfirmationInput("");
                            }}
                            disabled={isActing}
                            className="text-xs h-8 px-2.5 text-muted hover:text-danger hover:bg-danger/10 flex items-center gap-1"
                            title="حذف نهائي لا رجعة فيه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف نهائي</span>
                          </Button>
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

      {/* 5. GitHub-style Safety Confirmation Modal for Permanent Delete */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <div className="p-3 bg-danger/10 text-danger rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text">تأكيد الحذف النهائي الصارم</h3>
                <p className="text-xs text-muted mt-0.5">
                  هذا الإجراء سيقوم بمسح السجل تماماً من قاعدة البيانات ولن تتمكن من التراجع
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 text-xs text-danger leading-relaxed space-y-1">
              <p className="font-bold">⚠️ تحذير أمني شديد:</p>
              <p>
                أنت على وشك حذف العنصر{" "}
                <span className="font-bold underline">{hardDeleteTarget.name}</span> نهائياً. سيتم
                إلغاء كافة السجلات والكروت الخاصة به ولن تستطيع استعادتها أبداً.
              </p>
            </div>

            {/* Typing Confirmation Requirement */}
            <div>
              <label className="block text-xs font-semibold text-text mb-2">
                لتأكيد الحذف النهائي، اكتب اسم العنصر بالضبط أدناه:{" "}
                <span className="font-mono font-bold text-primary select-all bg-primary/10 px-1.5 py-0.5 rounded">
                  {hardDeleteTarget.name}
                </span>
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={hardDeleteTarget.name}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent transition-all font-medium"
                autoFocus
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHardDeleteTarget(null);
                  setConfirmationInput("");
                }}
                disabled={actionLoadingId === hardDeleteTarget.id}
              >
                إلغاء
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handlePermanentDelete}
                disabled={!isConfirmationMatched || actionLoadingId === hardDeleteTarget.id}
                className={cn(
                  "flex items-center gap-1.5 transition-all",
                  !isConfirmationMatched && "opacity-40 cursor-not-allowed"
                )}
              >
                {actionLoadingId === hardDeleteTarget.id ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>أفهم العواقب، احذف نهائياً</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
