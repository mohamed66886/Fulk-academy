"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth";
import { getFirebaseAuthErrorMessage } from "@/lib/utils/firebase-errors";
import { useAuthStore, type UserRole } from "@/stores";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import { Compass, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = React.useState(false);

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
        body: JSON.stringify({ idToken }),
      });

      let sessionResult;
      const contentType = sessionResponse.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        sessionResult = await sessionResponse.json();
      } else {
        const text = await sessionResponse.text();
        throw new Error(`خادم Vercel لا يستجيب بشكل صحيح (Status: ${sessionResponse.status}). Text: ${text.substring(0, 50)}...`);
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
    <Card className="w-full max-w-md border-border bg-surface shadow-xl">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Compass className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-extrabold text-text tracking-tight">
          فُلك أكاديمي
        </CardTitle>
        <CardDescription className="text-xs text-muted">
          يرجى إدخال بيانات الدخول المعتمدة للوصول إلى لوحة التحكم
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4">
          {/* Global Error Banner */}
          {errors.root && (
            <div className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          {/* Email Field */}
          <FormField id="email" label="البريد الإلكتروني" required error={errors.email?.message}>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                dir="ltr"
                className="pl-9 text-left font-mono"
                error={!!errors.email}
                disabled={isLoading}
                {...register("email")}
              />
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </FormField>

          {/* Password Field */}
          <FormField id="password" label="كلمة المرور" required error={errors.password?.message}>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                className="pl-9 text-left font-mono"
                error={!!errors.password}
                disabled={isLoading}
                {...register("password")}
              />
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </FormField>

          {/* Submit Button */}
          <Button type="submit" className="w-full mt-2 font-bold" size="lg" isLoading={isLoading}>
            تسجيل الدخول
          </Button>
        </form>

        {/* Institutional note (No Sign up notice) */}
        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted leading-relaxed">
            منصة مغلقة — إنشاء الحسابات يتم حصريًا من خلال إدارة المنصة
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background" dir="rtl">
      <Suspense
        fallback={
          <div className="flex h-64 w-full max-w-md items-center justify-center rounded-xl border border-border bg-surface">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
