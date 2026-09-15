import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { StudentCardView } from "@/components/shared/student-card-view";
import { Button } from "@/components/ui/button";
import { ArrowRight, IdCard } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentCardStandalonePage({ params }: PageProps) {
  const res = await getStudentById(params.id);

  if (!res.success || !res.student) {
    notFound();
  }

  const { student } = res;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header & Back Link */}
      <div className="no-print flex items-center gap-3 border-b border-border pb-4">
        <Link href={`/students/${student.id}`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text">بطاقة الطالب الذكية: {student.name}</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            عرض البطاقة بوجهين (Front / Back)، جاهزة للطباعة القياسية (85.6mm × 54mm) أو التحميل كـ
            PNG.
          </p>
        </div>
      </div>

      <StudentCardView student={student} standalone={true} />
    </div>
  );
}
