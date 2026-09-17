"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useStudentDetail } from "@/hooks/use-cached-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { StudentForm } from "../../student-form";

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { data: studentRes, isLoading } = useStudentDetail(studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="font-semibold">جاري تحميل بيانات الطالب...</span>
      </div>
    );
  }

  if (!studentRes?.success || !studentRes.student) {
    notFound();
  }

  const { student } = studentRes;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Back navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href={`/students/${student.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold text-muted hover:text-text"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة لبروفايل الطالب ({student.name})</span>
          </Button>
        </Link>
      </div>

      {/* Edit Form */}
      <StudentForm
        isEdit={true}
        initialData={{
          id: student.id,
          name: student.name,
          phone: student.phone,
          classId: student.classId,
          groupId: student.groupId,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: student.photoUrl || "",
          discount: student.discount || 0,
          groupPrice: student.groupPrice,
          finalPrice: student.finalPrice,
          status: student.status,
          blockReason: student.blockReason || "",
        }}
      />
    </div>
  );
}
