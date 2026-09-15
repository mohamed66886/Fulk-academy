import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, required = false, description, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col space-y-2 text-right", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-bold text-gray-800 flex items-center gap-1 cursor-pointer"
        >
          <span>{label}</span>
          {required && (
            <span className="text-red-500 font-bold text-sm" title="حقل إلزامي">
              *
            </span>
          )}
        </label>
      )}

      <div>{children}</div>

      {description && !error && (
        <p className="text-xs text-gray-500 leading-tight">{description}</p>
      )}

      {error && (
        <p className="text-xs font-semibold text-red-500 leading-tight animate-in fade-in-50">
          {error}
        </p>
      )}
    </div>
  );
}