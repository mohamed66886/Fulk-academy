"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type="date"
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 pl-9 text-sm text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:ring-danger focus-visible:border-danger",
            className
          )}
          {...props}
        />
        <CalendarIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
