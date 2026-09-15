import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = false, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-lg border border-gray-200 bg-white",
        stickyHeader && "max-h-[600px]"
      )}
    >
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm text-right", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, sticky = false, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "border-b border-gray-200 bg-gray-50",
        sticky && "sticky top-0 z-10 backdrop-blur-sm bg-gray-50/90",
        className
      )}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 divide-y divide-gray-100", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-gray-100 transition-colors hover:bg-gray-50/80 data-[state=selected]:bg-blue-50/50",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-right align-middle font-semibold text-gray-600 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle text-gray-800 [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export interface TableEmptyProps {
  colSpan: number;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function TableEmpty({
  colSpan,
  title = "لا توجد بيانات متاحة",
  description = "لم يتم العثور على أي نتائج في الوقت الحالي.",
  icon,
}: TableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center hover:bg-transparent">
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
          {icon || <Inbox className="h-10 w-10 stroke-[1.5]" />}
          <p className="text-base font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-500 max-w-sm">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={`skeleton-row-${r}`} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={`skeleton-cell-${r}-${c}`}>
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
