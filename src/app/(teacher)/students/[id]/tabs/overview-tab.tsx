"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Student } from "@/types";
import { User, Layers, Users, DollarSign, ShieldAlert, Edit2, ExternalLink } from "lucide-react";

interface OverviewTabProps {
  student: Student & { className: string; groupName: string };
}

export function OverviewTab({ student }: OverviewTabProps) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Block Alert Banner if blocked */}
      {student.status === "blocked" && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-text">
          <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-danger">حساب الطالب محظور حالياً</h4>
            <p className="text-xs text-muted leading-relaxed">
              السبب: {student.blockReason || "تم الحظر من قبل الإدارة"}
            </p>
          </div>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Academic Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">البيانات الشخصية والأكاديمية</CardTitle>
              </div>
              <Link href={`/students/${student.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>تعديل</span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">الاسم بالكامل:</span>
              <span className="font-bold text-text">{student.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">رقم هاتف الطالب:</span>
              <span className="font-mono font-semibold text-text" dir="ltr">
                {student.phone}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">الصف الدراسي:</span>
              <span className="font-semibold text-text flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {student.className}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">المجموعة الدراسية:</span>
              <Link
                href={`/groups/${student.groupId}`}
                className="font-bold text-primary hover:underline flex items-center gap-1"
              >
                {student.groupName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted">تاريخ الانضمام:</span>
              <span className="text-text font-medium">
                {student.createdAt ? new Date(student.createdAt).toLocaleDateString("ar-EG") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Parent & Contact Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">بيانات ولي الأمر وبوابة المتابعة</CardTitle>
            </div>
            <CardDescription>بيانات التواصل مع ولي الأمر ورمز الدخول الخاص به.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">اسم ولي الأمر:</span>
              <span className="font-bold text-text">{student.parentName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">هاتف ولي الأمر:</span>
              <span className="font-mono font-semibold text-text" dir="ltr">
                {student.parentPhone}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="text-muted">رمز بوابة ولي الأمر (Parent Token):</span>
              <span className="font-mono text-xs text-muted bg-surface px-2 py-1 rounded border border-border">
                {student.parentQrToken ? `${student.parentQrToken.slice(0, 14)}...` : "—"}
              </span>
            </div>

            <div className="pt-2">
              <Link href={`/p/${student.parentQrToken}`} target="_blank">
                <Button variant="secondary" size="sm" className="w-full gap-2 font-bold text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>معاينة بوابة ولي الأمر</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">الموقف المالي والاشتراك الشهري</CardTitle>
          </div>
          <CardDescription>
            تفاصيل السعر الأساسي للمجموعة والخصومات الممنوحة للطالب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border border-border bg-surface/40">
              <span className="text-xs text-muted font-medium">سعر المجموعة الأساسي</span>
              <h4 className="text-xl font-bold text-text mt-1">{student.groupPrice} ج.م</h4>
              <span className="text-[11px] text-muted">السعر الافتراضي للمجموعة</span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface/40">
              <span className="text-xs text-muted font-medium">الخصم الفردي</span>
              <h4 className="text-xl font-bold text-danger mt-1">
                {student.discount > 0 ? `-${student.discount} ج.م` : "0 ج.م"}
              </h4>
              <span className="text-[11px] text-muted">
                {student.discount > 0 ? "خصم خاص معتمد للطالب" : "لا يوجد خصم"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-primary/30 bg-primary/10">
              <span className="text-xs text-primary font-bold">السعر النهائي المستحق</span>
              <h4 className="text-2xl font-black text-primary mt-1">{student.finalPrice} ج.م</h4>
              <span className="text-[11px] text-muted">المطلوب سداده شهرياً</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
