"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  RotateCw,
  Mail,
  Phone,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { getAssistants, toggleAssistantStatus, deleteAssistant } from "@/lib/actions/assistants";
import type { Assistant } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [assistants, setAssistants] = React.useState<Assistant[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = React.useState<Assistant | null>(null);

  const loadAssistants = React.useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const res = await getAssistants();
      if (res.success) {
        setAssistants(res.assistants);
        if (showToast) {
          toast.success("تم تحديث قائمة المساعدين بنجاح");
        }
      } else {
        toast.error(res.error || "فشل جلب قائمة المساعدين");
      }
    } catch (err) {
      console.error("Error loading assistants:", err);
      toast.error("حدث خطأ أثناء تحميل بيانات المساعدين");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  // Toggle Assistant Status (Active <-> Disabled)
  const handleToggleStatus = async (assistant: Assistant) => {
    setActionLoadingId(assistant.id);
    try {
      const res = await toggleAssistantStatus(assistant.id);
      if (res.success && res.newStatus) {
        setAssistants((prev) =>
          prev.map((a) => (a.id === assistant.id ? { ...a, status: res.newStatus! } : a))
        );
        toast.success(
          res.newStatus === "active"
            ? `تم تفعيل حساب المساعد ${assistant.name}`
            : `تم إيقاف حساب المساعد ${assistant.name}`
        );
      } else {
        toast.error(res.error || "فشل تغيير حالة الحساب");
      }
    } catch {
      toast.error("حدث خطأ أثناء تغيير حالة الحساب");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm Delete Assistant
  const handleDeleteAssistant = async () => {
    if (!deleteModal) return;
    const target = deleteModal;
    setActionLoadingId(target.id);
    try {
      const res = await deleteAssistant(target.id);
      if (res.success) {
        setAssistants((prev) => prev.filter((a) => a.id !== target.id));
        toast.success(`تم حذف حساب المساعد ${target.name} نهائياً`);
        setDeleteModal(null);
      } else {
        toast.error(res.error || "فشل حذف المساعد");
      }
    } catch {
      toast.error("حدث خطأ أثناء حذف الحساب");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter assistants
  const filteredAssistants = React.useMemo(() => {
    return assistants.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.name.toLowerCase().includes(q);
        const matchEmail = a.email.toLowerCase().includes(q);
        const matchPhone = a.phone.includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }
      return true;
    });
  }, [assistants, statusFilter, searchQuery]);

  const activeCount = assistants.filter((a) => a.status === "active").length;
  const disabledCount = assistants.filter((a) => a.status === "disabled").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              إدارة المساعدين وصلاحيات الوصول
            </h1>
          </div>
          <p className="text-sm text-muted">
            إضافة المساعدين، منح الصلاحيات الدقيقة لكل قسم، والتحكم في حالات تفعيل الحسابات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAssistants(true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
            تحديث
          </Button>

          <Link href="/users/create">
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover shadow-md hover:shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مساعد جديد</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted">إجمالي المساعدين</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-text mt-1">
              {assistants.length}
            </div>
            <p className="text-xs text-muted mt-0.5">مسجلين بالأكاديمية</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-success">الحسابات النشطة</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-success mt-1">
              {activeCount}
            </div>
            <p className="text-xs text-muted mt-0.5">يمكنهم الدخول واستخدام المنصة</p>
          </div>
          <div className="p-3 rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-500">الحسابات الموقوفة</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 mt-1">
              {disabledCount}
            </div>
            <p className="text-xs text-muted mt-0.5">محظورون مؤقتاً من الدخول</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني أو الهاتف..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
          >
            <option value="all">كل الحالات ({assistants.length})</option>
            <option value="active">نشط فقط ({activeCount})</option>
            <option value="disabled">معطل فقط ({disabledCount})</option>
          </select>
        </div>
      </div>

      {/* 4. Assistants Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm font-medium text-muted">جاري تحميل قائمة المساعدين...</p>
          </div>
        ) : filteredAssistants.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="p-4 bg-muted/10 rounded-2xl w-fit mx-auto text-muted">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-text">لا يوجد مساعدون مسجلون</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              يمكنك إضافة مساعدين وتعيين صلاحيات خاصة لكل منهم لتوزيع المهام في الأكاديمية
            </p>
            <Link href="/users/create" className="inline-block mt-2">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                إضافة أول مساعد الآن
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">المساعد</th>
                  <th className="py-3.5 px-4">البريد الإلكتروني</th>
                  <th className="py-3.5 px-4">الصلاحيات الممنوحة</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center min-w-[200px]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredAssistants.map((assistant, idx) => {
                  const isActing = actionLoadingId === assistant.id;
                  const perms = assistant.permissions;

                  const hasStudents =
                    perms?.students?.view ||
                    perms?.students?.create ||
                    perms?.students?.edit ||
                    perms?.students?.delete;

                  const hasAttendance =
                    perms?.attendance?.view ||
                    perms?.attendance?.create ||
                    perms?.attendance?.edit ||
                    perms?.attendance?.delete;

                  const hasPayments =
                    perms?.payments?.view ||
                    perms?.payments?.create ||
                    perms?.payments?.edit ||
                    perms?.payments?.delete;

                  const hasExams =
                    perms?.exams?.view ||
                    perms?.exams?.create ||
                    perms?.exams?.edit ||
                    perms?.exams?.delete;

                  return (
                    <tr
                      key={assistant.id}
                      className={cn(
                        "hover:bg-background/50 transition-colors",
                        isActing && "opacity-50 pointer-events-none"
                      )}
                    >
                      <td className="py-3 px-4 text-center text-xs text-muted font-mono">
                        {idx + 1}
                      </td>

                      {/* Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-text text-sm">{assistant.name}</div>
                        {assistant.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted mt-0.5 font-mono">
                            <Phone className="w-3 h-3" />
                            {assistant.phone}
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
                          <Mail className="w-3.5 h-3.5 text-muted" />
                          <span>{assistant.email}</span>
                        </div>
                      </td>

                      {/* Permissions Summary Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasStudents ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                              <GraduationCap className="w-3 h-3" />
                              الطلاب
                            </span>
                          ) : null}

                          {hasAttendance ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                              <CalendarCheck className="w-3 h-3" />
                              الحضور
                            </span>
                          ) : null}

                          {hasPayments ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                              <CreditCard className="w-3 h-3" />
                              المالية
                            </span>
                          ) : null}

                          {hasExams ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-medium">
                              <ClipboardList className="w-3 h-3" />
                              الامتحانات
                            </span>
                          ) : null}

                          {!hasStudents && !hasAttendance && !hasPayments && !hasExams && (
                            <span className="text-xs text-muted">لا توجد صلاحيات معينة</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {assistant.status === "active" ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="w-3 h-3" />
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            <AlertCircle className="w-3 h-3" />
                            معطل
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Permissions Matrix Button */}
                          <Link href={`/users/${assistant.id}/permissions`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2.5 text-primary hover:bg-primary/10 hover:border-primary/30 flex items-center gap-1 font-medium"
                              title="إدارة وتعديل مصفوفة الصلاحيات"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              الصلاحيات
                            </Button>
                          </Link>

                          {/* Toggle Active/Disabled */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(assistant)}
                            className={cn(
                              "text-xs h-8 px-2 flex items-center gap-1",
                              assistant.status === "active"
                                ? "text-amber-500 hover:bg-amber-500/10"
                                : "text-success hover:bg-success/10"
                            )}
                            title={assistant.status === "active" ? "إيقاف الحساب" : "تفعيل الحساب"}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {assistant.status === "active" ? "إيقاف" : "تفعيل"}
                          </Button>

                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteModal(assistant)}
                            className="text-xs h-8 px-2 text-muted hover:text-danger hover:bg-danger/10"
                            title="حذف الحساب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* 5. Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-danger">
              <div className="p-3 bg-danger/10 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text">تأكيد حذف المساعد</h3>
                <p className="text-xs text-muted">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-sm text-text">
              هل أنت متأكد من رغبتك في حذف حساب المساعد{" "}
              <span className="font-bold text-danger">{deleteModal.name}</span> نهائياً؟ سيتم إلغاء
              كافة صلاحياته وحذف حسابه من النظام.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModal(null)}
                disabled={actionLoadingId === deleteModal.id}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteAssistant}
                disabled={actionLoadingId === deleteModal.id}
                className="flex items-center gap-1.5"
              >
                {actionLoadingId === deleteModal.id ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                نعم، احذف المساعد
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
