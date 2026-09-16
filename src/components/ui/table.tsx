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
        "relative w-full overflow-x-auto rounded-xl bg-surface border border-border transition-all shadow-xs",
        stickyHeader && "max-h-[650px] overflow-y-auto"
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
        "bg-surface-secondary text-text font-bold border-b border-border",
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
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 divide-y divide-border/60", className)}
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
      "transition-colors hover:bg-primary/[0.03] dark:hover:bg-slate-800/60 data-[state=selected]:bg-primary/[0.08]",
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
      "h-12 px-4 text-right align-middle font-bold text-xs text-muted uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
      "p-4 align-middle text-sm text-text whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-surface-secondary/70 border-t border-border font-medium text-text",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-xs text-muted", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

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
        <div className="flex flex-col items-center justify-center gap-2 text-muted">
          {icon || <Inbox className="h-10 w-10 stroke-[1.5] text-muted/60" />}
          <p className="text-base font-semibold text-text">{title}</p>
          <p className="text-xs text-muted max-w-sm">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 4, cols = 4 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell colSpan={cols} className="h-20 text-center align-middle">
            <div className="flex w-full items-center justify-center gap-3 text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs font-semibold">جاري تحميل البيانات...</span>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default Table;
