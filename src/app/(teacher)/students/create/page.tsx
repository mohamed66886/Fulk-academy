"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createStudent } from "@/lib/actions/students";
import { getClassesForSelect, getGroups } from "@/lib/actions/groups";
import type { StudentFormData } from "@/lib/validators/student";
import { StudentForm } from "../student-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ArrowRight, UserPlus, AlertCircle, PlusCircle } from "lucide-react";

export default function CreateStudentPage() {
  const router = useRouter();
  const [classes, setClasses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = React.useState<
    Array<{ id: string; name: string; classId: string; price: number }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [cls, grpRes] = await Promise.all([getClassesForSelect(), getGroups()]);
        setClasses(cls);
        if (grpRes.success && grpRes.groups) {
          setGroups(
            grpRes.groups.map((g) => ({
              id: g.id,
              name: g.name,
              classId: g.classId,
              price: g.price,
            }))
          );
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createStudent(data);
      if (!res.success) {
        toast.error(res.error || "تعذر إضافة الطالب");
        return;
      }

      toast.success("تم تسجيل الطالب وتوليد أكواد الـ QR بنجاح");
      router.push("/students");
      router.refresh();
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء حفظ بيانات الطالب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header & Back Navigation */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/students">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text">تسجيل طالب جديد</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            أدخل بيانات الطالب، تسكينه في المجموعة، وإصدار أكواد الدخول وبوابة ولي الأمر.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted text-sm animate-pulse">
          جاري تجهيز الصفوف والمجموعات الدراسية...
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-text">لا توجد صفوف دراسية بعد</h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              يجب أولاً إضافة صف دراسي ومجموعة دراسية لتتمكن من تسكين الطلاب فيها.
            </p>
          </div>
          <Link href="/classes/create">
            <Button size="sm" className="gap-2 font-bold">
              <PlusCircle className="h-4 w-4" />
              <span>إضافة صف دراسي الآن</span>
            </Button>
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-text">لا توجد مجموعات دراسية</h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              تحتاج إلى إنشاء مجموعة دراسية واحدة على الأقل قبل تسجيل الطلاب.
            </p>
          </div>
          <Link href="/groups/create">
            <Button size="sm" className="gap-2 font-bold">
              <PlusCircle className="h-4 w-4" />
              <span>إضافة مجموعة الآن</span>
            </Button>
          </Link>
        </div>
      ) : (
        <StudentForm
          classes={classes}
          groups={groups}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
