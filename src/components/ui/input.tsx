"use client";

import React, { useId } from "react";
import { X } from "lucide-react";
import { GridIcon, WandIcon } from "./InputActionIcon";
import { DatePicker } from "./DatePicker";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "boxed" | "underline";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string | boolean;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  sizeVariant?: InputSize;
  fullWidth?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  actionIconType?: "grid" | "wand";
  actionIcon?: React.ReactNode;
  onActionClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  actionPosition?: "left" | "right";
  actionTitle?: string;
  containerClassName?: string;
  labelClassName?: string;

  // Compatibility props
  variant?: InputVariant | string;
  data?: Record<string, unknown>;
  setData?: (data: unknown) => void;
  errors?: Record<string, string | undefined>;
  visible?: boolean;
  returnInputRef?: (ref: React.RefObject<HTMLInputElement | null>) => void;
  inputProps?: Record<string, unknown>;
  isRequired?: boolean;
  isDisabled?: boolean;
  togglePassword?: boolean;
}

const sizeStyles: Record<InputSize, { input: string; icon: string }> = {
  sm: {
    input: "px-2.5 py-1 text-xs rounded-md h-8",
    icon: "w-3.5 h-3.5",
  },
  md: {
    input: "px-3 py-1.5 text-sm rounded-md h-9.5",
    icon: "w-4 h-4",
  },
  lg: {
    input: "px-4 py-2.5 text-base rounded-lg h-11",
    icon: "w-5 h-5",
  },
};

const renderIcon = (iconNode: React.ReactNode | React.ElementType, defaultClassName?: string) => {
  if (!iconNode) return null;
  if (React.isValidElement(iconNode)) return iconNode;
  if (
    typeof iconNode === "function" ||
    (typeof iconNode === "object" &&
      iconNode !== null &&
      ("render" in iconNode || "$$typeof" in iconNode))
  ) {
    const Component = iconNode as React.ElementType;
    return <Component className={defaultClassName} />;
  }
  if (typeof iconNode === "string" || typeof iconNode === "number") {
    return iconNode;
  }
  return null;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      required = false,
      isRequired,
      leftIcon: leftIconProp,
      rightIcon,
      icon,
      sizeVariant = "md",
      fullWidth = true,
      clearable = false,
      onClear,
      actionIconType = "grid",
      actionIcon,
      onActionClick,
      actionPosition = "left",
      actionTitle = "تنفيذ إجراء",
      containerClassName = "",
      labelClassName = "",
      className = "",
      value,
      disabled = false,
      isDisabled,
      id: customId,
      onChange,
      variant: _variant,
      data: _data,
      setData: _setData,
      errors,
      visible = true,
      returnInputRef: _returnInputRef,
      inputProps: _inputProps,
      togglePassword: _togglePassword,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    if (visible === false) return null;

    if (props.type === "date") {
      const { type: _type, min, max, ...restProps } = props;

      const isFieldDisabled = disabled || isDisabled;
      const isFieldRequired = required || isRequired;
      const effectiveError =
        typeof error === "string" ? error : errors && props.name ? errors[props.name] : undefined;
      const minDate = typeof min === "string" ? min : undefined;
      const maxDate = typeof max === "string" ? max : undefined;

      return (
        <DatePicker
          ref={ref}
          id={customId || generatedId}
          label={label}
          helperText={helperText}
          error={effectiveError}
          required={isFieldRequired}
          disabled={isFieldDisabled}
          sizeVariant={sizeVariant}
          fullWidth={fullWidth}
          clearable={clearable}
          onClear={onClear}
          containerClassName={containerClassName}
          labelClassName={labelClassName}
          className={className}
          minDate={minDate}
          maxDate={maxDate}
          leftIcon={leftIconProp || icon}
          rightIcon={rightIcon}
          value={value !== undefined && value !== null ? String(value) : undefined}
          onChange={onChange}
          {...restProps}
        />
      );
    }

    const isFieldDisabled = disabled || isDisabled;
    const isFieldRequired = required || isRequired;
    const inputId = customId || generatedId;
    const hasValue = value !== undefined && value !== null && value !== "";
    const leftIcon = leftIconProp || icon;

    let defaultIcon: React.ReactNode = null;
    if (onActionClick) {
      const iconClass = sizeStyles[sizeVariant].icon;
      if (actionIconType === "wand") {
        defaultIcon = <WandIcon className={iconClass} />;
      } else {
        defaultIcon = <GridIcon className={iconClass} />;
      }
    }

    const activeIcon = actionIcon || defaultIcon;
    const hasLeftAction = activeIcon && actionPosition === "left";
    const hasRightAction = activeIcon && actionPosition === "right";

    return (
      <div
        className={`flex flex-col gap-1 text-right ${
          fullWidth ? "w-full" : ""
        } ${containerClassName}`}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={`text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 ${labelClassName}`}
          >
            {label}
            {isFieldRequired && <span className="text-red-500 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {/* Left Icon or Left Action Button */}
          {hasLeftAction ? (
            <button
              type="button"
              onClick={onActionClick}
              disabled={isFieldDisabled}
              title={actionTitle}
              className="absolute left-2.5 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-[#7c4a27] dark:text-gray-400 dark:hover:text-[#e09153] bg-transparent transition-colors focus:outline-none z-10 cursor-pointer"
            >
              {activeIcon}
            </button>
          ) : leftIcon ? (
            <div className="absolute left-2.5 inset-y-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pointer-events-none">
              {renderIcon(leftIcon, sizeStyles[sizeVariant].icon)}
            </div>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            value={value}
            disabled={isFieldDisabled}
            onChange={onChange}
            className={`w-full text-right transition-colors duration-150 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 font-normal
              ${sizeStyles[sizeVariant].input}
              ${leftIcon || hasLeftAction ? "pl-8" : ""}
              ${rightIcon || hasRightAction || (clearable && hasValue) ? "pr-8" : ""}
              ${
                isFieldDisabled
                  ? "bg-[#f2f2f2] dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-400 cursor-not-allowed font-medium"
                  : error
                    ? "bg-white dark:bg-slate-900 border border-red-500 text-gray-800 dark:text-slate-100 focus:border-red-500 focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60"
                    : "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-100 focus:border-[#7c4a27] dark:focus:border-[#c97a40] focus:bg-[#fbfbfb] dark:focus:bg-slate-800/60"
              }
              ${className}`}
            {...props}
          />

          {/* Clear Button */}
          {clearable && hasValue && !isFieldDisabled && (
            <button
              type="button"
              onClick={onClear}
              className={`absolute inset-y-0 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 cursor-pointer ${
                hasLeftAction ? "left-9" : "left-2.5"
              }`}
              tabIndex={-1}
            >
              <X className={sizeStyles[sizeVariant].icon} />
            </button>
          )}

          {/* Right Icon or Right Action Button */}
          {hasRightAction ? (
            <button
              type="button"
              onClick={onActionClick}
              disabled={isFieldDisabled}
              title={actionTitle}
              className="absolute right-2.5 inset-y-0 my-auto flex items-center justify-center text-gray-500 hover:text-[#7c4a27] dark:text-gray-400 dark:hover:text-[#e09153] bg-transparent transition-colors focus:outline-none z-10 cursor-pointer"
            >
              {activeIcon}
            </button>
          ) : rightIcon && !clearable ? (
            <div className="absolute right-3 inset-y-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pointer-events-none">
              {renderIcon(rightIcon, sizeStyles[sizeVariant].icon)}
            </div>
          ) : null}
        </div>

        {error && typeof error === "string" && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5">{error}</p>
        )}

        {!error && helperText && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input as InputField };
export default Input;
