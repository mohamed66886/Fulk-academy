"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Search, Check, X } from "lucide-react";
import { DropdownIcon } from "./DropdownIcon";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
};

export type SelectSize = "sm" | "md" | "lg";

export interface SelectProps {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  options?: SelectOption[];
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  helperText?: string;
  error?: string | boolean;
  required?: boolean;
  isRequired?: boolean;
  leftIcon?: React.ReactNode;
  sizeVariant?: SelectSize;
  variant?: string;
  fullWidth?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  name?: string;
  id?: string;
  containerClassName?: string;
  labelClassName?: string;
  className?: string;
  children?: React.ReactNode;
  dir?: string;
  dropUp?: boolean;
  hidePlaceholderBanner?: boolean;
  placeholderClassName?: string;
}

const sizeStyles: Record<SelectSize, { trigger: string; icon: string; text: string }> = {
  sm: {
    trigger: "px-2.5 py-1 text-xs rounded-md h-8",
    icon: "w-3.5 h-3.5",
    text: "text-xs",
  },
  md: {
    trigger: "px-3 py-1.5 text-sm rounded-md h-9.5",
    icon: "w-4 h-4",
    text: "text-sm",
  },
  lg: {
    trigger: "px-4 py-2.5 text-base rounded-lg h-11",
    icon: "w-5 h-5",
    text: "text-base",
  },
};

