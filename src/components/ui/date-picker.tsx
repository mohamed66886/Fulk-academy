"use client";

import * as React from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// استيراد المكونات المخصصة للنافذة المنبثقة والتقويم
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";

export interface DatePickerProps {
  date?: Date;
  setDate?: (date: Date | undefined) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  setDate,
  placeholder = "اختر التاريخ...",
  error,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative w-full font-cairo", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "group flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 sm:py-3 text-base sm:text-sm text-gray-800 transition-all duration-300 focus:outline-none border border-gray-200 shadow-sm hover:shadow-md hover:border-primary/40 focus:ring-4 focus:ring-primary/10",
              !date && "text-gray-500",
              error && "bg-red-50/50 text-red-600 border-red-300 focus:ring-red-100 hover:border-red-400",
              isOpen && "border-primary ring-4 ring-primary/10 shadow-md",
              className
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl transition-colors duration-300",
                date ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500 group-hover:bg-primary/5 group-hover:text-primary/70",
                error && "bg-red-100 text-red-500"
              )}>
                <CalendarIcon className="h-5 w-5 sm:h-4 sm:w-4" />
              </div>
              <span className="font-medium mt-1">
                {date ? format(date, "PPP", { locale: ar }) : placeholder}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 sm:h-4 sm:w-4 text-gray-400 transition-transform duration-300",
              isOpen && "rotate-180 text-primary",
              error && "text-red-400"
            )} />
          </button>
        </PopoverTrigger>
        
        <PopoverContent
          align="center"
          sideOffset={8}
          className="w-[calc(100vw-2rem)] sm:w-auto p-0 font-cairo border border-gray-100 shadow-2xl shadow-primary/5 bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="bg-gradient-to-b from-white to-gray-50/50">
             <Calendar
               mode="single"
               selected={date}
               onSelect={(newDate) => {
                 setDate?.(newDate);
                 setIsOpen(false);
               }}
               initialFocus
               locale={ar}
               className="border-0 sm:p-4"
             />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

DatePicker.displayName = "DatePicker";