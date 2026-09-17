"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useGroupDetail } from "@/hooks/use-cached-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { GroupForm } from "../../group-form";

export default function EditGroupPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const { data: result, isLoading } = useGroupDetail(groupId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="font-semibold">جاري تحميل بيانات المجموعة...</span>
      </div>
    );
  }

  if (!result?.success || !result.groupData) {
    notFound();
  }

  const { group } = result.groupData;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Back navigation */}
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href={`/groups/${group.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold text-muted hover:text-text"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة لتفاصيل المجموعة ({group.name})</span>
          </Button>
        </Link>
      </div>

      {/* Edit Form */}
      <GroupForm
        isEdit={true}
        initialData={{
          id: group.id,
          name: group.name,
          classId: group.classId,
          schedule: group.schedule,
          price: group.price,
          hasCenter: group.hasCenter,
          centerSessionPrice: group.centerSessionPrice,
          status: group.status,
        }}
      />
    </div>
  );
}
