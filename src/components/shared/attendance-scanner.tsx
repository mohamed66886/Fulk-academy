"use client";

import * as React from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Barcode,
  Radio,
  Keyboard,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Zap,
  ZoomIn,
} from "lucide-react";

export type ScannerMode = "camera" | "external";
type EngineMode = "native" | "fallback" | "none";

interface AttendanceScannerProps {
  onScan: (token: string, source: "camera" | "scanner") => void;
  isProcessing?: boolean;
  isOnline?: boolean;
}

// ==========================================
// ZERO-LATENCY PRE-WARMED AUDIO SYNTHESIZER
// ==========================================
let sharedAudioCtx: AudioContext | null = null;

function playInstantChime() {
  try {
    if (!sharedAudioCtx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx) {
      if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume();
      }
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = "sine";
      // Crisp professional 1350Hz high-tech scanner tone
      osc.frequency.setValueAtTime(1350, sharedAudioCtx.currentTime);
      gain.gain.setValueAtTime(0.4, sharedAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, sharedAudioCtx.currentTime + 0.075);
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start();
      osc.stop(sharedAudioCtx.currentTime + 0.075);
    }
  } catch {
    // Ignore audio autoplay errors
  }

  // Haptic feedback for mobile devices
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(35);
    }
  } catch {
    // Ignore haptic errors
  }
}

