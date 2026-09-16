import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { StudentForm } from "../../student-form";

export const dynamic = "force-dynamic";

interface EditStudentPageProps {
  params: {
    id: string;
  };
}

export default async function EditStudentPage({ params }: EditStudentPageProps) {
  const studentRes = await getStudentById(params.id);

  if (!studentRes.success || !studentRes.student) {
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
