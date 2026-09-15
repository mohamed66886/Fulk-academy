import * as React from "react";
import { Compass } from "lucide-react";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-between" dir="rtl">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sm font-black leading-tight tracking-tight">فُلك أكاديمي</span>
            <span className="text-[11px] font-medium text-muted">بوابة متابعة ولي الأمر</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted border border-border">
            اطلاع فقط
          </span>
        </div>
      </header>

      {/* Main Container - Mobile-first container */}
      <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-6">{children}</main>

      {/* Minimal Footer */}
      <footer className="py-5 text-center text-xs text-muted border-t border-border bg-surface/30">
        منصة فُلك أكاديمي &copy; {new Date().getFullYear()} — نظام متابعة الطلاب وأولياء الأمور
      </footer>
    </div>
  );
}
