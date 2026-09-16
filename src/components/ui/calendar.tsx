"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 font-cairo bg-white sm:bg-transparent rounded-3xl sm:rounded-none w-full max-w-[360px] mx-auto",
        className
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-2 relative items-center mb-6",
        caption_label: "text-lg sm:text-base font-bold text-gray-900 tracking-tight",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-9 w-9 bg-gray-50 p-0 text-gray-600 hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-300 flex items-center justify-center border border-gray-100 hover:border-primary/20 hover:shadow-sm"
        ),
        // تم عكس الاتجاهات لتناسب اللغة العربية
        nav_button_previous: "absolute right-0",
        nav_button_next: "absolute left-0",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full justify-between gap-1 sm:gap-2 mb-3",
        head_cell: "text-gray-500 rounded-md w-10 sm:w-9 font-semibold text-[0.85rem]",
        row: "flex w-full mt-2 justify-between gap-1 sm:gap-2",
        cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-10 w-10 sm:h-9 sm:w-9 p-0 font-semibold hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-200 aria-selected:opacity-100 text-gray-700"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md shadow-primary/30 rounded-xl scale-110 sm:scale-105 z-10",
        day_today: "bg-gray-100 text-primary border border-gray-200",
        day_outside: "text-gray-300 opacity-50 font-normal",
        day_disabled: "text-gray-200 opacity-50 font-normal",
        day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: (props) => <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" {...props} />,
        IconRight: (props) => <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" {...props} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
