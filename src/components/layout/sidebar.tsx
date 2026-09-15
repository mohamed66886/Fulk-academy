"use client";

import * as React from "react";
import Link from "next/link";
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
  ChevronDown,
  ChevronLeft,
  X,
  Compass,
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
  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>({});

  // Auto-expand sub-menu if current route matches one of its sub-items
  React.useEffect(() => {
    items.forEach((item) => {
      if (item.subItems) {
        const isChildActive = item.subItems.some(
          (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
        );
        if (isChildActive) {
          setOpenSubMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [pathname, items]);

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const renderContent = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-[#3b434e] text-white">
        {/* Sidebar Header / Logo */}
        <div
          className={cn(
            "flex h-24 items-center border-b border-[#4d5766] px-4 transition-all",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-bold text-white hover:opacity-90 w-full justify-center"
            onClick={isMobile ? onCloseMobile : undefined}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm">
              <Compass className="h-7 w-7" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight">فُلك أكاديمي</span>
              </div>
            )}
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-gray-300 hover:bg-[#4d5766] hover:text-white"
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
            const isSubOpen = !!openSubMenus[item.label];

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

                    {!isCollapsed &&
                      (isSubOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 shrink-0" />
                      ))}
                  </button>

                  {/* Sub-items dropdown */}
                  {!isCollapsed && isSubOpen && (
                    <div className="bg-[#353c46]">
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
                                ? "text-white font-semibold"
                                : "text-gray-300 hover:bg-[#4a5361] hover:text-white"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
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
