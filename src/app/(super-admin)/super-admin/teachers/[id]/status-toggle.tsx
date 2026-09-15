"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toggleTeacherStatus } from "@/lib/actions/teachers";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { UserCheck, UserX, AlertTriangle } from "lucide-react";

interface StatusToggleProps {
  teacherId: string;
  currentStatus: "active" | "disabled";
}

export function TeacherStatusToggle({ teacherId, currentStatus }: StatusToggleProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const isCurrentlyActive = currentStatus === "active";
  const targetStatus = isCurrentlyActive ? "disabled" : "active";

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const res = await toggleTeacherStatus(teacherId, targetStatus);
      if (!res.success) {
        toast.error(res.error || "فشل تغيير حالة الحساب");
        return;
      }

      toast.success(
        targetStatus === "disabled"
          ? "تم إيقاف حساب المدرس ومنع الدخول بنجاح"
          : "تم تفعيل حساب المدرس بنجاح"
      );
      setIsModalOpen(false);
      router.refresh();
    } catch {
      toast.error("حدث خطأ غير متوقع أثناء العملية");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isCurrentlyActive ? "danger" : "primary"}
        size="md"
        onClick={() => setIsModalOpen(true)}
        className="gap-2 font-bold shadow-sm"
      >
        {isCurrentlyActive ? (
          <>
            <UserX className="h-4 w-4" />
            <span>إيقاف الحساب</span>
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            <span>تفعيل الحساب</span>
          </>
        )}
      </Button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isLoading && setIsModalOpen(false)}
        title={isCurrentlyActive ? "تأكيد إيقاف حساب المدرس" : "تأكيد تفعيل حساب المدرس"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                isCurrentlyActive ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-sm text-text leading-relaxed">
              {isCurrentlyActive
                ? "سيؤدي إيقاف الحساب إلى منع المدرس من تسجيل الدخول وإبطال جلساته النشطة فورًا. لن يتم حذف أي من بياناته."
                : "سيتم إعادة تفعيل الحساب وتمكين المدرس من تسجيل الدخول ومباشرة العمل مجددًا."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              onClick={() => setIsModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant={isCurrentlyActive ? "danger" : "primary"}
              type="button"
              isLoading={isLoading}
              onClick={handleToggle}
              className="font-bold"
            >
              {isCurrentlyActive ? "تأكيد الإيقاف" : "تأكيد التفعيل"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
