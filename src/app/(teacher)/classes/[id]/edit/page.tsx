import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassById } from "@/lib/actions/classes";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EditClassForm } from "./edit-form";

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
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/classes/${classData.id}`}>
            <Button variant="ghost" size="sm" className="gap-1 p-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">تعديل الصف الدراسي</h1>
            <p className="text-xs text-muted mt-1 font-mono">
              {classData.name} ({classData.id})
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <EditClassForm
        classId={classData.id}
        initialData={{
          name: classData.name,
          description: classData.description,
          status: classData.status,
        }}
      />
    </div>
  );
}
