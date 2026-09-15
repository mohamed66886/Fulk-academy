export type GroupStatus = "active" | "archived";

export type DayOfWeek =
  "saturday" | "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface GroupSchedule {
  day: DayOfWeek;
  startTime: string; // e.g. "14:00"
  endTime: string; // e.g. "16:00"
}

export interface Group {
  id: string;
  teacherId?: string;
  name: string;
  classId: string;
  price: number;
  hasCenter: boolean;
  centerSessionPrice?: number;
  status: GroupStatus;
  schedule: GroupSchedule[];
  createdAt: string;
  updatedAt: string;
}
