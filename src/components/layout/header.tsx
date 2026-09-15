"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Menu, PanelRightClose, PanelRightOpen, LogOut, User } from "lucide-react";

export interface HeaderProps {
  userName?: string;
  userRole?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenMobile?: () => void;
  onLogout?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function Header({
  userName = "أ. محمد رشاد",
  userRole = "مدرس",
  collapsed = false,
  onToggleCollapse,
  onOpenMobile,
  onLogout,
  className,
  children,
}: HeaderProps) {
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        const { auth } = await import("@/lib/firebase/client");
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      } catch {
        // proceed to redirect
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-20 w-full items-center justify-between bg-white px-4 border-b border-gray-100 sm:px-6 transition-all",
        className
      )}
    >
      {/* القسم الأيمن: أزرار التحكم والقائمة */}
      <div className="flex items-center gap-3">
        {/* زر القائمة للموبايل */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden transition-colors"
          aria-label="فتح القائمة الجانبية"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* زر طي القائمة للديسك توب */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-10 w-10 items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-[#3b82f6] md:flex transition-colors"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
          title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? (
            <PanelRightOpen className="h-5 w-5" />
          ) : (
            <PanelRightClose className="h-5 w-5" />
          )}
        </button>

        {/* مساحة إضافية لأي محتوى */}
        <div className="hidden sm:block">{children}</div>
      </div>

      {/* القسم الأيسر: بيانات المستخدم وزر تسجيل الخروج */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* بيانات المستخدم (تصميم كبسولة) */}
        <div className="flex items-center gap-3 p-1.5 pr-2 pl-4 rounded-full bg-gray-50 border border-gray-100">
          {/* أيقونة المستخدم (بدون شادو) */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-white">
            <User className="h-4 w-4" />
          </div>
          {/* الاسم والرتبة بجوار بعضهما */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[13px] font-bold text-gray-800">{userName}</span>
            <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200 bg-white">
              {userRole}
            </Badge>
          </div>
        </div>

        {/* خط فاصل عمودي للديسك توب */}
        <div className="hidden sm:block h-8 w-[1px] bg-gray-200"></div>

        {/* زر تسجيل الخروج */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 w-10 sm:w-auto sm:px-4 items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-100 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
          title="تسجيل الخروج"
        >
          <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline text-[13px] font-bold">تسجيل الخروج</span>
        </button>
      </div>
    </header>
  );
}
