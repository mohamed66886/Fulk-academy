"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useClassDetail } from "@/hooks/use-cached-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { ClassForm } from "../../class-form";

export default function EditClassPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const { data: result, isLoading } = useClassDetail(classId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="font-semibold">جاري تحميل بيانات الصف...</span>
      </div>
    );
  }

  if (!result?.success || !result.classData) {
    notFound();
  }

  const { classData } = result;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Back navigation */}
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link href={`/classes/${classData.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold text-muted hover:text-text"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة لتفاصيل الصف ({classData.name})</span>
          </Button>
        </Link>
      </div>

      {/* Edit Form */}
      <ClassForm
        isEdit={true}
        initialData={{
          id: classData.id,
          name: classData.name,
          description: classData.description,
          status: classData.status,
        }}
      />
    </div>
  );
}
