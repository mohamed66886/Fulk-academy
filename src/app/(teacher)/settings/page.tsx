"use client";

import * as React from "react";
import Image from "next/image";
import {
  Settings,
  ShieldCheck,
  RotateCw,
  Clock,
  User,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Mail,
  Phone,
  BookOpen,
  Camera,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  PenTool,
} from "lucide-react";
import { getAuditLogs } from "@/lib/actions/audit";
import {
  getTeacherProfile,
  updateTeacherProfile,
  changeTeacherPassword,
  type TeacherProfileData,
} from "@/lib/actions/profile";
import type { AuditLog, AuditEntityType, ActorRole } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/utils/image-compression";

const ENTITY_LABELS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  student: { label: "الطلاب", icon: GraduationCap },
  attendance: { label: "الحضور والغياب", icon: CalendarCheck },
  payment: { label: "المالية", icon: CreditCard },
  exam: { label: "الامتحانات", icon: ClipboardList },
  assistant: { label: "المساعدين", icon: User },
  group: { label: "المجموعات", icon: BookOpen },
  class: { label: "الصفوف", icon: GraduationCap },
  settings: { label: "الإعدادات", icon: Settings },
};

function getActionBadge(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("ADD")) {
    return (
      <Badge variant="success" size="sm">
        إضافة
      </Badge>
    );
  }
  if (upper.includes("DELETE") || upper.includes("REMOVE")) {
    return (
      <Badge variant="danger" size="sm">
        حذف
      </Badge>
    );
  }
  if (upper.includes("BLOCK") && !upper.includes("UNBLOCK")) {
    return (
      <Badge variant="danger" size="sm">
        حظر
      </Badge>
    );
  }
  if (upper.includes("UNBLOCK") || upper.includes("RESTORE")) {
    return (
      <Badge variant="success" size="sm">
        استرجاع / فك حظر
      </Badge>
    );
  }
  if (upper.includes("UPDATE") || upper.includes("EDIT")) {
    return (
      <Badge variant="primary" size="sm">
        تعديل
      </Badge>
    );
  }
  return (
    <Badge variant="outline" size="sm">
      {action}
    </Badge>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"profile" | "security" | "audit">("profile");

  // Profile State
  const [profile, setProfile] = React.useState<TeacherProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);

  // Form Fields
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(undefined);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [signatureUrl, setSignatureUrl] = React.useState<string | undefined>(undefined);
  const [uploadingSignature, setUploadingSignature] = React.useState(false);

  // Password State
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  // Audit Logs State
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState<boolean>(true);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [entityFilter, setEntityFilter] = React.useState<AuditEntityType | "all">("all");
  const [roleFilter, setRoleFilter] = React.useState<ActorRole | "all">("all");

  // Load Profile on mount
  React.useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const res = await getTeacherProfile();
        if (res.success && res.profile) {
          setProfile(res.profile);
          setName(res.profile.name || "");
          setPhone(res.profile.phone || "");
          setSubject(res.profile.subject || "");
          setPhotoUrl(res.profile.photoUrl);
          setSignatureUrl(res.profile.signatureUrl);
        }
      } catch {
        toast.error("فشل جلب بيانات المدرس");
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  // Handle Photo Upload with Client-Side Canvas Compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    setUploadingPhoto(true);
    try {
      // 1. Compress Image client-side to max 400x400 at 82% quality
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82,
        mimeType: "image/webp",
      });

      if (storage) {
        const storagePath = `teacher-photos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressed);
        const downloadUrl = await getDownloadURL(storageRef);
        setPhotoUrl(downloadUrl);
        toast.success("تم رفع الصورة بنجاح وتجهيزها للحفظ");
      } else {
        // Local preview fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      }
    } catch {
      toast.error("فشل رفع الصورة، يرجى المحاولة مرة أخرى");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Signature Upload with Client-Side Canvas Compression
  const handleSignatureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    setUploadingSignature(true);
    try {
      // 1. Compress Image client-side
      const compressed = await compressImage(file, {
        maxWidth: 600,
        maxHeight: 200,
        quality: 0.9,
        mimeType: "image/webp",
      });

      if (storage) {
        const storagePath = `teacher-signatures/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, compressed);
        const downloadUrl = await getDownloadURL(storageRef);
        setSignatureUrl(downloadUrl);
        toast.success("تم رفع التوقيع بنجاح وتجهيزه للحفظ");
      } else {
        // Local preview fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          setSignatureUrl(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      }
    } catch {
      toast.error("فشل رفع التوقيع، يرجى المحاولة مرة أخرى");
    } finally {
      setUploadingSignature(false);
    }
  };

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم المدرس");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateTeacherProfile({
        name,
        phone,
        subject,
        photoUrl,
        signatureUrl,
      });

      if (res.success) {
        toast.success("تم حفظ البيانات الأساسية بنجاح");
        if (profile) {
          setProfile({ ...profile, name, phone, subject, photoUrl, signatureUrl });
        }
      } else {
        toast.error(res.error || "فشل حفظ البيانات");
      }
    } catch {
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("يجب ألا تقل كلمة المرور عن 8 أحرف");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changeTeacherPassword({
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success("تم تغيير كلمة المرور بنجاح");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "فشل تغيير كلمة المرور");
      }
    } catch {
      toast.error("حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setSavingPassword(false);
    }
  };

  // Audit Logs Loader
  const loadLogs = React.useCallback(
    async (targetPage: number, showToast = false) => {
      setLoadingLogs(true);
      try {
        const res = await getAuditLogs({
          page: targetPage,
          pageSize: 20,
          entityType: entityFilter,
          actorRole: roleFilter,
        });

        if (res.success) {
          setLogs(res.logs);
          setPage(res.page);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
          if (showToast) {
            toast.success("تم تحديث سجل العمليات");
          }
        } else {
          toast.error(res.error || "فشل جلب سجل العمليات");
        }
      } catch {
        toast.error("حدث خطأ أثناء تحميل سجل العمليات");
      } finally {
        setLoadingLogs(false);
      }
    },
    [entityFilter, roleFilter]
  );

  React.useEffect(() => {
    if (activeTab === "audit") {
      loadLogs(1);
    }
  }, [activeTab, loadLogs]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              الإعدادات والحساب
            </h1>
          </div>
          <p className="text-sm text-muted">
            إدارة الملف الشخصي للمدرس، خيارات الأمان وكلمة المرور، وسجل العمليات الرقابي
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-2xl self-start md:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === "profile"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-text"
            )}
          >
            <User className="w-4 h-4" />
            <span>البيانات الأساسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === "security"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-text"
            )}
          >
            <Lock className="w-4 h-4" />
            <span>كلمة المرور والأمان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === "audit"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-text"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>سجل الرقابة</span>
          </button>
        </div>
      </div>

      {/* ================= Tab 1: Profile ================= */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
          {/* Avatar & Summary Card */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 h-fit">
            <div className="relative group">
              <div className="relative h-28 w-28 rounded-2xl overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-4xl font-bold shadow-sm">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={name || "المدرس"}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <span>{name ? name.charAt(0) : "م"}</span>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                    <RotateCw className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              <label
                htmlFor="photo-upload"
                className="absolute -bottom-2 -left-2 bg-primary text-white p-2 rounded-xl shadow-md cursor-pointer hover:bg-primary/90 transition-transform active:scale-95"
                title="تغيير الصورة الشخصية"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h3 className="font-bold text-lg text-text">
                {loadingProfile ? "جاري التحميل..." : name || "المدرس المسؤول"}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {subject ? `مدرس ${subject}` : "مدرس معتمد في المنصة"}
              </p>
            </div>

            <div className="w-full pt-4 border-t border-border/80 space-y-2.5 text-xs text-right">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                <span className="text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  البريد الإلكتروني:
                </span>
                <span className="font-mono text-text font-semibold truncate max-w-[160px]">
                  {profile?.email || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
                <span className="text-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  حالة الحساب:
                </span>
                <Badge variant="success" size="sm">
                  نشط ومعتمد
                </Badge>
              </div>
            </div>

            {/* Signature Area */}
            <div className="w-full pt-4 border-t border-border/80 text-center">
              <span className="text-xs font-semibold text-muted block mb-2">إمضاء المدرس:</span>
              <div className="relative group mx-auto w-full max-w-[200px] h-20 rounded-xl bg-background border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {signatureUrl ? (
                  <Image
                    src={signatureUrl}
                    alt="إمضاء المدرس"
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-muted">لا يوجد إمضاء</span>
                )}

                {uploadingSignature && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                    <RotateCw className="w-5 h-5 animate-spin" />
                  </div>
                )}

                <label
                  htmlFor="signature-upload"
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <PenTool className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-bold">تغيير الإمضاء</span>
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureSelect}
                    disabled={uploadingSignature}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-text mb-4 pb-3 border-b border-border/80 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <span>تعديل البيانات الأساسية</span>
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  الاسم بالكامل <span className="text-danger">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ. محمد عبد الله"
                  required
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  المادة التعليمية / التخصص
                </label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: الرياضيات، الفيزياء، اللغة العربية"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  رقم الهاتف للتواصل
                </label>
                <Input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="text-right"
                />
              </div>

              {/* Readonly Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  البريد الإلكتروني (لتسجيل الدخول)
                </label>
                <Input
                  type="email"
                  dir="ltr"
                  value={profile?.email || ""}
                  disabled
                  className="bg-secondary/40 text-muted cursor-not-allowed text-right"
                />
                <p className="text-[11px] text-muted">
                  لتعديل البريد الإلكتروني الخاص بالحساب، يرجى التواصل مع إدارة النظام.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={savingProfile || loadingProfile}
                  className="flex items-center gap-2 px-6"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= Tab 2: Security & Password ================= */}
      {activeTab === "security" && (
        <div className="max-w-2xl bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-text">تغيير كلمة المرور</h2>
              <p className="text-xs text-muted">
                تأكد من اختيار كلمة مرور قوية تحتوي على 8 أحرف على الأقل
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                كلمة المرور الجديدة <span className="text-danger">*</span>
              </label>
              <Input
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-right font-mono"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                تأكيد كلمة المرور الجديدة <span className="text-danger">*</span>
              </label>
              <Input
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-right font-mono"
              />
            </div>

            {/* Password strength tips */}
            <div className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-1.5 text-muted">
              <p className="font-semibold text-text flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                إرشادات كلمة المرور الآمنة:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pr-2">
                <li>يجب ألا تقل عن 8 أحرف أو أرقام.</li>
                <li>يُفضل استخدام مزيج من الحروف والأرقام والرموز.</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="flex items-center gap-2 px-6"
              >
                <Lock className="w-4 h-4" />
                <span>{savingPassword ? "جاري التحديث..." : "تحديث كلمة المرور"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ================= Tab 3: Audit Logs ================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Audit Filter Toolbar */}
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Entity Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted">القسم:</span>
                <select
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value as AuditEntityType | "all");
                    setPage(1);
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-text focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الأقسام</option>
                  <option value="student">الطلاب</option>
                  <option value="attendance">الحضور والغياب</option>
                  <option value="payment">المدفوعات</option>
                  <option value="exam">الامتحانات</option>
                  <option value="assistant">المساعدين</option>
                </select>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted">الدور:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as ActorRole | "all");
                    setPage(1);
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-text focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الأدوار</option>
                  <option value="teacher">المدرس</option>
                  <option value="assistant">المساعد</option>
                </select>
              </div>

              {(entityFilter !== "all" || roleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEntityFilter("all");
                    setRoleFilter("all");
                    setPage(1);
                  }}
                  className="text-xs text-muted hover:text-text"
                >
                  إعادة ضبط
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted font-mono">{totalCount} عملية مسجلة</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(page, true)}
                disabled={loadingLogs}
                className="flex items-center gap-1.5 text-xs"
              >
                <RotateCw className={cn("w-3.5 h-3.5", loadingLogs && "animate-spin")} />
                تحديث
              </Button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
            {loadingLogs ? (
              <div className="p-12 text-center text-muted">
                <RotateCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm">جاري تحميل سجل العمليات...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-muted">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted" />
                <h3 className="font-bold text-text text-base">لا توجد عمليات مسجلة</h3>
                <p className="text-xs mt-1">لم يتم تسجيل أي نشاط يطابق الفلاتر المحددة حتى الآن.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background/50 text-muted text-xs">
                      <th className="py-3 px-4 font-semibold">التوقيت</th>
                      <th className="py-3 px-4 font-semibold">المنفّذ</th>
                      <th className="py-3 px-4 font-semibold">القسم</th>
                      <th className="py-3 px-4 font-semibold">نوع العملية</th>
                      <th className="py-3 px-4 font-semibold">تفاصيل العملية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => {
                      const entityInfo = ENTITY_LABELS[log.entityType] || {
                        label: log.entityType,
                        icon: ShieldCheck,
                      };
                      const EntityIcon = entityInfo.icon;

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-background/40 transition-colors text-xs"
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted/80" />
                              {log.createdAt
                                ? new Date(log.createdAt).toLocaleString("ar-EG", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                {log.actorName ? log.actorName.charAt(0) : "م"}
                              </div>
                              <div>
                                <span className="font-bold text-text block">
                                  {log.actorName || "مستخدم"}
                                </span>
                                <span className="text-[10px] text-muted">
                                  {log.actorRole === "teacher"
                                    ? "المدرس"
                                    : log.actorRole === "assistant"
                                      ? "مساعد"
                                      : "مسؤول النظام"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Entity Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 text-text font-medium text-xs">
                              <EntityIcon className="w-3.5 h-3.5 text-primary" />
                              {entityInfo.label}
                            </span>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4">
                            <p className="text-xs text-text leading-relaxed font-medium">
                              {log.description}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between bg-background/40">
                <span className="text-xs text-muted">
                  صفحة {page} من {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadLogs(page - 1)}
                    disabled={page <= 1 || loadingLogs}
                    className="p-1.5 text-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadLogs(page + 1)}
                    disabled={page >= totalPages || loadingLogs}
                    className="p-1.5 text-xs"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
