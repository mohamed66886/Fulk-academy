"use client";

import * as React from "react";
import { Sidebar, teacherNavItems } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background text-text" dir="rtl">
      {/* Sidebar: Desktop Sticky & Mobile Drawer */}
      <Sidebar
        items={teacherNavItems}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Body */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          onOpenMobile={() => setIsMobileOpen(true)}
          userName="أ. محمد رشاد"
          userRole="مدرس"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
