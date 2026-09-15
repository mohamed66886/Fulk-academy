"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGroup, getClassesForSelect } from "@/lib/actions/groups";
import type { GroupFormData } from "@/lib/validators/group";
import { GroupForm } from "../group-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ArrowRight, Users, PlusCircle, AlertCircle } from "lucide-react";

export default function CreateGroupPage() {
  const router = useRouter();
  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    async function loadClasses() {
      try {
        const list = await getClassesForSelect();
        setClasses(list);
      } finally {
        setIsLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  const handleSubmit = async (data: GroupFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createGroup(data);
      if (!res.success) {
        toast.error(res.error || "تعذر إنشاء المجموعة الدراسية");
        return;
      }

      toast.success("تم إنشاء المجموعة الدراسية بنجاح");
      router.push("/groups");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء حفظ المجموعة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header & Navigation */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/groups">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text">إضافة مجموعة دراسية جديدة</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            حدد الصف الدراسي، المواعيد الأسبوعية، وسعر الاشتراك الشهري.
          </p>
        </div>
      </div>

      {isLoadingClasses ? (
        <div className="flex items-center justify-center p-12 text-muted text-sm animate-pulse">
          جاري تحميل بيانات الصفوف الدراسية...
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-text">لا توجد صفوف دراسية بعد</h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              تحتاج إلى إنشاء صف دراسي أولاً (مثل: الصف الأول الثانوي) حتى تتمكن من إلحاق المجموعات
              به وتنظيم الطلاب.
            </p>
          </div>
          <Link href="/classes/create">
            <Button size="sm" className="gap-2 font-bold">
              <PlusCircle className="h-4 w-4" />
              <span>إضافة صف دراسي الآن</span>
            </Button>
          </Link>
        </div>
      ) : (
        <GroupForm classes={classes} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}
