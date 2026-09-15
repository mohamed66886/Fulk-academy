import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pr-3 pl-10 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:border-[#3b82f6] focus-visible:ring-2 focus-visible:ring-[#3b82f6]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {/* السهم تم وضعه على اليسار (left-3) ليتناسب مع اتجاه اللغة العربية */}
        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    );
  }
);

Select.displayName = "Select";
