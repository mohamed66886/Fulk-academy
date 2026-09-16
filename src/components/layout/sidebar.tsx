"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  IdCard,
  UserCheck,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";

export interface NavSubItem {
  label: string;
  href: string;
  badge?: string | number;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  subItems?: NavSubItem[];
}

// Default navigation configuration for Teacher role
export const teacherNavItems: NavItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "إدارة الطلاب",
    icon: Users,
    subItems: [
      { label: "الطلاب", href: "/students" },
      { label: "المحظورون", href: "/blocked" },
      { label: "سلة المحذوفات", href: "/trash" },
    ],
  },
  {
    label: "الأكاديمية",
    icon: GraduationCap,
    subItems: [
      { label: "الصفوف", href: "/classes" },
      { label: "المجموعات", href: "/groups" },
    ],
  },
  {
    label: "الحضور",
    icon: CalendarCheck,
    subItems: [
      { label: "تسجيل الحضور", href: "/attendance" },
      { label: "سجل الحضور", href: "/attendance/history" },
    ],
  },
  {
    label: "الامتحانات",
    icon: ClipboardList,
    subItems: [{ label: "الامتحانات", href: "/exams" }],
  },
  {
    label: "المالية",
    icon: CreditCard,
    subItems: [
      { label: "المدفوعات", href: "/payments" },
      { label: "تقارير المستحقات", href: "/payments/reports" },
    ],
  },
  {
    label: "الكروت",
    href: "/cards",
    icon: IdCard,
  },
  {
    label: "المستخدمون",
    href: "/users",
    icon: UserCheck,
    badge: "المساعدون",
  },
  {
    label: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
];

// Navigation configuration for Super Admin role
export const superAdminNavItems: NavItem[] = [
  {
    label: "الرئيسية",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "المدرسين",
    href: "/super-admin/teachers",
    icon: Users,
  },
];

export interface SidebarProps {
  items?: NavItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export function Sidebar({
  items = teacherNavItems,
  collapsed = false,
  isMobileOpen = false,
  onCloseMobile,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const [openSubMenu, setOpenSubMenu] = React.useState<string | null>(null);

  // Auto-expand sub-menu if current route matches one of its sub-items
  React.useEffect(() => {
    const activeItem = items.find(
      (item) =>
        item.subItems &&
        item.subItems.some((sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`))
    );
    if (activeItem) {
      setOpenSubMenu(activeItem.label);
    }
  }, [pathname, items]);

  const toggleSubMenu = (label: string) => {
    setOpenSubMenu((prev) => (prev === label ? null : label));
  };

  const renderContent = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-[#3b434e] text-white">
        {/* Sidebar Header / Logo */}
        <div
          className={cn(
            "relative flex h-20 items-center justify-center bg-white border-b border-gray-200 px-4 transition-all",
            isCollapsed && "px-2"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full h-full group"
            onClick={isMobile ? onCloseMobile : undefined}
            title="فُلك أكاديمي"
          >
            <div className="relative flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="فُلك أكاديمي"
                width={180}
                height={55}
                className={cn(
                  "object-contain transition-transform duration-200 group-hover:scale-105",
                  isCollapsed ? "h-9 w-auto max-w-[50px]" : "h-12 w-auto max-w-[170px]"
                )}
                priority
              />
            </div>
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const hasSub = !!item.subItems && item.subItems.length > 0;
            const isSubOpen = openSubMenu === item.label;

            const isDirectActive = item.href
              ? pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
              : false;

            const isChildActive = hasSub
              ? item.subItems!.some(
                  (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
                )
              : false;

            const isActive = isDirectActive || isChildActive;

            // Item with sub-items (Accordion)
            if (hasSub) {
              return (
                <div key={item.label} className="w-full">
                  <button
                    type="button"
                    onClick={() => toggleSubMenu(item.label)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-[15px] font-medium transition-colors",
                      isActive
                        ? "bg-[#3b82f6] text-white"
                        : "text-gray-200 hover:bg-[#4a5361] hover:text-white",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      <ChevronLeft
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-300 ease-in-out",
                          isSubOpen && "-rotate-90"
                        )}
                      />
                    )}
                  </button>

                  {/* Sub-items dropdown with accordion animation */}
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out bg-[#353c46]",
                      !isCollapsed && isSubOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      {item.subItems!.map((sub) => {
                        const isSubActive =
                          pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={isMobile ? onCloseMobile : undefined}
                            className={cn(
                              "flex items-center px-4 py-2.5 text-sm transition-colors pr-12",
                              isSubActive
                                ? "text-white font-semibold bg-white/5"
                                : "text-gray-300 hover:bg-[#4a5361] hover:text-white"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Direct link item
            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                title={isCollapsed ? item.label : undefined}
                onClick={isMobile ? onCloseMobile : undefined}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-3 text-[15px] font-medium transition-colors",
                  isActive
                    ? "bg-[#3b82f6] text-white"
                    : "text-gray-200 hover:bg-[#4a5361] hover:text-white",
                  isCollapsed && "justify-center"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      isActive ? "bg-white/20 text-white" : "bg-[#4a5361] text-gray-200"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col transition-all duration-300 z-30 sticky top-0 h-screen",
          collapsed ? "w-20" : "w-64",
          className
        )}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer (Overlay + Drawer) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Body */}
          <aside className="fixed inset-y-0 right-0 w-72 shadow-2xl transition-transform">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
