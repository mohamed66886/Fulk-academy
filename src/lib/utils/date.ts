import type { DayOfWeek } from "@/types";

export interface CairoDateInfo {
  dayOfWeek: DayOfWeek;
  formattedDate: string; // "YYYY-MM-DD"
  arabicDayName: string; // "الإثنين"
  arabicFormattedDate: string; // "١٤ سبتمبر ٢٠٢٦"
  currentTime: string; // "HH:mm" in 24-hour format
}

// Strictly calculate current date, weekday, and time in Egypt timezone (Africa/Cairo)
export function getCairoCurrentDate(): CairoDateInfo {
  const now = new Date();

  // 1. Weekday in English (matches DayOfWeek union type)
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  });
  const dayOfWeek = weekdayFormatter.format(now).toLowerCase() as DayOfWeek;

  // 2. ISO Date (YYYY-MM-DD) in Egypt timezone
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formattedDate = dateFormatter.format(now);

  // 3. Full Arabic Date
  const arabicFullFormatter = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const arabicFormattedDate = arabicFullFormatter.format(now);

  // 4. Arabic Day Name only
  const arabicDayFormatter = new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  });
  const arabicDayName = arabicDayFormatter.format(now);

  // 5. 24-Hour Time (HH:mm) in Cairo
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTime = timeFormatter.format(now);

  return {
    dayOfWeek,
    formattedDate,
    arabicDayName,
    arabicFormattedDate,
    currentTime,
  };
}

// Convert 24-hour time string (e.g. "14:30") to readable Arabic 12-hour format (e.g. "02:30 م")
export function formatArabicTime(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;

  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parts[1];

  const period = hours >= 12 ? "م" : "ص";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

// Format an ISO Date string directly to readable Arabic Cairo time
export function formatISOTimeToCairo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatArabicTime(timeFormatter.format(d));
  } catch {
    return "—";
  }
}
