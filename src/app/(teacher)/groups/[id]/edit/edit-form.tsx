"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateGroup } from "@/lib/actions/groups";
import type { GroupFormData } from "@/lib/validators/group";
import type { Group } from "@/types";
import { GroupForm } from "../../group-form";
import { toast } from "@/components/ui/toast";

interface EditGroupFormProps {
  group: Group;
  classes: Array<{ id: string; name: string }>;
}

export function EditGroupForm({ group, classes }: EditGroupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const initialData: GroupFormData = {
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
  };

  const handleSubmit = async (data: GroupFormData) => {
    setIsSubmitting(true);
    try {
      const res = await updateGroup(group.id, data);
      if (!res.success) {
        toast.error(res.error || "تعذر تعديل المجموعة الدراسية");
        return;
      }

      toast.success("تم تعديل بيانات المجموعة بنجاح");
      router.push(`/groups/${group.id}`);
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GroupForm
      classes={classes}
      initialData={initialData}
      isEdit={true}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
