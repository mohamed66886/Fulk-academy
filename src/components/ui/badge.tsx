import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gray-100 text-gray-700",
        primary: "border-blue-100 bg-blue-50 text-[#3b82f6]",
        success: "border-green-100 bg-green-50 text-green-700",
        warning: "border-orange-100 bg-orange-50 text-orange-700",
        danger: "border-red-100 bg-red-50 text-red-600",
        outline: "border-gray-200 text-gray-700 bg-white",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-gray-500": variant === "default" || !variant,
            "bg-[#3b82f6]": variant === "primary",
            "bg-green-500": variant === "success",
            "bg-orange-500": variant === "warning",
            "bg-red-500": variant === "danger",
            "bg-gray-400": variant === "outline",
          })}
        />
      )}
      {children}
    </span>
  );
}