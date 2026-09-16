"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Trash2, X, Eye } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types & Interfaces
   ========================================================================= */

export interface FormActionsProps {
  isEdit?: boolean;
  isLoading?: boolean;
  submitText?: string;
  submitIcon?: React.ReactNode;
  cancelText?: string;
  cancelHref?: string;
  onCancel?: () => void;
  extraActions?: React.ReactNode;
  onDelete?: () => void;
  deleteAction?: React.ReactNode;
  deleteText?: string;
  isDeleting?: boolean;
  className?: string;
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export interface EntityFormProps {
  /** عنوان النموذج */
  title?: string;
  /** وصف توضيحي للنموذج */
  description?: string;
  /** أيقونة النموذج */
  icon?: React.ComponentType<{ className?: string }>;
  /** لون الأيقونة */
  iconColor?: string;
  /** شارة أو حالة بجانب العنوان */
  badge?: React.ReactNode;
  /** عناصر إضافية في رأس النموذج */
  headerActions?: React.ReactNode;
  /** هل يتم تغليف النموذج في بطاقة موحدة (افتراضي true) */
  card?: boolean;
  /** عدد الأعمدة للشبكة (افتراضي 2) */
  columns?: 1 | 2 | 3 | 4;
  /** يحدد إذا كان النموذج في وضع التعديل أم الإضافة */
  isEdit?: boolean;
  /** دالة إرسال النموذج (تدعم الإرجاع غير المتزامن لـ { success, error }) */
  onSubmit: (
    e: React.FormEvent<HTMLFormElement>
  ) => Promise<{ success: boolean; error?: string } | void> | void;
  /** حالة التحميل / الحفظ (اختياري، يتم إدارتها تلقائياً إن لم تمرر) */
  isLoading?: boolean;
  /** رسالة الخطأ العامة (اختياري، يتم إدارتها تلقائياً إن لم تمرر) */
  error?: string | null;
  /** دالة إغلاق رسالة الخطأ */
  onErrorDismiss?: () => void;
  /** رسالة النجاح */
  successMessage?: string | null;
  /** نص زر الحفظ المخصص */
  submitText?: string;
  /** أيقونة زر الحفظ */
  submitIcon?: React.ReactNode;
  /** نص زر الإلغاء */
  cancelText?: string;
  /** رابط التراجع عند النقر على إلغاء */
  cancelHref?: string;
  /** دالة مخصصة لزر الإلغاء */
  onCancel?: () => void;
  /** رابط صفحة المعاينة / الجدول عند نجاح الحفظ */
  previewHref?: string;
  /** اسم بديل لـ previewHref */
  tableHref?: string;
  /** نص زر المعاينة في البوب اب (افتراضي: معاينة الجدول) */
  previewText?: string;
  /** دالة مخصصة للمعاينة */
  onPreview?: () => void;
  /** نص زر المتابعة في البوب اب (افتراضي: متابعة) */
  continueText?: string;
  /** دالة مخصصة عند الضغط على متابعة */
  onContinue?: () => void;
  /** تفعيل أو تعطيل نافذة النجاح المنبثقة (افتراضي: true) */
  showSuccessModal?: boolean;
  /** عنوان مخصص لنافذة النجاح */
  successModalTitle?: string;
  /** وصف مخصص لنافذة النجاح */
  successModalDescription?: string;
  /** دالة عند نجاح الحفظ */
  onSuccess?: () => void;
  /** أزرار إضافية بجانب أزرار الحفظ (مثل: حفظ واستمرار) */
  extraActions?: React.ReactNode;
  /** دالة حذف في وضع التعديل */
  onDelete?: () => void;
  /** عنصر مخصص للحذف */
  deleteAction?: React.ReactNode;
  /** نص زر الحذف */
  deleteText?: string;
  /** حالة جاري الحذف */
  isDeleting?: boolean;
  /** موضع أزرار الإجراءات */
  actionsPosition?: "bottom" | "top" | "both";
  /** فئات CSS إضافية للنموذج */
  className?: string;
  /** محتويات وأقسام النموذج */
  children: React.ReactNode;
}

/* =========================================================================
   FormActions Component
   ========================================================================= */

export function FormActions({
  isEdit = false,
  isLoading = false,
  submitText,
  submitIcon,
  cancelText = "إلغاء",
  cancelHref,
  onCancel,
  extraActions,
  onDelete,
  deleteAction,
  deleteText = "حذف",
  isDeleting = false,
  className,
}: FormActionsProps) {
  const router = useRouter();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (cancelHref) {
      router.push(cancelHref);
    } else {
      router.back();
    }
  };

