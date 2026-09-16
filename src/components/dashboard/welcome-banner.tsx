"use client";

import * as React from "react";
import { useAuthStore } from "@/stores";
import { Clock as ClockIcon } from "lucide-react";

interface WelcomeBannerProps {
  initialTeacherName?: string;
  initialDate?: {
    dayOfWeek: string;
    formattedDate: string;
    arabicDayName: string;
    arabicFormattedDate: string;
  };
}

export function WelcomeBanner({ initialTeacherName = "المدرس", initialDate }: WelcomeBannerProps) {
  const cachedName = useAuthStore((s) => s.name);
  const teacherName = cachedName || initialTeacherName || "المدرس";

  // Clock & Time of Day State
  const [mounted, setMounted] = React.useState(false);
  const [timeState, setTimeState] = React.useState(() => {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      formattedTime: "",
      arabicDate: initialDate?.arabicFormattedDate || "",
      arabicDay: initialDate?.arabicDayName || "",
    };
  });

  React.useEffect(() => {
    setMounted(true);

    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Format time in Arabic 12-hour style
      const formattedTime = new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      // Format full date in Arabic
      const arabicDate = new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now);

      const arabicDay = new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
      }).format(now);

      setTimeState({
        hours,
        minutes,
        seconds,
        formattedTime,
        arabicDate,
        arabicDay,
      });
    };

    updateClock();
    // 1-second tick for precise, lightweight updates
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine Morning vs Evening (Morning: 5:00 AM - 4:59 PM, Evening: 5:00 PM - 4:59 AM)
  const isMorning = timeState.hours >= 5 && timeState.hours < 17;

  // Hand rotations (in degrees)
  const hourDeg = (timeState.hours % 12) * 30 + timeState.minutes * 0.5;
  const minuteDeg = timeState.minutes * 6 + timeState.seconds * 0.1;
  const secondDeg = timeState.seconds * 6;

  // Display texts (No emojis)
  const greetingTitle = isMorning ? "صباح الخير" : "مساء الخير";
  const greetingSubtitle = isMorning
    ? "نتمنى لك يوماً دراسياً ممتعاً ومليئاً بالإنجاز والعطاء مع طلابك"
    : "نتمنى لك أمسية هادئة وسعيدة بعد يوم دراسي مليء بالعطاء والتميز";

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white border border-gray-100 p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
        {/* Right Side (RTL Start): Pure SVG Sun / Moon Icon + Greeting */}
        <div className="flex items-center gap-3.5 sm:gap-4.5">
          {/* SVG Sun or Moon Icon - Clean without background, border, or shadow */}
          <div className="shrink-0 flex items-center justify-center">
            {isMorning ? (
              // Solar Day SVG
              <svg
                viewBox="0 0 64 64"
                className="h-11 w-11 sm:h-13 sm:w-13 select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="32" cy="32" r="14" fill="url(#sun-gradient)" />
                {/* Sun Rays */}
                <g stroke="url(#sun-gradient)" strokeWidth="3" strokeLinecap="round">
                  <line x1="32" y1="6" x2="32" y2="12" />
                  <line x1="32" y1="52" x2="32" y2="58" />
                  <line x1="6" y1="32" x2="12" y2="32" />
                  <line x1="52" y1="32" x2="58" y2="32" />
                  <line x1="13.6" y1="13.6" x2="17.8" y2="17.8" />
                  <line x1="46.2" y1="46.2" x2="50.4" y2="50.4" />
                  <line x1="13.6" y1="50.4" x2="17.8" y2="46.2" />
                  <line x1="46.2" y1="17.8" x2="50.4" y2="13.6" />
                </g>
                <defs>
                  <linearGradient
                    id="sun-gradient"
                    x1="6"
                    y1="6"
                    x2="58"
                    y2="58"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#F59E0B" />
                    <stop offset="1" stopColor="#D97706" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              // Night Moon SVG
              <svg
                viewBox="0 0 64 64"
                className="h-11 w-11 sm:h-13 sm:w-13 select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M38.5 12C38.5 25.5 28.5 36.5 15 36.5C14.3 36.5 13.6 36.45 13 36.4C16.8 45.4 25.7 51.5 36 51.5C49.5 51.5 60.5 40.5 60.5 27C60.5 17.5 55 9.4 46.8 5.6C46.3 7.6 46.0 9.7 46.0 12C46.0 12 38.5 12 38.5 12Z"
                  fill="url(#moon-gradient)"
                />
                {/* Twinkling Stars */}
                <path
                  d="M20 16L21.2 19.5L25 20.5L21.2 21.5L20 25L18.8 21.5L15 20.5L18.8 19.5L20 16Z"
                  fill="#FBBF24"
                />
                <path
                  d="M48 42L48.8 44.2L51 45L48.8 45.8L48 48L47.2 45.8L45 45L47.2 44.2L48 42Z"
                  fill="#FDE68A"
                />
                <defs>
                  <linearGradient
                    id="moon-gradient"
                    x1="13"
                    y1="5.6"
                    x2="60.5"
                    y2="51.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#6366F1" />
                    <stop offset="1" stopColor="#4338CA" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>

          {/* Greeting Typography */}
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
              {greetingTitle}، {teacherName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl leading-relaxed">
              {greetingSubtitle}
            </p>
          </div>
        </div>

        {/* Left Side (RTL End): Analog Clock + Date & Digital Time - Clean without container background, border or shadow */}
        <div className="flex items-center gap-3.5 sm:gap-4.5 pt-3 border-t border-gray-50 sm:border-t-0 sm:pt-0 shrink-0">
          {/* Working Analog Clock */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg width="58" height="58" viewBox="0 0 100 100" className="select-none">
              {/* Dial Face */}
              <circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />

              {/* Hour Marks */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const isQuarter = i % 3 === 0;
                const r1 = 41;
                const r2 = isQuarter ? 33 : 37;
                const x1 = 50 + r1 * Math.sin(angle);
                const y1 = 50 - r1 * Math.cos(angle);
                const x2 = 50 + r2 * Math.sin(angle);
                const y2 = 50 - r2 * Math.cos(angle);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isQuarter ? "#0F172A" : "#94A3B8"}
                    strokeWidth={isQuarter ? "2.2" : "1"}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Hour Hand */}
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="28"
                stroke="#1E293B"
                strokeWidth="3.2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${mounted ? hourDeg : 0}deg)`,
                  transformOrigin: "50px 50px",
                }}
              />

              {/* Minute Hand */}
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="19"
                stroke="#334155"
                strokeWidth="2.2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${mounted ? minuteDeg : 0}deg)`,
                  transformOrigin: "50px 50px",
                }}
              />

              {/* Second Hand */}
              <line
                x1="50"
                y1="57"
                x2="50"
                y2="15"
                stroke="#EF4444"
                strokeWidth="1.2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${mounted ? secondDeg : 0}deg)`,
                  transformOrigin: "50px 50px",
                }}
              />

              {/* Center Pin */}
              <circle cx="50" cy="50" r="2.8" fill="#EF4444" />
              <circle cx="50" cy="50" r="1" fill="#FFFFFF" />
            </svg>
          </div>

          {/* Date & Digital Time Info */}
          <div className="flex flex-col justify-center">
            {/* Today's Day & Date */}
            <div className="flex items-center gap-1.5 text-xs text-gray-800 font-bold">
              <span>{timeState.arabicDay || initialDate?.arabicDayName || "اليوم"}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600 font-medium">
                {timeState.arabicDate || initialDate?.arabicFormattedDate || ""}
              </span>
            </div>

            {/* Live Digital Clock */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <ClockIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-gray-900 font-mono tracking-tight dir-ltr">
                {mounted && timeState.formattedTime ? timeState.formattedTime : "--:--:--"}
              </span>
            </div>

            {/* Egypt Time label (clean without pulsing indicator) */}
            <span className="text-[10px] text-gray-400 font-medium mt-0.5">توقيت مصر مباشر</span>
          </div>
        </div>
      </div>
    </div>
  );
}
