import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupById, getClassesForSelect } from "@/lib/actions/groups";
import { EditGroupForm } from "./edit-form";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit2 } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditGroupPage({ params }: PageProps) {
  const [groupRes, classes] = await Promise.all([getGroupById(params.id), getClassesForSelect()]);

  if (!groupRes.success || !groupRes.groupData) {
    notFound();
  }

  const { group } = groupRes.groupData;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header & Back Link */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href={`/groups/${group.id}`}>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text">تعديل المجموعة: {group.name}</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            قم بتحديث مواعيد الحصص أو السعر الافتراضي أو إعدادات السنتر.
          </p>
        </div>
      </div>

      <EditGroupForm group={group} classes={classes} />
    </div>
  );
}