  const defaultSubmitText = isEdit ? "تحديث البيانات" : "حفظ البيانات";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100 dark:border-slate-800",
        className
      )}
    >
      {/* زر الحذف إن وجد (غالباً في وضع التعديل) */}
      <div className="flex items-center gap-2">
        {deleteAction}
        {onDelete && !deleteAction && (
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onDelete}
            disabled={isLoading || isDeleting}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4 ml-1.5" />}
          >
            {deleteText}
          </Button>
        )}
      </div>

      {/* أزرار الحفظ والإلغاء والإجراءات الإضافية */}
      <div className="flex flex-wrap items-center gap-3 mr-auto">
        {extraActions}

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleCancel}
          disabled={isLoading || isDeleting}
        >
          {cancelText}
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isLoading || isDeleting}
          isLoading={isLoading}
          leftIcon={
            !isLoading ? (
              submitIcon !== undefined ? (
                submitIcon
              ) : (
                <Save className="w-4 h-4 ml-1.5 shrink-0" />
              )
            ) : undefined
          }
          className="min-w-[130px]"
        >
          {submitText || defaultSubmitText}
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   FormSection Component
   ========================================================================= */

const columnClasses: Record<1 | 2 | 3 | 4, string> = {
  1: "grid grid-cols-1 gap-5 sm:gap-6 [&>*]:min-w-0",
  2: "grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 [&>*]:min-w-0",
  3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 [&>*]:min-w-0",
  4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 [&>*]:min-w-0",
};

