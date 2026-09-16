"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentForm } from "../student-form";

function CreateStudentContent() {
  const searchParams = useSearchParams();
  const defaultClassId = searchParams.get("classId") || undefined;
  const defaultGroupId = searchParams.get("groupId") || undefined;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Back button and navigation breadcrumb */}
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/students">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold text-muted hover:text-text"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى سجل الطلاب</span>
          </Button>
        </Link>
      </div>

      {/* Main Form */}
      <StudentForm isEdit={false} defaultClassId={defaultClassId} defaultGroupId={defaultGroupId} />
    </div>
  );
}

export default function CreateStudentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 text-center text-muted font-medium">
          جاري التحميل...
        </div>
      }
    >
      <CreateStudentContent />
    </React.Suspense>
  );
}
