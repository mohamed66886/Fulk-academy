"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";
import { getFirebaseAuthErrorMessage } from "@/lib/utils/firebase-errors";
import { useAuthStore, type UserRole } from "@/stores";
import { toast } from "@/components/ui/toast";
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
  PlayCircle,
  PhoneCall,
} from "lucide-react";
import { ReCaptcha } from "@/components/ui/recaptcha";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = React.useState(false);
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!captchaToken) {
      toast.error("يرجى إكمال التحقق من خانة 'أنا لست برنامج روبوت' أولاً.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Authenticate with Firebase Auth Client SDK
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

      // 2. Retrieve fresh ID Token with custom claims
      const idToken = await userCredential.user.getIdToken(true);

      // 3. Establish verified server session and check disabled status
      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, recaptchaToken: captchaToken }),
      });

      let sessionResult;
      const contentType = sessionResponse.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        sessionResult = await sessionResponse.json();
      } else {
        const text = await sessionResponse.text();
        throw new Error(
          `خادم Vercel لا يستجيب بشكل صحيح (Status: ${sessionResponse.status}). Text: ${text.substring(0, 50)}...`
        );
      }

      // If account is disabled or unauthorized on server
      if (!sessionResponse.ok) {
        await signOut(auth);
        setError("root", {
          message: sessionResult.error || "تم إيقاف هذا الحساب، تواصل مع الإدارة.",
        });
        toast.error(sessionResult.error || "تم إيقاف هذا الحساب، تواصل مع الإدارة.");
        setIsLoading(false);
        return;
      }

      // 4. Update client-side Auth Store with user role & permissions
      setAuth({
        uid: userCredential.user.uid,
        email: userCredential.user.email || data.email,
        role: sessionResult.role as UserRole,
        teacherId: sessionResult.teacherId,
        permissions: sessionResult.permissions,
      });

      toast.success("تم تسجيل الدخول بنجاح! مرحبًا بك.");

      // 5. Navigate to designated portal based on role
      if (callbackUrl && !callbackUrl.includes("/login")) {
        router.push(callbackUrl);
      } else if (sessionResult.role === "super_admin") {
        router.push("/super-admin/dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const errorMessage = getFirebaseAuthErrorMessage(err.code || "", err.message);
      setError("root", { message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px]">
      {/* Title Outside Card */}
      <h1 className="text-3xl sm:text-[34px] font-extrabold text-[#23272f] tracking-tight mb-6 text-center font-sans">
        FULK-ACADEMY
      </h1>

      {/* Main Card */}
      <div className="bg-white border border-[#dce2e9] rounded-[4px] shadow-xs p-6 sm:p-9 text-slate-800">
        {/* Red Notice */}
        <div className="text-center mb-4">
          <p className="text-[#dc2626] text-xs sm:text-[13px] font-bold leading-relaxed">
            تنبيه أمني: يُرجى الحفاظ التام على خصوصية وسرية بيانات الطلاب وعدم مشاركة بيانات الطلاب
            مع أي طرف آخر
          </p>
        </div>

        {/* Credentials Subtitle */}
        <p className="text-center text-[#596273] text-[15px] font-normal mb-2.5">
          Enter your credentials
        </p>

        {/* Watch Help Video Link */}
        <div className="text-center mb-5">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1.5 text-[#0d6efd] hover:text-[#0b5ed7] text-[14px] font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4 fill-[#0d6efd] text-white" />
            <span>Watch Help Video</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-3.5">
          {/* Global Error Banner */}
          {errors.root && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Email or Username Input */}
          <div className="relative">
            <input
              id="email"
              type="text"
              placeholder="Email or username"
              dir="ltr"
              autoComplete="username"
              disabled={isLoading}
              {...register("email")}
              className={`w-full h-11 px-3.5 pr-10 bg-white border ${
                errors.email ? "border-red-500 ring-1 ring-red-500/20" : "border-[#ced4da]"
              } rounded-[4px] text-[14px] text-gray-800 placeholder:text-[#6c757d] focus:outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[#007bff]/20 transition-colors`}
            />
            <Mail className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-600 text-right font-medium">
              {errors.email.message}
            </p>
          )}

          {/* Password Input */}
          <div className="relative">
            <input
              id="password"
              type="password"
              placeholder="Password"
              dir="ltr"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              className={`w-full h-11 px-3.5 pr-10 bg-white border ${
                errors.password ? "border-red-500 ring-1 ring-red-500/20" : "border-[#ced4da]"
              } rounded-[4px] text-[14px] text-gray-800 placeholder:text-[#6c757d] focus:outline-none focus:border-[#80bdff] focus:ring-2 focus:ring-[#007bff]/20 transition-colors`}
            />
            <Lock className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c757d]" />
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-600 text-right font-medium">
              {errors.password.message}
            </p>
          )}

          {/* Real Google reCAPTCHA Component */}
          <ReCaptcha
            onVerify={(token) => {
              setCaptchaToken(token);
            }}
            onExpire={() => {
              setCaptchaToken(null);
            }}
          />

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#007bff] hover:bg-[#0069d9] active:bg-[#0062cc] text-white font-medium text-[15px] rounded-[4px] transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
          </button>

          {/* Exam Center Button */}
          <Link
            href="/exams"
            className="w-full h-11 bg-white hover:bg-[#f8fcf9] text-[#28a745] border border-[#28a745] font-medium text-[15px] rounded-[4px] transition-colors flex items-center justify-center text-center mt-2"
          >
            Exam Center
          </Link>
        </form>
      </div>

      {/* Watch Help Video Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <PlayCircle className="w-4 h-4" />
                <span>دليل الاستخدام وفيديو المساعدة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-right space-y-4 text-sm text-gray-700">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 leading-relaxed">
                <strong>تنبيه أمني للمعلم:</strong> يُرجى الحفاظ التام على خصوصية وسرية بيانات
                الطلاب ودرجاتهم، وتجنب مشاركة كلمة المرور مع أي شخص غير مخول لضمان أمان النظام.
              </div>
              <ul className="space-y-2 text-xs text-gray-600 list-disc list-inside">
                <li>استخدم بريدك الإلكتروني وكلمة المرور المعتمدة.</li>
                <li>اضغط على زر Exam Center للوصول السريع إلى قسم الامتحانات.</li>
                <li>في حال واجهت أي صعوبة، يمكنك التواصل مباشرة مع الدعم الفني.</li>
              </ul>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <a
                  href="https://wa.me/201551290902?text=مرحباً،%20أحتاج%20مساعدة%20في%20تسجيل%20الدخول%20لمنصة%20فُلك%20أكاديمي"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>مساعدة واتساب: 201551290902+</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-semibold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen bg-[#eaedf1] flex flex-col items-center justify-center p-4 py-8"
      dir="rtl"
    >
      <Suspense
        fallback={
          <div className="flex h-64 w-full max-w-[440px] items-center justify-center rounded bg-white shadow-xs">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
