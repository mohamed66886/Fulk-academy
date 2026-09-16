"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "destructive"
  | "success"
  | "warning"
  | "ghost"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#4B83F3] hover:bg-blue-600 text-white shadow-xs focus:ring-blue-500/30 active:bg-blue-700",
  secondary:
    "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 focus:ring-gray-300 dark:focus:ring-slate-600 active:bg-gray-300 dark:active:bg-slate-600",
  outline:
    "border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 focus:ring-blue-500/20 active:bg-gray-100 dark:active:bg-slate-800",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500/30 active:bg-red-800",
  destructive:
    "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500/30 active:bg-red-800",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500/30 active:bg-emerald-800",
  warning:
    "bg-amber-500 hover:bg-amber-600 text-white shadow-xs focus:ring-amber-500/30 active:bg-amber-700",
  ghost:
    "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 focus:ring-gray-300 dark:focus:ring-slate-700 active:bg-gray-200 dark:active:bg-slate-700",
  link: "bg-transparent text-[#4B83F3] dark:text-blue-400 hover:underline p-0 focus:ring-0 shadow-none",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-xs gap-1.5",
  md: "px-4 py-2 text-sm rounded-xs gap-2",
  lg: "px-6 py-2.5 text-base rounded-sm gap-2.5",
  icon: "p-2 text-sm rounded-xs gap-1",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled = false,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isBtnDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isBtnDisabled}
        className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        {children && (
          <span className="inline-flex items-center justify-center gap-1.5 leading-none">
            {children}
          </span>
        )}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
