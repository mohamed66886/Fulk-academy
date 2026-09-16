import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = false, ...props }, ref) => (
    // استخدام تصميم مسطح بدون إطارات، مع تفعيل خط Cairo والتمرير الأفقي للموبايل
    <div
      className={cn(
        "relative w-full overflow-x-auto rounded-xl bg-white font-cairo",
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
        // لون رمادي داكن جداً للرأس
        "bg-gray-800 text-gray-50",
        sticky && "sticky top-0 z-10",
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
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      // تأثيرات ناعمة عند تمرير الماوس، بدون خطوط فاصلة حادة
      "transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100",
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
      "h-12 px-4 text-right align-middle font-semibold whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
    className={cn(
      "p-4 align-middle text-gray-700 whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
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
          {icon || <Inbox className="h-12 w-12 stroke-[1.5] text-gray-300" />}
          <p className="text-base font-semibold text-gray-700">{title}</p>
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

export function TableSkeleton({ cols = 4 }: TableSkeletonProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="h-32 text-center align-middle">
        <div className="flex w-full items-center justify-center gap-3 text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-semibold">جاري تحميل البيانات...</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
