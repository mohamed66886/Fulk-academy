import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/actions/students";
import { getClassesForSelect, getGroups } from "@/lib/actions/groups";
import { EditStudentForm } from "./edit-form";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserCog } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditStudentPage({ params }: PageProps) {
  const [studentRes, classes, groupsRes] = await Promise.all([
    getStudentById(params.id),
    getClassesForSelect(),
    getGroups(),
  ]);

  if (!studentRes.success || !studentRes.student) {
    notFound();
  }

  const { student } = studentRes;
  const groups =
    groupsRes.success && groupsRes.groups
      ? groupsRes.groups.map((g) => ({
          id: g.id,
          name: g.name,
          classId: g.classId,
          price: g.price,
        }))
      : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header & Back Navigation */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href={`/students/${student.id}`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text">تعديل بيانات الطالب: {student.name}</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            تحديث بيانات الاتصال، التسكين في مجموعة أخرى، أو تعديل الخصم الفردي.
          </p>
        </div>
      </div>

      <EditStudentForm student={student} classes={classes} groups={groups} />
    </div>
  );
}
