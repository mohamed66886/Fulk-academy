"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  RotateCw,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { createAssistant } from "@/lib/actions/assistants";
import {
  DEFAULT_ASSISTANT_PERMISSIONS,
  FULL_ASSISTANT_PERMISSIONS,
} from "@/lib/auth/permission-constants";
import type { AssistantPermissions, PermissionActions } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

function generateSecurePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

const EMPTY_PERMISSIONS: AssistantPermissions = {
  students: { view: false, create: false, edit: false, delete: false },
  attendance: { view: false, create: false, edit: false, delete: false },
  payments: { view: false, create: false, edit: false, delete: false },
  exams: { view: false, create: false, edit: false, delete: false },
};

export default function CreateAssistantPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [copiedPassword, setCopiedPassword] = React.useState(false);

  const [permissions, setPermissions] = React.useState<AssistantPermissions>(
    DEFAULT_ASSISTANT_PERMISSIONS
  );
  const [loading, setLoading] = React.useState(false);

  // Generate random password on mount
  React.useEffect(() => {
    setPassword(generateSecurePassword());
  }, []);

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    toast.success("تم نسخ كلمة المرور إلى الحافظة");
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  // Toggle single permission
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("يرجى إدخال اسم المساعد");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error("يرجى إدخال رقم هاتف لا يقل عن 10 أرقام");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    setLoading(true);
    try {
      const res = await createAssistant({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        status: "active",
        permissions,
      });

      if (res.success) {
        toast.success(`تمت إضافة المساعد ${name} وإنشاء حسابه بنجاح!`);
        router.push("/users");
      } else {
        toast.error(res.error || "فشل إنشاء حساب المساعد");
      }
    } catch (err) {
      console.error("Create assistant error:", err);
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="border-b border-border pb-6">
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              إضافة مساعد جديد
            </h1>
            <p className="text-sm text-muted">
              إنشاء حساب دخول جديد في المنصة وتعيين الصلاحيات الخاصة به
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2. Personal & Account Details */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base text-text flex items-center gap-2 pb-2 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            البيانات الأساسية ومعلومات تسجيل الدخول
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                اسم المساعد <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="مثال: أحمد محمود"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                البريد الإلكتروني (اسم المستخدم للدخول) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="assistant@academy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                رقم الهاتف <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Password Generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted">
                  كلمة المرور المؤقتة <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateSecurePassword())}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3 text-warning" />
                  توليد كلمة سر جديدة
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pr-10 pl-20 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                  required
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="p-1 text-muted hover:text-text rounded"
                    title={showPassword ? "إخفاء" : "إظهار"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 text-muted hover:text-text rounded"
                    title="نسخ كلمة السر"
                  >
                    {copiedPassword ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Initial Permissions Matrix */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-base text-text">مصفوفة الصلاحيات المبدئية</h2>
                <p className="text-xs text-muted">
                  حدد العمليات المسموح للمساعد إجراؤها لكل قسم من أقسام المنصة
                </p>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPermissions(FULL_ASSISTANT_PERMISSIONS)}
                className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 bg-background transition-colors"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => setPermissions(DEFAULT_ASSISTANT_PERMISSIONS)}
                className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 bg-background transition-colors"
              >
                افتراضي
              </button>
              <button
                type="button"
                onClick={() =>
                  setPermissions({
                    ...EMPTY_PERMISSIONS,
                    attendance: { view: true, create: true, edit: false, delete: false },
                  })
                }
                className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-emerald-600 hover:border-emerald-500/40 bg-background transition-colors"
              >
                حضور فقط
              </button>
              <button
                type="button"
                onClick={() =>
                  setPermissions({
                    ...EMPTY_PERMISSIONS,
                    payments: { view: true, create: true, edit: true, delete: false },
                  })
                }
                className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-amber-600 hover:border-amber-500/40 bg-background transition-colors"
              >
                محاسب
              </button>
              <button
                type="button"
                onClick={() => setPermissions(EMPTY_PERMISSIONS)}
                className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted hover:text-danger hover:border-danger/40 bg-background transition-colors"
              >
                إلغاء الكل
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background/60 text-xs font-semibold text-muted">
                  <th className="py-3 px-4">القسم / الموديول</th>
                  <th className="py-3 px-4 text-center w-24">عرض (View)</th>
                  <th className="py-3 px-4 text-center w-24">إضافة (Create)</th>
                  <th className="py-3 px-4 text-center w-24">تعديل (Edit)</th>
                  <th className="py-3 px-4 text-center w-24">حذف (Delete)</th>
                  <th className="py-3 px-4 text-center w-24">تحكم سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* 1. Students */}
                <tr className="hover:bg-background/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-bold text-text text-sm">الطلاب</div>
                        <div className="text-[11px] text-muted">
                          إدارة ملفات الطلاب، الكروت، وتسجيل المقيدين
                        </div>
                      </div>
                    </div>
                  </td>
                  {(["view", "create", "edit", "delete"] as const).map((act) => (
                    <td key={act} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={permissions.students[act]}
                        onChange={() => handleTogglePermission("students", act)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center">
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
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      تغيير الكل
                    </button>
                  </td>
                </tr>

                {/* 2. Attendance */}
                <tr className="hover:bg-background/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="font-bold text-text text-sm">الحضور والغياب</div>
                        <div className="text-[11px] text-muted">
                          جلسات الحضور، ماسح QR، وسجلات الجلسات
                        </div>
                      </div>
                    </div>
                  </td>
                  {(["view", "create", "edit", "delete"] as const).map((act) => (
                    <td key={act} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={permissions.attendance[act]}
                        onChange={() => handleTogglePermission("attendance", act)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center">
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
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      تغيير الكل
                    </button>
                  </td>
                </tr>

                {/* 3. Payments */}
                <tr className="hover:bg-background/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="font-bold text-text text-sm">المدفوعات والاشتراكات</div>
                        <div className="text-[11px] text-muted">
                          مستحقات الشهور، رصد المبالغ، والتقارير المالية
                        </div>
                      </div>
                    </div>
                  </td>
                  {(["view", "create", "edit", "delete"] as const).map((act) => (
                    <td key={act} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={permissions.payments[act]}
                        onChange={() => handleTogglePermission("payments", act)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center">
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
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      تغيير الكل
                    </button>
                  </td>
                </tr>

                {/* 4. Exams */}
                <tr className="hover:bg-background/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="font-bold text-text text-sm">الامتحانات والدرجات</div>
                        <div className="text-[11px] text-muted">
                          إنشاء الامتحانات ورصد درجات المجموعات
                        </div>
                      </div>
                    </div>
                  </td>
                  {(["view", "create", "edit", "delete"] as const).map((act) => (
                    <td key={act} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={permissions.exams[act]}
                        onChange={() => handleTogglePermission("exams", act)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 text-center">
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
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      تغيير الكل
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/users">
            <Button variant="outline" type="button" disabled={loading}>
              إلغاء
            </Button>
          </Link>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>إنشاء حساب المساعد وتفعيل الصلاحيات</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
