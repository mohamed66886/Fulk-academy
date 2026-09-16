"use client";

import React, { useState, useRef, useEffect, useId, forwardRef } from "react";
import { X } from "lucide-react";
import { CalendarIcon } from "./CalendarIcon";

export type DatePickerSize = "sm" | "md" | "lg";

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
  errors?: Record<string, string | undefined>;
  required?: boolean;
  isRequired?: boolean;
  disabled?: boolean;
  isDisabled?: boolean;
  sizeVariant?: DatePickerSize;
  variant?: string;
  fullWidth?: boolean;
  showTodayButton?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
  labelClassName?: string;
  minDate?: string;
  maxDate?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  date?: Date;
  setDate?: (date: Date | undefined) => void;
}

const sizeStyles: Record<DatePickerSize, { input: string; icon: string }> = {
  sm: {
    input: "px-2.5 py-1 text-xs rounded-md h-8",
    icon: "w-4 h-4",
  },
  md: {
    input: "px-3 py-1.5 text-sm rounded-md h-9.5",
    icon: "w-4 h-4",
  },
  lg: {
    input: "px-4 py-2.5 text-base rounded-lg h-11",
    icon: "w-5 h-5",
  },
};

const parseDateSafe = (val: unknown): Date | null => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  const parts = str.split(/[-/]/).map(Number);
  if (
    parts.length === 3 &&
    parts[0] !== undefined &&
    parts[1] !== undefined &&
    parts[2] !== undefined
  ) {
    // Check if ISO (YYYY-MM-DD)
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    // Assume DD/MM/YYYY or MM/DD/YYYY -> try native
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Standard Weekdays (Su Mo Tu We Th Fr Sa)
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      sizeVariant = "md",
      fullWidth = false,
      required = false,
      isRequired,
      clearable = true,
      showTodayButton = false,
      onClear,
      containerClassName = "",
      labelClassName = "",
      className = "",
      label,
      helperText,
      error,
      errors: _errors,
      value,
      disabled = false,
      isDisabled,
      id: customId,
      onChange,
      variant: _variant,
      minDate: _minDate,
      maxDate: _maxDate,
      leftIcon,
      rightIcon: _rightIcon,
      icon,
      date,
      setDate: _setDate,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const dateId = customId || generatedId;
    const containerRef = useRef<HTMLDivElement>(null);

    const effectiveDisabled = isDisabled !== undefined ? isDisabled : disabled;
    const effectiveRequired = isRequired !== undefined ? isRequired : required;
    const effectiveIcon = leftIcon || icon;
    const effectiveVal =
      value !== undefined && value !== null
        ? value
        : date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
          : undefined;

    const [isOpen, setIsOpen] = useState(false);

    // Initial Date Parsing (timezone safe)
    const parsedDate = React.useMemo(() => {
      const d = parseDateSafe(effectiveVal);
      return d || new Date();
    }, [effectiveVal]);

    const [currentYear, setCurrentYear] = useState<number>(parsedDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState<number>(parsedDate.getMonth());

    // Synchronize current month/year when value changes
    useEffect(() => {
      if (effectiveVal) {
        const d = parseDateSafe(effectiveVal);
        if (d) {
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        }
      }
    }, [effectiveVal]);

    // Close on Outside Click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    // Formatted Value for Display
    const displayValue = React.useMemo(() => {
      if (!value) return "";
      const d = parseDateSafe(value);
      if (!d) return String(value);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd}`;
    }, [value]);

    const handleSelectDate = (year: number, month: number, day: number) => {
      const formattedMonth = String(month + 1).padStart(2, "0");
      const formattedDay = String(day).padStart(2, "0");
      const formattedString = `${year}-${formattedMonth}-${formattedDay}`;

      if (onChange) {
        const syntheticEvent = {
          target: { value: formattedString, name: props.name || "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      setIsOpen(false);
    };

    const handleSetToday = () => {
      const today = new Date();
      setCurrentYear(today.getFullYear());
      setCurrentMonth(today.getMonth());
      handleSelectDate(today.getFullYear(), today.getMonth(), today.getDate());
    };

    const handleClearDate = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        const syntheticEvent = {
          target: { value: "", name: props.name || "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      setIsOpen(false);
    };

    const handlePrevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((prev) => prev - 1);
      } else {
        setCurrentMonth((prev) => prev - 1);
      }
    };

    const handleNextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((prev) => prev + 1);
      } else {
        setCurrentMonth((prev) => prev + 1);
      }
    };

    // Calculate Grid Cells for currentYear & currentMonth (Su Mo Tu We Th Fr Sa)
    const calendarGrid = React.useMemo(() => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

      const grid: Array<{ day: number | null; isCurrentMonth: boolean }> = [];

      // Padding empty cells before 1st of month (Sun=0, Mon=1, ..., Sat=6)
      for (let i = 0; i < firstDayOfWeek; i++) {
        grid.push({ day: null, isCurrentMonth: false });
      }

      // Days of month
      for (let d = 1; d <= daysInMonth; d++) {
        grid.push({ day: d, isCurrentMonth: true });
      }

      // Fill remaining cells to complete 7-column row
      while (grid.length % 7 !== 0) {
        grid.push({ day: null, isCurrentMonth: false });
      }

      return grid;
    }, [currentYear, currentMonth]);

    const selectedDayNum = React.useMemo(() => {
      if (!value) return null;
      const d = new Date(String(value));
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        return d.getDate();
      }
      return null;
    }, [value, currentYear, currentMonth]);

    // Years dropdown options
    const yearsList = React.useMemo(() => {
      const yrs = [];
      for (let y = 1970; y <= 2050; y++) {
        yrs.push(y);
      }
      return yrs;
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative flex flex-col gap-1 text-right ${
          fullWidth ? "w-full" : ""
        } ${containerClassName}`}
      >
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={dateId}
              className={`text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 ${labelClassName}`}
            >
              {label}
              {effectiveRequired && <span className="text-red-500 font-bold">*</span>}
            </label>
          )}

          {showTodayButton && !effectiveDisabled && (
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[11px] font-medium text-[#4B83F3] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              تاريخ اليوم
            </button>
          )}
        </div>

        <div className="relative flex items-center w-full">
          <input
            ref={ref}
            id={dateId}
            type="text"
            readOnly
            value={displayValue}
            disabled={effectiveDisabled}
            placeholder="YYYY/MM/DD"
            onClick={() => !effectiveDisabled && setIsOpen(!isOpen)}
            className={`w-full text-right transition-colors duration-150 outline-none pr-3 pl-10 cursor-pointer font-normal select-none placeholder:text-gray-400 dark:placeholder:text-slate-500
              ${sizeStyles[sizeVariant].input}
              ${
                effectiveDisabled
                  ? "bg-[#f2f2f2] dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-400 cursor-not-allowed font-medium"
                  : error
                    ? "bg-white dark:bg-slate-900 border border-red-500 text-gray-800 dark:text-slate-100 focus:border-red-500 focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60"
                    : isOpen
                      ? "bg-[#fbfbfb] dark:bg-slate-900 border border-[#7c4a27] dark:border-[#c97a40] text-gray-800 dark:text-slate-100"
                      : "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:border-gray-400 dark:hover:border-slate-600 focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60 focus:border-[#7c4a27] dark:focus:border-[#c97a40]"
              }
              ${className}`}
            {...props}
          />

          {/* Left Calendar Trigger Icon */}
          <button
            type="button"
            disabled={effectiveDisabled}
            onClick={() => !effectiveDisabled && setIsOpen(!isOpen)}
            className="absolute left-2.5 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-[#7c4a27] dark:text-gray-400 dark:hover:text-[#e09153] bg-transparent transition-colors focus:outline-none cursor-pointer"
          >
            {effectiveIcon ?? <CalendarIcon className={`${sizeStyles[sizeVariant].icon}`} />}
          </button>

          {clearable && value && !effectiveDisabled && (
            <button
              type="button"
              onClick={handleClearDate}
              className="absolute left-9 inset-y-0 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 cursor-pointer"
              tabIndex={-1}
            >
              <X className={sizeStyles[sizeVariant].icon} />
            </button>
          )}
        </div>

        {/* CUSTOM POPUP CALENDAR MODAL MATCHING SCREENSHOT */}
        {isOpen && !effectiveDisabled && (
          <div
            dir="ltr"
            className="absolute top-full left-0 z-[99999] mt-1 w-64 bg-white dark:bg-slate-900 border border-gray-500 dark:border-slate-700 shadow-2xl rounded-xs overflow-hidden text-center select-none animate-fadeIn"
          >
            {/* 1. Top Bar (Black Background): Prev> | Today | <Next */}
            <div className="bg-black dark:bg-slate-950 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="hover:text-blue-300 transition-colors cursor-pointer"
              >
                &lt;Prev
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="hover:text-blue-300 transition-colors cursor-pointer font-bold"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="hover:text-blue-300 transition-colors cursor-pointer"
              >
                Next&gt;
              </button>
            </div>

            {/* 2. Sub-Header Bar (Dark Gray Background): Month Name & Year Selector */}
            <div className="bg-[#4a4a4a] dark:bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold border-t border-gray-600 dark:border-slate-700">
              <span className="text-sm font-semibold">{MONTH_NAMES_EN[currentMonth]}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px]">˅</span>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs border-none"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y} className="bg-gray-800 text-white">
                      {y}
                    </option>
                  ))}
                </select>
                <span className="text-[10px]">˅</span>
              </div>
            </div>

            {/* 3. Days Header Row (Medium Gray): Su Mo Tu We Th Fr Sa */}
            <div className="grid grid-cols-7 bg-[#666666] dark:bg-slate-700 text-white text-xs font-bold border-t border-b border-gray-500 dark:border-slate-600 py-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* 4. Days Grid */}
            <div className="grid grid-cols-7 border-collapse bg-gray-200 dark:bg-slate-900">
              {calendarGrid.map((cell, index) => {
                if (!cell.isCurrentMonth || cell.day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="bg-gray-200 dark:bg-slate-900/60 h-7 border border-gray-300/80 dark:border-slate-800"
                    />
                  );
                }

                const isSelected = cell.day === selectedDayNum;

                return (
                  <button
                    key={`day-${cell.day}`}
                    type="button"
                    onClick={() => handleSelectDate(currentYear, currentMonth, cell.day!)}
                    className={`h-7 border border-gray-300 dark:border-slate-700 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#ef4444] text-white font-bold shadow-xs"
                        : "bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-100"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* 5. Bottom Action Footer Bar (Teal Blue Background): Clear | Close */}
            <div className="bg-[#147a9e] dark:bg-[#0e5c77] text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold border-t border-teal-700 dark:border-teal-900">
              <button
                type="button"
                onClick={handleClearDate}
                className="hover:underline hover:text-gray-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:underline hover:text-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">{error}</p>
        )}

        {!error && helperText && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
export default DatePicker;
