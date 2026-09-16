"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, RotateCcw, ChevronDown, Plus } from "lucide-react";
import { Button, ButtonVariant, ButtonSize } from "./button";
import { cn } from "@/lib/utils";

export interface SearchFilterCardProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  onSearch?: () => void;
  onReset?: () => void;
  resultsCount?: number | null;
  searchButtonText?: string;
  resetButtonText?: string;
  isSearching?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  children?: React.ReactNode;
  extraActions?: React.ReactNode;
  headerActions?: React.ReactNode;

  // زر الإضافة (Add Button) باستخدام كمبوننت Button
  onAdd?: () => void;
  addHref?: string;
  addButtonText?: string;
  addButtonIcon?: React.ReactNode;
  addButtonVariant?: ButtonVariant;
  addButtonSize?: ButtonSize;
  addButtonClassName?: string;
  addButtonPosition?: "header" | "bottom" | "both";
  isAdding?: boolean;
}

export function SearchFilterCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-blue-500",
  onSearch,
  onReset,
  resultsCount = null,
  searchButtonText = "بحث",
  resetButtonText = "إعادة تعيين",
  isSearching = false,
  collapsible = true,
  defaultExpanded = true,
  className,
  children,
  extraActions,
  headerActions,
  onAdd,
  addHref,
  addButtonText = "إضافة جديد",
  addButtonIcon,
  addButtonVariant = "primary",
  addButtonSize = "md",
  addButtonClassName,
  addButtonPosition = "header",
  isAdding = false,
}: SearchFilterCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  const renderAddButton = () => {
    if (!onAdd && !addHref) return null;

    const buttonContent = (
      <Button
        type="button"
        variant={addButtonVariant}
        size={addButtonSize}
        onClick={onAdd}
        isLoading={isAdding}
        leftIcon={
          !isAdding ? (addButtonIcon ?? <Plus className="w-4 h-4 ml-1 stroke-[2px]" />) : undefined
        }
        className={addButtonClassName}
      >
        {addButtonText}
      </Button>
    );

    if (addHref) {
      return (
        <Link href={addHref} className="outline-none inline-flex">
          {buttonContent}
        </Link>
      );
    }

    return buttonContent;
  };

  return (
    <div
      className={cn(
        "w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 space-y-6 transition-all duration-300 relative z-20",
        className
      )}
    >
      {/* Page Header Area */}
      <div
        className={cn(
          "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
          children && isExpanded ? "pb-6" : ""
        )}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "flex items-center justify-center shrink-0",
                iconColor.replace("text-", "text-")
              )}
            >
              {React.isValidElement(Icon)
                ? Icon
                : (() => {
                    const Component = Icon as React.ElementType;
                    return <Component className={cn("w-7 h-7 stroke-[1.5px]", iconColor)} />;
                  })()}
            </div>
          )}
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-normal">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {(addButtonPosition === "header" || addButtonPosition === "both") && renderAddButton()}
          {headerActions}

          {collapsible && children && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 rounded-xl bg-transparent cursor-pointer"
              )}
              title={isExpanded ? "طي الفلاتر" : "توسيع الفلاتر"}
            >
              <ChevronDown
                className={cn(
                  "w-6 h-6 stroke-[1.5px] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  isExpanded ? "rotate-180" : ""
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Filter Body & Grid */}
      <div
        className={cn(
          "grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isExpanded
            ? "grid-rows-[1fr] opacity-100 overflow-visible"
            : "grid-rows-[0fr] opacity-0 overflow-hidden"
        )}
      >
        <div className={cn(isExpanded ? "overflow-visible" : "overflow-hidden")}>
          {children && (
            <form onSubmit={handleSubmit} className="space-y-6 pt-1 pb-2">
              {/* Grid Layout for filter inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-end">
                {children}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-start gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                {onSearch && (
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSearching}
                    leftIcon={
                      !isSearching ? <Search className="w-4 h-4 ml-1 stroke-[1.5px]" /> : undefined
                    }
                    className="min-w-[120px]"
                  >
                    {searchButtonText}
                  </Button>
                )}

                {onReset && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onReset}
                    disabled={isSearching}
                    leftIcon={<RotateCcw className="w-4 h-4 ml-1 stroke-[1.5px]" />}
                  >
                    {resetButtonText}
                  </Button>
                )}

                {resultsCount !== null && resultsCount !== undefined && (
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 select-none px-4 py-2 flex items-center gap-2">
                    النتائج:
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-base">
                      {resultsCount}
                    </span>
                  </div>
                )}

                {(addButtonPosition === "bottom" || addButtonPosition === "both") &&
                  renderAddButton()}

                {extraActions}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FilterField: Wrapper for a single filter with clean label styling
 */
export const FilterField = ({
  label,
  children,
  className,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-1.5 w-full text-right", className)}>
    {label && (
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block pr-0.5">
        {label}
      </label>
    )}
    {children}
  </div>
);

/**
 * CombinedFilterField: For split inputs like (Code + Name + Action Icon)
 */
export const CombinedFilterField = ({
  label,
  leftInput,
  rightInput,
  actionIcon,
  className,
}: {
  label?: React.ReactNode;
  leftInput: React.ReactNode;
  rightInput: React.ReactNode;
  actionIcon?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-1.5 w-full text-right", className)}>
    {label && (
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block pr-0.5">
        {label}
      </label>
    )}
    <div className="flex items-center gap-1.5 w-full">
      {actionIcon && (
        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors shrink-0">
          {actionIcon}
        </div>
      )}
      <div className="flex-1">{leftInput}</div>
      <div className="w-1/3 shrink-0">{rightInput}</div>
    </div>
  </div>
);

export default SearchFilterCard;
