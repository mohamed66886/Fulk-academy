import * as React from "react";
import Image from "next/image";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    // 1. استخدام 100dvh لثبات الشاشة على الموبايل
    <div className="min-h-[100dvh] bg-background text-text flex flex-col justify-between font-cairo selection:bg-secondary" dir="rtl">
      
      {/* Header */}
      {/* 2. استخدام bg-surface صريح بدون شفافية لضمان عدم تداخل المحتوى تحته بشكل مزعج، مع ظل خفيف (Flat UI) */}
      <header className="sticky top-0 z-40 flex w-full flex-col bg-surface pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* حاوية اللوجو */}
            <div className="relative h-9 w-24 shrink-0 flex items-center justify-start">
              <Image
                src="/logo.png"
                alt="فُلك أكاديمي"
                width={96}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>

          <div className="flex items-center">
            {/* 3. بادج "وضع الاطلاع" بألوان صريحة (بدون /30) وخط عريض جداً لضمان القراءة السليمة */}
            <span className="inline-flex items-center rounded-[12px] bg-secondary px-3 py-1.5 text-[11px] font-black text-text tracking-wide">
              وضع الاطلاع
            </span>
          </div>
        </div>
        
        {/* 4. الفاصل الناعم تم التخلص فيه من الشفافية المفرطة */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 sm:p-6 pb-20">
        {children}
      </main>

      {/* Footer */}
      {/* 5. استخدام text-text و text-muted صريحة بدون opacity */}
      <footer className="py-6 text-center bg-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-border/50">
        <p className="text-[11px] sm:text-xs font-black text-text">
          منصة فُلك أكاديمي &copy; {new Date().getFullYear()}
        </p>
        <p className="mt-1 text-[10px] sm:text-[11px] font-bold text-muted">
          نظام متابعة الطلاب وأولياء الأمور
        </p>
      </footer>
    </div>
  );
}