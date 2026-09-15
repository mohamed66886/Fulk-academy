"use client";

import * as React from "react";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: "success", message, description }),
  error: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: "error", message, description }),
  warning: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: "warning", message, description }),
  info: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: "info", message, description }),
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-50 flex max-w-md flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2",
              {
                "bg-surface border-success/30 text-text": t.type === "success",
                "bg-surface border-danger/30 text-text": t.type === "error",
                "bg-surface border-warning/30 text-text": t.type === "warning",
                "bg-surface border-primary/30 text-text": t.type === "info",
              }
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5 text-danger" />}
              {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-warning" />}
              {t.type === "info" && <Info className="h-5 w-5 text-primary" />}
            </div>

            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-semibold">{t.message}</p>
              {t.description && (
                <p className="text-xs text-muted leading-relaxed">{t.description}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="rounded p-1 text-muted hover:bg-secondary hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
