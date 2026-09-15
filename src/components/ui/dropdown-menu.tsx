"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={containerRef} className="relative inline-block text-right">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  return (
    <div
      onClick={() => context.setIsOpen((prev) => !prev)}
      className={cn("inline-flex cursor-pointer", className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu");
  if (!context.isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 text-gray-800 shadow-lg animate-in fade-in-80",
        {
          "right-0": align === "start",
          "left-0": align === "end",
          "left-1/2 -translate-x-1/2": align === "center",
        },
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
}

export function DropdownMenuItem({
  className,
  variant = "default",
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const context = React.useContext(DropdownContext);
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    context?.setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "default"
          ? "hover:bg-gray-50 text-gray-700 focus:bg-gray-50"
          : "text-red-600 hover:bg-red-50 focus:bg-red-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1.5 my-1.5 h-px bg-gray-100", className)} />;
}
