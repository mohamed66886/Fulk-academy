import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { GroupForm } from "../../group-form";

export const dynamic = "force-dynamic";

interface EditGroupPageProps {
  params: {
    id: string;
  };
}

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  const result = await getGroupById(params.id);

  if (!result.success || !result.groupData) {
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
          price: group.price,
          hasCenter: group.hasCenter,
          centerSessionPrice: group.centerSessionPrice,
          status: group.status,
          schedule:
            group.schedule && group.schedule.length > 0
              ? group.schedule
              : [{ day: "saturday", startTime: "16:00", endTime: "18:00" }],
        }}
      />
    </div>
  );
}