export function AttendanceScanner({
  onScan,
  isProcessing = false,
  isOnline = true,
}: AttendanceScannerProps) {
  const [mode, setMode] = React.useState<ScannerMode>("camera");

  // Camera States
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameras, setCameras] = React.useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = React.useState<string>("");
  const [torchOn, setTorchOn] = React.useState(false);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [zoomSupported, setZoomSupported] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [engineMode, setEngineMode] = React.useState<EngineMode>("none");
  const [scanFlash, setScanFlash] = React.useState(false);

  // External Scanner States
  const [manualInput, setManualInput] = React.useState("");
  const externalInputRef = React.useRef<HTMLInputElement>(null);

  // References
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const activeLoopRef = React.useRef<(() => void) | null>(null);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const flashTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Smart Per-Token Anti-Freeze Debounce Ref
  const lastScannedRef = React.useRef<{ token: string; time: number }>({
    token: "",
    time: 0,
  });

  // Keystroke accumulator for external hardware scanner
  const keyBufferRef = React.useRef<string>("");
  const lastKeyTimeRef = React.useRef<number>(0);

  // 1. Smart Scan Dispatcher (Zero Delay for New Tokens, Smart Debounce for Same Token)
  const handleDetectedCode = React.useCallback(
    (rawToken: string, source: "camera" | "scanner" = "camera") => {
      const clean = rawToken.trim();
      if (!clean) return;

      const now = Date.now();
      const last = lastScannedRef.current;

      // If exactly the same token was detected in the last 2000ms, ignore duplicate
      if (last.token === clean && now - last.time < 2000) {
        return;
      }

      // Anti-jitter: ignore micro frame bursts within 100ms
      if (now - last.time < 100) {
        return;
      }

      lastScannedRef.current = { token: clean, time: now };

      // Instant Audio & Haptic Feedback in 0ms
      playInstantChime();

      // Instant visual feedback
      setScanFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setScanFlash(false);
      }, 300);

      // Call onScan immediately
      onScan(clean, source);
    },
    [onScan]
  );

  // ==========================================
  // HARDWARE DETECTION & DEVICE ENUMERATION
  // ==========================================
  React.useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      try {
        if (!navigator?.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");

        if (isMounted && videoDevices.length > 0) {
          const mapped = videoDevices.map((d, idx) => ({
            id: d.deviceId,
            label: d.label || `كاميرا ${idx + 1}`,
          }));
          setCameras(mapped);

          // Find back/environment camera by default
          const backCam = mapped.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : mapped[0]?.id || "");
        }
      } catch {
        // Permission not yet granted
      }
    }

    if (mode === "camera") {
      loadDevices();
    }

    return () => {
      isMounted = false;
    };
  }, [mode]);

  // ==========================================
  // STOP CAMERA ENGINE
  // ==========================================
  const stopCamera = React.useCallback(async () => {
    // 1. Cancel native frame loop
    if (activeLoopRef.current) {
      activeLoopRef.current();
      activeLoopRef.current = null;
    }

    // 2. Stop MediaStream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 3. Stop fallback Html5Qrcode if running
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore html5-qrcode stop errors
      }
    }

    setIsCameraActive(false);
    setIsLoadingCamera(false);
    setTorchOn(false);
    setEngineMode("none");
  }, []);

  // ==========================================
  // START FALLBACK ENGINE (Html5Qrcode Turbo)
  // ==========================================
  const startFallbackEngine = React.useCallback(
    async (camId?: string) => {
      try {
        setEngineMode("fallback");
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("attendance-reader-container", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
            verbose: false,
          });
        }

        const cameraConfig = camId ? { deviceId: { exact: camId } } : { facingMode: "environment" };

        await scannerRef.current.start(
          cameraConfig,
          {
            fps: 30, // High frame rate
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => {
            handleDetectedCode(decodedText, "camera");
          },
          () => {
            // Frame search error - ignore
          }
        );

        setIsCameraActive(true);
        setIsLoadingCamera(false);
      } catch (err) {
        console.error("Fallback scanner error:", err);
        setCameraError("تعذر تشغيل الكاميرا. يرجى التأكد من صلاحية الوصول للكاميرا.");
        setIsCameraActive(false);
        setIsLoadingCamera(false);
      }
    },
    [handleDetectedCode]
  );

  // ==========================================
  // START NATIVE HARDWARE ENGINE (BarcodeDetector 60 FPS)
  // ==========================================
  const startCamera = React.useCallback(
    async (cameraIdToUse?: string) => {
      setIsLoadingCamera(true);
      setCameraError(null);

      try {
        const camId = cameraIdToUse || selectedCameraId;

        // Check if Native BarcodeDetector is truly supported and functional
        let isNativeSupported = false;
        try {
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            const testDetector = new BarcodeDetector({ formats: ["qr_code", "code_128"] });
            if (testDetector) {
              isNativeSupported = true;
            }
          }
        } catch {
          isNativeSupported = false;
        }

        if (!isNativeSupported) {
          // Launch Turbo Fallback directly
          return await startFallbackEngine(camId);
        }

        // Get video stream safely with ideal constraints
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: camId
            ? { deviceId: { exact: camId } }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;

        const videoEl = videoRef.current;
        if (!videoEl) {
          // If video element is somehow not mounted, fallback
          return await startFallbackEngine(camId);
        }

        videoEl.srcObject = stream;
        videoEl.setAttribute("playsinline", "true");
        videoEl.muted = true;

        try {
          await videoEl.play();
        } catch {
          // Play interrupted or pending user interaction
        }

        // Check track capabilities (Continuous Focus, Zoom, Torch)
        const track = stream.getVideoTracks()[0];
        if (track) {
          // Apply continuous autofocus if supported
          try {
            await (
              track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }
            ).applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          } catch {
            // Ignore focus mode if not supported
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const caps = (track as any).getCapabilities ? (track as any).getCapabilities() : null;
          if (caps) {
            if (caps.zoom) {
              setZoomSupported(true);
            }
            if (caps.torch) {
              setTorchSupported(true);
            }
          }
        }

        // Prepare formats for BarcodeDetector
        let formats = ["code_128", "code_39", "ean_13", "qr_code", "upc_a", "upc_e", "itf"];
        if (typeof BarcodeDetector.getSupportedFormats === "function") {
          try {
            const availableFormats = await BarcodeDetector.getSupportedFormats();
            formats = formats.filter((f) => availableFormats.includes(f));
          } catch {
            // Keep default formats
          }
        }

        const detector = new BarcodeDetector({ formats });
        setEngineMode("native");
        setIsCameraActive(true);
        setIsLoadingCamera(false);

        // Run 60 FPS Native Detection Loop via requestVideoFrameCallback or requestAnimationFrame
        let isActive = true;
        activeLoopRef.current = () => {
          isActive = false;
        };

        let isFrameBusy = false;

        const frameCallback = async () => {
          if (!isActive) return;

          if (
            videoEl &&
            !videoEl.paused &&
            !videoEl.ended &&
            videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            if (!isFrameBusy) {
              isFrameBusy = true;
              try {
                const barcodes = await detector.detect(videoEl);
                if (barcodes && barcodes.length > 0) {
                  for (const b of barcodes) {
                    if (b.rawValue && b.rawValue.trim()) {
                      handleDetectedCode(b.rawValue.trim(), "camera");
                      break;
                    }
                  }
                }
              } catch {
                // Ignore single frame detect glitch
              } finally {
                isFrameBusy = false;
              }
            }
          }

          if (isActive) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (videoEl && "requestVideoFrameCallback" in videoEl) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (videoEl as any).requestVideoFrameCallback(frameCallback);
            } else {
              requestAnimationFrame(frameCallback);
            }
          }
        };

        // Trigger loop
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ("requestVideoFrameCallback" in videoEl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (videoEl as any).requestVideoFrameCallback(frameCallback);
        } else {
          requestAnimationFrame(frameCallback);
        }
      } catch (err) {
        console.warn("Native scanner init failed, attempting fallback:", err);
        await startFallbackEngine(cameraIdToUse || selectedCameraId);
      }
    },
    [selectedCameraId, handleDetectedCode, startFallbackEngine]
  );

  // Auto-start camera when entering camera mode
  React.useEffect(() => {
    let isMounted = true;
    if (mode === "camera") {
      const timer = setTimeout(() => {
        if (isMounted && !isCameraActive) {
          startCamera();
        }
      }, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      stopCamera();
    }
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Clean up camera on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ==========================================
  // CAMERA CONTROLS (ZOOM, TORCH, SWITCH)
  // ==========================================
  const handleSwitchCamera = React.useCallback(() => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    if (!nextCam) return;
    const nextCamId = nextCam.id;
    setSelectedCameraId(nextCamId);
    stopCamera().then(() => {
      startCamera(nextCamId);
    });
  }, [cameras, selectedCameraId, stopCamera, startCamera]);

  const toggleTorch = React.useCallback(async () => {
    const nextTorch = !torchOn;
    if (engineMode === "native" && mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
          setTorchOn(nextTorch);
        } catch {
          setTorchOn(false);
        }
      }
    } else if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.applyVideoConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchOn(nextTorch);
      } catch {
        setTorchOn(false);
      }
    }
  }, [torchOn, engineMode]);

  const handleSetZoom = React.useCallback(async (level: number) => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (track as any).applyConstraints({ advanced: [{ zoom: level }] });
          setZoomLevel(level);
        } catch {
          // Ignore zoom constraint errors on unsupported devices
        }
      }
    }
  }, []);

  // ==========================================
  // EXTERNAL HARDWARE BARCODE SCANNER LISTENER
  // ==========================================
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (mode !== "external") return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 100) {
        keyBufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (keyBufferRef.current.trim()) {
          handleDetectedCode(keyBufferRef.current.trim(), "scanner");
        }
        keyBufferRef.current = "";
        return;
      }

      if (e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [mode, handleDetectedCode]);

  const handleExternalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && manualInput.trim()) {
      handleDetectedCode(manualInput.trim(), "scanner");
      setManualInput("");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl shadow-primary/5">
      {/* Mode Selector Tabs */}
      <div className="p-2 sm:p-3" dir="rtl">
        <div className="flex rounded-2xl bg-surface-raised p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all duration-300 ${
              mode === "camera"
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                : "text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">كاميرا الهاتف / اللابتوب</span>
            <span className="sm:hidden">كاميرا الهاتف</span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
              <Zap className="h-3 w-3 fill-emerald-300" />
              سريع جداً
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("external")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all duration-300 ${
              mode === "external"
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                : "text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Barcode className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>ماسح باركود خارجي</span>
          </button>
        </div>
      </div>

      {/* Camera View */}
      {mode === "camera" && (
        <div className="relative flex flex-col p-2 sm:p-3 pt-0" dir="ltr">
          <div
            className={`relative w-full h-[52vh] min-h-[380px] sm:min-h-[460px] max-h-[520px] overflow-hidden rounded-2xl bg-slate-950 shadow-inner transition-all duration-200 ${
              scanFlash ? "ring-4 ring-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.7)]" : ""
            }`}
          >
            {/* Native 60 FPS Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                engineMode === "native" && isCameraActive
                  ? "opacity-100 z-10"
                  : "opacity-0 -z-10 pointer-events-none"
              }`}
            />

            {/* Fallback Html5Qrcode Container - Must remain in DOM with dimensions */}
            <div
              id="attendance-reader-container"
              className={`absolute inset-0 w-full h-full overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover transition-opacity duration-300 ${
                engineMode === "fallback" && isCameraActive
                  ? "opacity-100 z-10"
                  : "opacity-0 -z-10 pointer-events-none"
              }`}
            />

            {/* Active Scanning Overlay & Laser Sweep */}
            {isCameraActive && (
              <>
                {/* Visual Target Reticle Corners */}
                <div className="pointer-events-none absolute inset-6 sm:inset-10 border border-white/20 rounded-2xl z-20">
                  {/* Top-Left */}
                  <div className="absolute -top-1 -left-1 h-8 w-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  {/* Top-Right */}
                  <div className="absolute -top-1 -right-1 h-8 w-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  {/* Bottom-Left */}
                  <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  {/* Bottom-Right */}
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                  {/* High-Tech Sweep Laser Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_4px_rgba(52,211,153,0.9)] animate-bounce" />
                </div>

                {/* Engine Badge & Guidance Banner */}
                <div
                  className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10 shadow-lg z-20"
                  dir="rtl"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>
                    {engineMode === "native"
                      ? "⚡ مسح عتادي فائق (60 FPS - استجابة فورية)"
                      : "⚡ مسح عالي السرعة (Turbo 30 FPS)"}
                  </span>
                </div>

                {/* Instant Success Flash Notification Overlay */}
                {scanFlash && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[2px] transition-all z-30">
                    <div className="rounded-2xl bg-emerald-600/90 px-6 py-3 font-black text-white shadow-2xl scale-110 transition-transform">
                      ✓ تم الرصد فوراً!
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading Camera State */}
            {isLoadingCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-20 backdrop-blur-sm space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Zap className="h-6 w-6 text-primary absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1" dir="rtl">
                  <h4 className="text-sm font-black text-white">
                    جاري تشغيل الكاميرا فائقة السرعة...
                  </h4>
                  <p className="text-xs text-slate-400">
                    يرجى السماح بالوصول للكاميرا إذا طُلب منك المتصفح
                  </p>
                </div>
              </div>
            )}

            {/* Inactive / Stopped Camera Placeholder */}
            {!isCameraActive && !isLoadingCamera && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised p-6 text-center z-20">
                <div className="mb-4 rounded-3xl bg-primary/10 p-5 text-primary shadow-inner">
                  <Camera className="h-10 w-10" />
                </div>
                <h3 className="mb-1 text-base font-black text-text">الكاميرا جاهزة للعمل الخاطف</h3>
                <p className="mb-6 text-xs text-muted max-w-xs leading-relaxed">
                  تمت ترقية الكاميرا لتقنية المعالجة العتادية المباشرة (60 إطار في الثانية) لقراءة
                  الباركود وكروت الطلاب في أقل من 0.1 ثانية.
                </p>
                <Button
                  onClick={() => startCamera()}
                  className="gap-2 rounded-xl px-8 py-3.5 shadow-xl font-bold text-sm"
                  dir="rtl"
                >
                  <Zap className="h-4 w-4 fill-white" />
                  تشغيل الكاميرا الآن
                </Button>
              </div>
            )}

            {/* Camera Error View */}
            {cameraError && !isLoadingCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised p-6 text-center z-20">
                <div className="mb-4 rounded-full bg-danger/10 p-4 text-danger">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="mb-1 font-bold text-text">تعذر تشغيل الكاميرا</h3>
                <p className="text-xs text-muted max-w-xs mb-4">{cameraError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startCamera()}
                  className="gap-2 rounded-xl"
                  dir="rtl"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </Button>
              </div>
            )}

            {/* Floating Camera Toolbar */}
            {isCameraActive && (
              <div
                className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 z-20"
                dir="rtl"
              >
                <div className="flex items-center gap-2 rounded-2xl bg-black/70 p-2 backdrop-blur-md border border-white/10 shadow-2xl">
                  {/* Stop Camera */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopCamera}
                    className="h-10 rounded-xl bg-danger/20 text-white hover:bg-danger/40 hover:text-white"
                    title="إيقاف الكاميرا"
                  >
                    <CameraOff className="h-4 w-4" />
                  </Button>

                  {/* Switch Camera */}
                  {cameras.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSwitchCamera}
                      className="h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-white gap-2 px-3 text-xs font-bold"
                    >
                      <SwitchCamera className="h-4 w-4" />
                      <span>تبديل</span>
                    </Button>
                  )}

                  {/* Hardware Zoom Toggle (if supported) */}
                  {zoomSupported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetZoom(zoomLevel === 1 ? 2 : 1)}
                      className="h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-white gap-1.5 px-3 text-xs font-mono font-bold"
                    >
                      <ZoomIn className="h-4 w-4" />
                      <span>{zoomLevel === 1 ? "1x" : "2x"}</span>
                    </Button>
                  )}

                  {/* Flashlight / Torch */}
                  {(torchSupported || engineMode === "fallback") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTorch}
                      className={`h-10 rounded-xl px-3.5 text-white hover:text-white gap-1.5 text-xs font-bold ${
                        torchOn
                          ? "bg-warning/90 hover:bg-warning text-black"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {torchOn ? (
                        <FlashlightOff className="h-4 w-4 text-black" />
                      ) : (
                        <Flashlight className="h-4 w-4" />
                      )}
                      <span>{torchOn ? "إطفاء الكشاف" : "إضاءة"}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* External Laser Barcode Scanner Mode */}
      {mode === "external" && (
        <div className="flex flex-col p-4 sm:p-6 space-y-6" dir="rtl">
          <div
            onClick={() => externalInputRef.current?.focus()}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-surface p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white shadow-xl shadow-primary/30 transition-transform group-hover:scale-105">
                <Barcode className="h-10 w-10" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-text flex items-center justify-center gap-2">
                  الماسح الخارجي متصل وجاهز للإدخال الفوري
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  وجّه مسدس الباركود نحو كارت الطالب واضغط الزر. سيتم رصد الكود وتثبيت الحضور فوراً
                  وبدون أي تأخير.
                </p>
              </div>

              <div className="pt-3">
                <Badge variant="success" className="px-4 py-1.5 text-xs font-bold gap-2 shadow-sm">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  الاستماع النشط فائق السرعة مفعل
                </Badge>
              </div>
            </div>

            <input
              ref={externalInputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={handleExternalInputKeyDown}
              className="absolute -top-96 left-0 opacity-0 pointer-events-none"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5 text-primary" />
                إدخال يدوي للإختبار
              </span>
            </div>

            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <input
                type="text"
                placeholder="ألصق كود الطالب هنا..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleExternalInputKeyDown}
                className="flex-1 bg-transparent px-3 py-1.5 text-sm font-mono text-text outline-none placeholder:font-sans placeholder:text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (manualInput.trim()) {
                    handleDetectedCode(manualInput.trim(), "scanner");
                    setManualInput("");
                  }
                }}
                disabled={!manualInput.trim()}
                className="rounded-lg px-4 gap-2 font-bold"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : "إرسال"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div
          className="border-t border-warning/20 bg-warning/10 px-4 py-3 text-center text-xs font-bold text-warning-dark flex items-center justify-center gap-2 rounded-b-[2rem]"
          dir="rtl"
        >
          <WifiOff className="h-4 w-4" />
          النظام يعمل بدون إنترنت (سيتم المزامنة محلياً بسرعة فائقة)
        </div>
      )}
    </div>
  );
}
