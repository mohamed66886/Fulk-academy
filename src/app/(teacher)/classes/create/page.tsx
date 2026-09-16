import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassForm } from "../class-form";

export default function CreateClassPage() {
  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Back button and navigation breadcrumb */}
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link href="/classes">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold text-muted hover:text-text"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى قائمة الصفوف</span>
          </Button>
        </Link>
      </div>

      {/* Main Form */}
      <ClassForm isEdit={false} />
    </div>
  );
}
