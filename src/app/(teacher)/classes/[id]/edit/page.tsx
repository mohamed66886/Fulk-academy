import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassById } from "@/lib/actions/classes";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ClassForm } from "../../class-form";

export const dynamic = "force-dynamic";

interface EditClassPageProps {
  params: {
    id: string;
  };
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const result = await getClassById(params.id);

  if (!result.success || !result.classData) {
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
