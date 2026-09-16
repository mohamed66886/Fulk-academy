"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ButtonVariant, ButtonSize } from "./button";
import { DropdownIcon } from "./DropdownIcon";

export interface DropdownButtonItem {
  label: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownButtonProps {
  label: React.ReactNode;
  items: DropdownButtonItem[];
  onPrimaryClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  split?: boolean;
  className?: string;
  menuClassName?: string;
  menuWidth?: string;
}

const variantStyles: Record<string, { bg: string; divider: string }> = {
  primary: {
    bg: "bg-[#2b73a1] hover:bg-[#225c82] text-white shadow-xs focus:ring-blue-500/30",
    divider: "border-r border-white/30",
  },
  secondary: {
    bg: "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 focus:ring-gray-300",
    divider: "border-r border-gray-300 dark:border-slate-700",
  },
  outline: {
    bg: "border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 focus:ring-blue-500/20",
    divider: "border-r border-gray-300 dark:border-slate-700",
  },
  danger: {
    bg: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500/30",
    divider: "border-r border-white/30",
  },
  destructive: {
    bg: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500/30",
    divider: "border-r border-white/30",
  },
  success: {
    bg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500/30",
    divider: "border-r border-white/30",
  },
  warning: {
    bg: "bg-amber-500 hover:bg-amber-600 text-white shadow-xs focus:ring-amber-500/30",
    divider: "border-r border-white/30",
  },
  ghost: {
    bg: "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 focus:ring-gray-300",
    divider: "border-r border-gray-300 dark:border-slate-700",
  },
  link: {
    bg: "bg-transparent text-[#4B83F3] dark:text-blue-400 hover:underline shadow-none",
    divider: "border-r border-blue-400",
  },
};

const sizeStyles: Record<string, { text: string; padding: string; icon: string }> = {
  sm: {
    text: "text-xs",
    padding: "px-3 py-1.5",
    icon: "w-3.5 h-3.5",
  },
  md: {
    text: "text-sm",
    padding: "px-4 py-2",
    icon: "w-4 h-4",
  },
  lg: {
    text: "text-base",
    padding: "px-5 py-2.5",
    icon: "w-5 h-5",
  },
  icon: {
    text: "text-sm",
    padding: "p-2",
    icon: "w-4 h-4",
  },
};

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  items = [],
  onPrimaryClick,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  split = true,
  className = "",
  menuClassName = "",
  menuWidth = "w-56",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const styles = variantStyles[variant] || variantStyles.primary!;
  const sStyles = sizeStyles[size] || sizeStyles.md!;

  // Close on Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (split) {
      if (onPrimaryClick) {
        onPrimaryClick();
      } else {
        setIsOpen(!isOpen);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex text-right select-none ${className}`}
      dir="rtl"
    >
      {/* Attached Split / Single Button Container */}
      <div
        className={`inline-flex items-stretch rounded-xs overflow-hidden transition-all duration-150 ${styles.bg} ${
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        }`}
      >
        {/* Main Action Button (Text / Label) */}
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={handleMainClick}
          className={`inline-flex items-center gap-2 font-medium transition-colors focus:outline-none ${sStyles.padding} ${sStyles.text}`}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
          {!isLoading && rightIcon}
          <span>{label}</span>
          {!isLoading && leftIcon}
        </button>

        {/* Attached Dropdown Arrow Toggle Button */}
        {split ? (
          <button
            type="button"
            disabled={disabled || isLoading}
            onClick={handleToggleClick}
            className={`inline-flex items-center justify-center px-2.5 transition-colors focus:outline-none ${styles.divider} hover:bg-black/10`}
            title="خيارات إضافية"
          >
            <DropdownIcon
              className={`${sStyles.icon} transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || isLoading}
            onClick={handleToggleClick}
            className="inline-flex items-center justify-center pl-2.5 pr-1 focus:outline-none"
          >
            <DropdownIcon
              className={`${sStyles.icon} transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Floating Dropdown Popup Menu matching Screenshot */}
      {isOpen && !disabled && (
        <div
          className={`absolute top-full left-0 z-[99999] mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-xl py-1 overflow-hidden animate-fadeIn ${menuWidth} ${menuClassName}`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full text-right flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors border-b border-gray-100 dark:border-slate-800 last:border-b-0 cursor-pointer ${
                item.disabled
                  ? "opacity-50 cursor-not-allowed text-gray-400 bg-gray-50 dark:bg-slate-850 dark:text-slate-500"
                  : item.danger
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              {item.icon && <span className="text-gray-500 dark:text-slate-400">{item.icon}</span>}
              <span className="truncate flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownButton;