export function FormSection({
  title,
  description,
  icon: Icon,
  iconColor = "text-teal-600",
  badge,
  headerActions,
  columns = 2,
  className,
  bodyClassName,
  children,
}: FormSectionProps) {
  const hasHeader = title || description || Icon || badge || headerActions;

  return (
    <div
      className={cn(
        "w-full bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl space-y-6 transition-all duration-300",
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="shrink-0 flex items-center justify-center">
                {React.isValidElement(Icon)
                  ? Icon
                  : (() => {
                      const Component = Icon as React.ElementType;
                      return <Component className={cn("w-6 h-6", iconColor)} />;
                    })()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {title && (
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>

          {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
        </div>
      )}

      {/* Grid Layout for section fields */}
      <div className={cn(columnClasses[columns] || columnClasses[2], bodyClassName)}>
        {children}
      </div>
    </div>
  );
}

/* =========================================================================
   EntityForm Main Component
   ========================================================================= */

export function EntityForm({
  title,
  description,
  icon: Icon,
  iconColor = "text-teal-600",
  badge,
  headerActions,
  card = true,
  columns = 2,
  isEdit = false,
  onSubmit,
  isLoading: externalLoading,
  error: externalError,
  onErrorDismiss,
  successMessage,
  submitText,
  submitIcon,
  cancelText = "إلغاء",
  cancelHref,
  onCancel,
  previewHref,
  tableHref,
  previewText = "معاينة الجدول",
  onPreview,
  continueText = "متابعة",
  onContinue,
  showSuccessModal = true,
  successModalTitle,
  successModalDescription,
  onSuccess,
  extraActions,
  onDelete,
  deleteAction,
  deleteText,
  isDeleting = false,
  actionsPosition = "bottom",
  className,
  children,
}: EntityFormProps) {
  const router = useRouter();
  const [internalPending, startTransition] = useTransition();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // استخدام الحالة الممررة أو الداخلية
  const isLoading = externalLoading !== undefined ? externalLoading : internalPending;
  const currentError = externalError !== undefined ? externalError : internalError;

  const targetPreviewUrl = previewHref || tableHref || cancelHref || "/";

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInternalError(null);

    startTransition(async () => {
      try {
        const result = await onSubmit(e);

        // إذا أعادت الدالة كائن به success أو error
        if (result && typeof result === "object") {
          if (result.success === false) {
            setInternalError(result.error || "حدث خطأ أثناء حفظ البيانات");
            return;
          }
        }

        // الحفظ تم بنجاح
        onSuccess?.();

        if (showSuccessModal) {
          setIsModalClosing(false);
          setIsSuccessModalOpen(true);
        } else if (targetPreviewUrl) {
          router.push(targetPreviewUrl);
          router.refresh();
        }
      } catch (err: unknown) {
        setInternalError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الحفظ");
      }
    });
  };

  const handleDismissError = () => {
    setInternalError(null);
    onErrorDismiss?.();
  };

  const closeModal = (callback?: () => void) => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsSuccessModalOpen(false);
      setIsModalClosing(false);
      callback?.();
    }, 250);
  };

  const handleContinue = () => {
    closeModal(() => {
      if (onContinue) {
        onContinue();
      }
      router.refresh();
    });
  };

  const handlePreview = () => {
    closeModal(() => {
      if (onPreview) {
        onPreview();
      } else if (targetPreviewUrl) {
        router.push(targetPreviewUrl);
        router.refresh();
      }
    });
  };

  const actionsComponent = (
    <FormActions
      isEdit={isEdit}
      isLoading={isLoading}
      submitText={submitText}
      submitIcon={submitIcon}
      cancelText={cancelText}
      cancelHref={cancelHref}
      onCancel={onCancel}
      extraActions={extraActions}
      onDelete={onDelete}
      deleteAction={deleteAction}
      deleteText={deleteText}
      isDeleting={isDeleting}
    />
  );

  return (
    <>
      <form onSubmit={handleFormSubmit} className={cn("w-full space-y-6", className)}>
        {/* تنبيه الخطأ العام */}
        {currentError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-medium">{currentError}</span>
            </div>
            <button
              type="button"
              onClick={handleDismissError}
              className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 p-1 rounded-lg hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* تنبيه النجاح العام (إن وجد) */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-2xl text-sm flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* وضع البطاقة الموحدة Card */}
        {card ? (
          <div className="w-full bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 transition-all duration-300">
            {/* رأس البطاقة: العنوان والوصف والأيقونة */}
            {(title || description || Icon || badge || headerActions) && (
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="shrink-0 flex items-center justify-center">
                      {React.isValidElement(Icon)
                        ? Icon
                        : (() => {
                            const Component = Icon as React.ElementType;
                            return (
                              <Component className={cn("w-7 h-7 stroke-[1.5px]", iconColor)} />
                            );
                          })()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5">
                      {title && (
                        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                          {title}
                        </h2>
                      )}
                      {badge}
                    </div>
                    {description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {headerActions && (
                  <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
                )}
              </div>
            )}

            {/* أزرار الإجراءات العلوية إن تم طلبها */}
            {(actionsPosition === "top" || actionsPosition === "both") && actionsComponent}

            {/* شبكة المدخلات */}
            <div className={columnClasses[columns] || columnClasses[2]}>{children}</div>

            {/* أزرار الإجراءات السفلية */}
            {(actionsPosition === "bottom" || actionsPosition === "both") && actionsComponent}
          </div>
        ) : (
          /* وضع الأقسام المنفصلة */
          <>
            {(actionsPosition === "top" || actionsPosition === "both") && actionsComponent}
            {children}
            {(actionsPosition === "bottom" || actionsPosition === "both") && actionsComponent}
          </>
        )}
      </form>

      {/* نافذة النجاح المنبثقة (Success Popup) */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <style>{`
            @keyframes drawCheckCircle {
              0% { stroke-dashoffset: 145; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes drawCheckMark {
              0% { stroke-dashoffset: 45; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>

          {/* الخلفية المظلمة الشفافة مع أنيميشن ناعم */}
          <div
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-250 ease-out ${
              isModalClosing ? "opacity-0" : "opacity-100"
            }`}
            onClick={handleContinue}
          />

          {/* محتوى النافذة المنبثقة - بدون شادو وبدون بوردر وبأنيميشن ناعم للظهور والاختفاء */}
          <div
            className={`relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-0 shadow-none text-center space-y-6 z-10 transition-all duration-250 ease-out ${
              isModalClosing
                ? "opacity-0 scale-95 translate-y-3"
                : "opacity-100 scale-100 translate-y-0"
            }`}
          >
            {/* أيقونة النجاح SVG كبيرة تُرسم ذاتياً وبدون أي خلفية */}
            <div className="flex items-center justify-center py-2">
              <svg className="w-24 h-24 text-emerald-500" viewBox="0 0 52 52" fill="none">
                <circle
                  cx="26"
                  cy="26"
                  r="23"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 145,
                    strokeDashoffset: 145,
                    animation: "drawCheckCircle 0.5s cubic-bezier(0.65, 0, 0.45, 1) forwards",
                  }}
                />
                <path
                  d="M15 27l7.5 7.5L37 19"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 45,
                    strokeDashoffset: 45,
                    animation: "drawCheckMark 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.35s forwards",
                  }}
                />
              </svg>
            </div>

            {/* العنوان والوصف */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {successModalTitle || (isEdit ? "تم تحديث البيانات بنجاح" : "تم الحفظ بنجاح")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                {successModalDescription ||
                  "تم حفظ البيانات بنجاح في النظام. يمكنك المتابعة في نفس الصفحة أو الانتقال لمعاينة الجدول."}
              </p>
            </div>

            {/* أزرار الإجراء: متابعة & معاينة باستخدام كمبوننت Button */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button type="button" variant="secondary" size="md" onClick={handleContinue}>
                {continueText}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handlePreview}
                leftIcon={<Eye className="w-4 h-4 ml-1 shrink-0" />}
              >
                {previewText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
