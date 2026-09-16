"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateStudentClient } from "@/lib/client-actions/students";
import type { StudentFormData } from "@/lib/validators/student";
import type { Student } from "@/types";
import { StudentForm } from "../../student-form";
import { toast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

interface EditStudentFormProps {
  student: Student;
  classes: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; classId: string; price: number }>;
}

export function EditStudentForm({ student, classes, groups }: EditStudentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const initialData: Partial<StudentFormData> = {
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
  };

  const handleSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateStudentClient(student.id, data);
      if (!res.success) {
        toast.error(res.error || "تعذر تعديل بيانات الطالب");
        return;
      }

      toast.success("تم تحديث بيانات الطالب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/students/${student.id}`);
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudentForm
      classes={classes}
      groups={groups}
      initialData={initialData}
      isEdit={true}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
