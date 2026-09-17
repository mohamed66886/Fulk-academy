"use client";

import * as React from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
          size?: "normal" | "compact";
          hl?: string;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onGoogleRecaptchaLoad?: () => void;
  }
}

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

// Google reCAPTCHA v2 site key registered for academy.fulkegy.com
const DEFAULT_SITE_KEY = "6LcdP8AtAAAAABZ82C6ZBfTA_gbRC65DCpvwnPdM";

export function ReCaptcha({ onVerify, onExpire, className }: ReCaptchaProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<number | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || DEFAULT_SITE_KEY;

  const renderWidget = React.useCallback(() => {
    if (!containerRef.current || !window.grecaptcha || widgetIdRef.current !== null) return;

    try {
      // Clear any prior children in the container to avoid duplicates
      containerRef.current.innerHTML = "";

      const widgetId = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onVerify(token);
        },
        "expired-callback": () => {
          onExpire?.();
        },
        "error-callback": () => {
          setStatus("error");
        },
        hl: "ar",
        theme: "light",
      });

      widgetIdRef.current = widgetId;
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [siteKey, onVerify, onExpire]);

  React.useEffect(() => {
    // 1. If script is already on page and grecaptcha is ready
    if (typeof window !== "undefined" && window.grecaptcha?.render) {
      window.grecaptcha.ready(() => {
        renderWidget();
      });
      return;
    }

    // 2. Otherwise attach script if not already added
    const existingScript = document.getElementById("google-recaptcha-script");
    if (!existingScript) {
      window.onGoogleRecaptchaLoad = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            renderWidget();
          });
        }
      };

      const script = document.createElement("script");
      script.id = "google-recaptcha-script";
      script.src =
        "https://www.google.com/recaptcha/api.js?onload=onGoogleRecaptchaLoad&render=explicit&hl=ar";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setStatus("error");
      };
      document.head.appendChild(script);
    } else {
      // Script tag exists, wait for it
      const interval = setInterval(() => {
        if (window.grecaptcha?.render) {
          clearInterval(interval);
          window.grecaptcha.ready(() => {
            renderWidget();
          });
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  return (
    <div
      className={`w-full flex flex-col items-center justify-center my-3 select-none ${className || ""}`}
    >
      {/* Loading state skeleton while Google loads */}
      {status === "loading" && (
        <div className="w-[304px] h-[78px] rounded-[3px] border border-[#d3d3d3] bg-[#f9f9f9] flex items-center justify-center gap-2 text-xs text-gray-500 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>جاري تحميل reCAPTCHA...</span>
        </div>
      )}

      {/* Actual Google reCAPTCHA container */}
      <div
        ref={containerRef}
        className={status === "loading" ? "hidden" : "flex justify-center w-full"}
      />

      {/* Error state fallback */}
      {status === "error" && (
        <div className="w-full p-3 rounded border border-amber-200 bg-amber-50 text-xs text-amber-800 text-center flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تعذر الاتصال بخوادم Google reCAPTCHA</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              widgetIdRef.current = null;
              renderWidget();
            }}
            className="p-1 hover:bg-amber-100 rounded text-amber-900 transition-colors"
            title="إعادة المحاولة"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
