"use client";

import React from "react";
import { Calendar } from "lucide-react";

export type CalendarIconProps = React.ComponentPropsWithoutRef<typeof Calendar>;

export const CalendarIcon: React.FC<CalendarIconProps> = ({ className = "w-4 h-4", ...props }) => {
  return <Calendar className={className} {...props} />;
};

export default CalendarIcon;
