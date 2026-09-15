"use client";

import * as React from "react";
import { StudentCardView } from "@/components/shared/student-card-view";
import type { Student } from "@/types";

interface CardTabProps {
  student: Student & {
    className: string;
    groupName: string;
    teacherName?: string;
  };
}

export function CardTab({ student }: CardTabProps) {
  return <StudentCardView student={student} standalone={false} />;
}
