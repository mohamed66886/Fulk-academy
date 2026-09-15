import React from "react";
import { cn } from "@/lib/utils";

export interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function RTLWrapper({ children, className }: RTLWrapperProps) {
  return (
    <div 
      dir="rtl" 
      className={cn("text-right w-full", className)}
    >
      {children}
    </div>
  );
}