export const Select: React.FC<SelectProps> = ({
  label,
  icon,
  options = [],
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "اختر من القائمة...",
  helperText,
  error,
  required = false,
  isRequired,
  leftIcon,
  sizeVariant = "md",
  variant: _variant,
  fullWidth = true,
  searchable = true,
  disabled = false,
  multiple = false,
  clearable: _clearable,
  name = "",
  id: customId,
  containerClassName = "",
  labelClassName = "",
  className = "",
  children,
  dir,
  dropUp,
  hidePlaceholderBanner: _hidePlaceholderBanner,
  placeholderClassName: _placeholderClassName,
}) => {
  const generatedId = useId();
  const selectId = customId || generatedId;

  const effectiveRequired = isRequired !== undefined ? isRequired : required;

  const [internalValue, setInternalValue] = useState<
    string | number | (string | number)[] | undefined
  >(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse options if children (e.g. <option>) passed instead of options array
  const parsedOptions: SelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) return options;
    if (children) {
      const opts: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === "option") {
          const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
          opts.push({
            label: String(props.children || props.value || ""),
            value: String(props.value ?? ""),
            disabled: props.disabled,
          });
        }
      });
      return opts;
    }
    return [];
  }, [options, children]);

  // Selected Option Objects
  const selectedOptions = React.useMemo(() => {
    if (multiple) {
      const valArray = Array.isArray(value)
        ? value.map(String)
        : value !== undefined && value !== null && value !== ""
          ? [String(value)]
          : [];
      return parsedOptions.filter((opt) => valArray.includes(String(opt.value)));
    }
    const singleOpt = parsedOptions.find((opt) => String(opt.value) === String(value));
    return singleOpt ? [singleOpt] : [];
  }, [parsedOptions, value, multiple]);

  const triggerLabelText = React.useMemo(() => {
    if (selectedOptions.length === 0) return placeholder;
    if (multiple) {
      return selectedOptions.map((opt) => opt.label).join("، ");
    }
    return selectedOptions[0]?.label || placeholder;
  }, [selectedOptions, multiple, placeholder]);

  // Filtered Options for Search
  const filteredOptions = parsedOptions.filter((opt) =>
    (opt?.label || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Handle Close on Outside Click
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

  // Auto Focus Search Input on Open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelectOption = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (multiple) {
      const currentValues = Array.isArray(value)
        ? value.map(String)
        : value !== undefined && value !== null && value !== ""
          ? [String(value)]
          : [];
      const optValStr = String(opt.value);
      const exists = currentValues.includes(optValStr);
      const nextValues = exists
        ? currentValues.filter((v) => v !== optValStr)
        : [...currentValues, optValStr];

      if (!isControlled) {
        setInternalValue(nextValues);
      }

      if (onChange) {
        onChange({
          target: { value: nextValues, name },
        } as unknown as React.ChangeEvent<HTMLSelectElement>);
      }
    } else {
      setIsOpen(false);
      if (!isControlled) {
        setInternalValue(opt.value);
      }
      if (onChange) {
        onChange({
          target: { value: opt.value, name },
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      dir={dir}
      className={`relative flex flex-col gap-1 text-right ${
        fullWidth ? "w-full" : ""
      } ${containerClassName}`}
    >
      {label && (
        <label
          htmlFor={selectId}
          className={`text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 ${labelClassName}`}
        >
          {icon && <span className="shrink-0">{icon}</span>}
          {label}
          {effectiveRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      {/* Trigger Control */}
      <div className="relative flex items-center w-full">
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full text-right flex items-center justify-between transition-colors duration-150 outline-none pr-2.5 pl-6 select-none cursor-pointer",
            sizeStyles[sizeVariant].trigger,
            leftIcon && "pl-8",
            disabled
              ? "bg-[#f2f2f2] dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-400 cursor-not-allowed font-medium"
              : error
                ? "bg-white dark:bg-slate-900 border border-red-500 text-gray-800 dark:text-slate-100 focus:border-red-500 focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60"
                : isOpen
                  ? "bg-[#fbfbfb] dark:bg-slate-900 border border-[#7c4a27] dark:border-[#c97a40] text-gray-800 dark:text-slate-100"
                  : "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:border-gray-400 dark:hover:border-slate-600 focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60 focus:border-[#7c4a27] dark:focus:border-[#c97a40]",
            className
          )}
        >
          <span
            className={`truncate ${
              selectedOptions.length > 0
                ? "text-gray-800 dark:text-slate-100 font-normal"
                : "text-gray-400 dark:text-slate-500 font-normal"
            }`}
          >
            {triggerLabelText}
          </span>
        </button>

        {/* Left Caret Arrow Icon matching SVG */}
        <div className="absolute left-2.5 inset-y-0 flex items-center justify-center text-gray-500 dark:text-slate-400 pointer-events-none">
          <DropdownIcon
            className={cn(
              sizeStyles[sizeVariant].icon,
              "transition-transform duration-200",
              isOpen ? (dropUp ? "-rotate-180" : "rotate-180") : ""
            )}
          />
        </div>
      </div>

      {/* Dropdown Popup Menu */}
      {isOpen && !disabled && (
        <div
          className={cn(
            "absolute right-0 z-[99999] min-w-full min-w-[130px] bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 shadow-lg dark:shadow-2xl p-1.5 animate-fadeIn text-right",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
            className?.includes("rounded-none") ? "rounded-none" : "rounded-md"
          )}
        >
          {/* Top Search Input inside Dropdown */}
          {searchable && (
            <div className="relative mb-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في القائمة..."
                className="w-full px-3 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-[#7c4a27] dark:focus:border-[#c97a40] focus:bg-[#fbfbfb] dark:focus:bg-slate-800 text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
            {placeholder && !searchQuery && (
              <div className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium border-b border-gray-100 dark:border-slate-800">
                اختر
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center text-gray-400 dark:text-slate-500">
                لا توجد نتائج مطابقة
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = multiple
                  ? (Array.isArray(value) ? value.map(String) : []).includes(String(opt.value))
                  : String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelectOption(opt)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer select-none",
                      className?.includes("rounded-none") ? "rounded-none" : "rounded",
                      opt.disabled
                        ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500"
                        : isSelected
                          ? "bg-[#4B83F3] text-white font-bold shadow-2xs"
                          : "text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && typeof error === "string" && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">{error}</p>
      )}

      {!error && helperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
};

Select.displayName = "Select";
export default Select;
