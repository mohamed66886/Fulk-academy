"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  User,
  Mail,
  Phone,
  RotateCw,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { getAssistant, updateAssistantPermissions } from "@/lib/actions/assistants";
import {
  DEFAULT_ASSISTANT_PERMISSIONS,
  FULL_ASSISTANT_PERMISSIONS,
} from "@/lib/auth/permission-constants";
import type { Assistant, AssistantPermissions, PermissionActions } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

const EMPTY_PERMISSIONS: AssistantPermissions = {
  students: { view: false, create: false, edit: false, delete: false },
  attendance: { view: false, create: false, edit: false, delete: false },
  payments: { view: false, create: false, edit: false, delete: false },
  exams: { view: false, create: false, edit: false, delete: false },
};

const VIEW_ONLY_PERMISSIONS: AssistantPermissions = {
  students: { view: true, create: false, edit: false, delete: false },
  attendance: { view: true, create: false, edit: false, delete: false },
  payments: { view: true, create: false, edit: false, delete: false },
  exams: { view: true, create: false, edit: false, delete: false },
};

export default function AssistantPermissionsPage() {
  const params = useParams();
  const assistantId = params.id as string;

  const [assistant, setAssistant] = React.useState<Assistant | null>(null);
  const [permissions, setPermissions] = React.useState<AssistantPermissions>(
    DEFAULT_ASSISTANT_PERMISSIONS
  );
  const [initialPermissions, setInitialPermissions] = React.useState<AssistantPermissions>(
    DEFAULT_ASSISTANT_PERMISSIONS
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!assistantId) return;
    setLoading(true);
    try {
      const res = await getAssistant(assistantId);
      if (res.success && res.assistant) {
        setAssistant(res.assistant);
        setPermissions(res.assistant.permissions);
        setInitialPermissions(res.assistant.permissions);
      } else {
        toast.error(res.error || "تعذر العثور على بيانات المساعد");
      }
    } catch {
      toast.error("حدث خطأ أثناء تحميل بيانات المساعد");
    } finally {
      setLoading(false);
    }
  }, [assistantId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle single operation
  const handleTogglePermission = (
    module: keyof AssistantPermissions,
    action: keyof PermissionActions
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  };

  // Toggle all actions for a specific module
  const handleToggleModuleAll = (module: keyof AssistantPermissions, enable: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        view: enable,
        create: enable,
        edit: enable,
        delete: enable,
      },
    }));
  };

  // Check if permissions have changed
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(permissions) !== JSON.stringify(initialPermissions);
  }, [permissions, initialPermissions]);

  // Count active permissions
  const activePermissionsCount = React.useMemo(() => {
    let count = 0;
    Object.values(permissions).forEach((mod) => {
      Object.values(mod).forEach((val) => {
        if (val) count++;
      });
    });
    return count;
  }, [permissions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAssistantPermissions({
        assistantId,
        permissions,
      });

      if (res.success) {
        setInitialPermissions(permissions);
        toast.success(res.message || "تم حفظ وتحديث الصلاحيات بنجاح");
      } else {
        toast.error(res.error || "فشل حفظ الصلاحيات");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء حفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 max-w-4xl mx-auto" dir="rtl">
        <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm font-medium text-muted">جاري تحميل مصفوفة الصلاحيات...</p>
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="p-16 text-center space-y-3 max-w-4xl mx-auto" dir="rtl">
        <AlertCircle className="w-8 h-8 text-danger mx-auto" />
        <p className="text-base font-bold text-text">حساب المساعد غير موجود</p>
        <Link href="/users">
          <Button variant="outline" size="sm">
            العودة لقائمة المساعدين
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link
              href="/users"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة إلى قائمة المساعدين
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
                مصفوفة صلاحيات المساعد: {assistant.name}
              </h1>
              <p className="text-sm text-muted">
                التحكم في العمليات المتاحة للمساعد داخل النظام (تأمين على مستوى الخادم)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover shadow-md hover:shadow-lg transition-all"
          >
            {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ الصلاحيات</span>
          </Button>
        </div>
      </div>

      {/* 2. Assistant Overview Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-text">{assistant.name}</h2>
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
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1 font-mono">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {assistant.email}
              </span>
              {assistant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {assistant.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className="p-2.5 rounded-xl bg-background border border-border text-center">
            <div className="font-bold text-sm text-primary font-mono">
              {activePermissionsCount} / 16
            </div>
            <div className="text-[10px] mt-0.5">عملية مفعلة</div>
          </div>
        </div>
      </div>

      {/* 3. Permissions Presets Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            نماذج صلاحيات جاهزة (اضغط لتطبيق فوري):
          </span>
          {hasChanges && (
            <span className="text-xs font-bold text-amber-500 animate-pulse">
              * لديك تغييرات غير محفوظة
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPermissions(FULL_ASSISTANT_PERMISSIONS)}
            className="text-xs text-primary hover:bg-primary/10"
          >
            مشرف شامل (تحديد الكل)
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPermissions({
                ...EMPTY_PERMISSIONS,
                attendance: { view: true, create: true, edit: true, delete: false },
                students: { view: true, create: false, edit: false, delete: false },
              })
            }
            className="text-xs text-emerald-600 hover:bg-emerald-500/10"
          >
            مسؤول حضور ومسح كروت
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPermissions({
                ...EMPTY_PERMISSIONS,
                payments: { view: true, create: true, edit: true, delete: false },
                students: { view: true, create: false, edit: false, delete: false },
              })
            }
            className="text-xs text-amber-600 hover:bg-amber-500/10"
          >
            محاسب وأمين خزانة
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPermissions({
                ...EMPTY_PERMISSIONS,
                exams: { view: true, create: true, edit: true, delete: false },
                students: { view: true, create: false, edit: false, delete: false },
              })
            }
            className="text-xs text-purple-600 hover:bg-purple-500/10"
          >
            مدخل درجات وامتحانات
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPermissions(VIEW_ONLY_PERMISSIONS)}
            className="text-xs text-blue-600 hover:bg-blue-500/10"
          >
            قراءة واستعراض فقط
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPermissions(EMPTY_PERMISSIONS)}
            className="text-xs text-danger hover:bg-danger/10"
          >
            إلغاء الكل
          </Button>
        </div>
      </div>

      {/* 4. Permissions Matrix Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60 text-xs font-semibold text-muted">
              <th className="py-4 px-5">القسم / الموديول</th>
              <th className="py-4 px-4 text-center w-28">عرض (View)</th>
              <th className="py-4 px-4 text-center w-28">إضافة (Create)</th>
              <th className="py-4 px-4 text-center w-28">تعديل (Edit)</th>
              <th className="py-4 px-4 text-center w-28">حذف (Delete)</th>
              <th className="py-4 px-4 text-center w-28">إجراء سريع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* 1. Students */}
            <tr className="hover:bg-background/40 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-text text-sm">الطلاب</div>
                    <div className="text-xs text-muted">
                      عرض الملفات، إنشاء كروت، حظر واستعادة الطلاب
                    </div>
                  </div>
                </div>
              </td>
              {(["view", "create", "edit", "delete"] as const).map((act) => (
                <td key={act} className="py-4 px-4 text-center">
                  <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.students[act]}
                      onChange={() => handleTogglePermission("students", act)}
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-border cursor-pointer"
                    />
                  </label>
                </td>
              ))}
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleModuleAll(
                      "students",
                      !permissions.students.view ||
                        !permissions.students.create ||
                        !permissions.students.edit ||
                        !permissions.students.delete
                    )
                  }
                  className="text-xs text-primary hover:underline font-medium"
                >
                  تغيير الكل
                </button>
              </td>
            </tr>

            {/* 2. Attendance */}
            <tr className="hover:bg-background/40 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-text text-sm">الحضور والغياب</div>
                    <div className="text-xs text-muted">
                      فتح الجلسات، مسح الكروت عبر الكاميرا/الباركود، وتعديل السجلات
                    </div>
                  </div>
                </div>
              </td>
              {(["view", "create", "edit", "delete"] as const).map((act) => (
                <td key={act} className="py-4 px-4 text-center">
                  <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.attendance[act]}
                      onChange={() => handleTogglePermission("attendance", act)}
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-border cursor-pointer"
                    />
                  </label>
                </td>
              ))}
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleModuleAll(
                      "attendance",
                      !permissions.attendance.view ||
                        !permissions.attendance.create ||
                        !permissions.attendance.edit ||
                        !permissions.attendance.delete
                    )
                  }
                  className="text-xs text-primary hover:underline font-medium"
                >
                  تغيير الكل
                </button>
              </td>
            </tr>

            {/* 3. Payments */}
            <tr className="hover:bg-background/40 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-text text-sm">المدفوعات والاشتراكات</div>
                    <div className="text-xs text-muted">
                      مستحقات الشهور، رصد المبالغ المدفوعة، واستعراض التقارير المالية
                    </div>
                  </div>
                </div>
              </td>
              {(["view", "create", "edit", "delete"] as const).map((act) => (
                <td key={act} className="py-4 px-4 text-center">
                  <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.payments[act]}
                      onChange={() => handleTogglePermission("payments", act)}
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-border cursor-pointer"
                    />
                  </label>
                </td>
              ))}
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleModuleAll(
                      "payments",
                      !permissions.payments.view ||
                        !permissions.payments.create ||
                        !permissions.payments.edit ||
                        !permissions.payments.delete
                    )
                  }
                  className="text-xs text-primary hover:underline font-medium"
                >
                  تغيير الكل
                </button>
              </td>
            </tr>

            {/* 4. Exams */}
            <tr className="hover:bg-background/40 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-text text-sm">الامتحانات والدرجات</div>
                    <div className="text-xs text-muted">
                      إنشاء الامتحانات، رصد درجات الطلاب، وتعديل النتائج
                    </div>
                  </div>
                </div>
              </td>
              {(["view", "create", "edit", "delete"] as const).map((act) => (
                <td key={act} className="py-4 px-4 text-center">
                  <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.exams[act]}
                      onChange={() => handleTogglePermission("exams", act)}
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-border cursor-pointer"
                    />
                  </label>
                </td>
              ))}
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleModuleAll(
                      "exams",
                      !permissions.exams.view ||
                        !permissions.exams.create ||
                        !permissions.exams.edit ||
                        !permissions.exams.delete
                    )
                  }
                  className="text-xs text-primary hover:underline font-medium"
                >
                  تغيير الكل
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Sticky / Floating Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-4 z-40 bg-surface/90 backdrop-blur-md border border-primary/30 rounded-2xl p-4 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-sm font-bold text-text">
              تم تعديل الصلاحيات ({activePermissionsCount} عملية محددة)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermissions(initialPermissions)}
              disabled={saving}
            >
              تراجع
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5"
            >
              {saving ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ التغييرات الآن
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
