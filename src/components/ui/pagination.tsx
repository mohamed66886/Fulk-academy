"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ChevronRight, ChevronLeft } from "lucide-react";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  currentPage?: number;
  isLoading?: boolean;
  totalCount?: number;
  pageSize?: number;
  itemLabel?: string;
}

export function Pagination({
  className,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  currentPage = 1,
  isLoading = false,
  totalCount,
  pageSize,
  itemLabel = "عنصر",
  ...props
}: PaginationProps) {
  const totalPages =
    totalCount !== undefined && pageSize && pageSize > 0
      ? Math.ceil(totalCount / pageSize)
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row items-center justify-between gap-4 py-4 px-2",
        className
      )}
      {...props}
    >
      <div className="text-sm text-gray-500">
        {totalCount !== undefined ? (
          <span>
            إجمالي: <strong className="text-gray-900 font-bold">{totalCount}</strong> {itemLabel}
            {totalPages !== undefined && (
              <span className="mr-1">
                (صفحة {currentPage} من {totalPages})
              </span>
            )}
          </span>
        ) : (
          <span>
            الصفحة الحالية: <strong className="text-gray-900 font-bold">{currentPage}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!hasPrevPage || isLoading}
          aria-label="السابق"
          className="text-gray-600 hover:text-gray-900"
        >
          <ChevronRight className="h-4 w-4 ml-1" />
          السابق
        </Button>

        <span className="min-w-[2.5rem] text-center text-sm font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-[#3b82f6]">
          {currentPage}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          aria-label="التالي"
          className="text-gray-600 hover:text-gray-900"
        >
          التالي
          <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}
