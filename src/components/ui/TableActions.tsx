import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface TableActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface TableActionsProps {
  actions: TableActionItem[];
}

const MENU_WIDTH = 138;
const MENU_MARGIN = 8;

interface MenuPosition {
  top: number;
  left: number;
  openUpward: boolean;
}

export function TableActions({ actions }: TableActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [deleteActionItem, setDeleteActionItem] = useState<TableActionItem | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleActions = actions.filter((a) => a.icon || a.label);

  /* ---------- positioning: recompute on open, scroll, resize ---------- */
  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = Math.min(visibleActions.length * 36 + 10, 280);

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + MENU_MARGIN && rect.top > menuHeight;

    // Align the menu's start edge with the trigger; keep inside viewport horizontally.
    let left = rect.right - MENU_WIDTH;
    left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN));

    const top = openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6;

    setPosition({ top, left, openUpward });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /* ---------- Smooth Open & Close Transitions ---------- */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let frameId: number;

    if (isOpen) {
      setIsMounted(true);
      // Double rAF ensures the initial state (opacity-0 scale-95) is painted before animating in
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsMounted(false);
      }, 160);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => computePosition();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closeDeleteModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setDeleteActionItem(null);
      setIsModalClosing(false);
    }, 200);
  };

  const handleConfirmDelete = () => {
    if (deleteActionItem) {
      deleteActionItem.onClick();
    }
    closeDeleteModal();
  };

  const handleItemClick = (action: TableActionItem) => {
    if (action.disabled) return;
    setIsOpen(false);
    if (action.danger) {
      setDeleteActionItem(action);
    } else {
      action.onClick();
    }
  };

  if (visibleActions.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-center">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="خيارات الصف"
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) {
              computePosition();
            }
            setIsOpen((prev) => !prev);
          }}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 cursor-pointer",
            "text-slate-500 dark:text-slate-400 border-transparent",
            "hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1",
            isOpen &&
              "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          )}
        >
          <MoreVertical className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Dropdown menu — rendered in a portal with smooth opening and closing animation */}
      {isMounted &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            dir="rtl"
            style={{
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
              fontFamily: "var(--font-cairo), Cairo, sans-serif",
            }}
            className={cn(
              "fixed z-[90] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
              "border border-slate-200/90 dark:border-slate-800",
              "shadow-xl rounded-xl p-1 max-h-[280px] overflow-y-auto",
              "font-sans table-actions-dropdown",
              position.openUpward ? "origin-bottom" : "origin-top",
              "transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] transform",
              isVisible
                ? "opacity-100 scale-100 translate-y-0"
                : position.openUpward
                  ? "opacity-0 scale-95 translate-y-1.5 pointer-events-none"
                  : "opacity-0 scale-95 -translate-y-1.5 pointer-events-none"
            )}
          >
            {visibleActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(action);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-start rounded-lg transition-colors duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed font-sans cursor-pointer",
                  action.danger
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:bg-red-100 dark:active:bg-red-900/40"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 active:bg-slate-200/60 dark:active:bg-slate-700/60"
                )}
                style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}
              >
                {React.isValidElement<{ className?: string }>(action.icon)
                  ? React.cloneElement(action.icon, { className: "w-4 h-4 shrink-0" })
                  : action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deleteActionItem &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Dark background overlay */}
            <div
              className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
                isModalClosing ? "opacity-0" : "opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                closeDeleteModal();
              }}
            />

            {/* Modal Content */}
            <div
              className={`relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-5 z-10 font-sans transition-all duration-200 ease-out ${
                isModalClosing
                  ? "opacity-0 scale-[0.98] translate-y-1"
                  : "opacity-100 scale-100 translate-y-0"
              }`}
              style={{ fontFamily: "var(--font-cairo), Cairo, sans-serif" }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              {/* Warning icon — static, formal */}
              <div className="flex items-center justify-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40">
                  <svg
                    className="w-6 h-6 text-rose-600 dark:text-rose-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تأكيد الحذف
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  هل أنت متأكد أنك تريد الاستمرار في عملية الحذف؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDeleteModal();
                  }}
                  fullWidth
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmDelete();
                  }}
                  fullWidth
                >
                  تأكيد الحذف
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
