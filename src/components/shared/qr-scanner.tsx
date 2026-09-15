"use client";

import * as React from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Barcode,
  AlertCircle,
} from "lucide-react";

interface QrScannerProps {
  onScan: (token: string, source: "camera" | "scanner") => void;
  isProcessing?: boolean;
}

export function QrScanner({ onScan, isProcessing = false }: QrScannerProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameras, setCameras] = React.useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = React.useState<string>("");
  const [torchOn, setTorchOn] = React.useState(false);
  const [manualBarcode, setManualBarcode] = React.useState("");

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const cooldownRef = React.useRef(false);
  const containerId = React.useId().replace(/:/g, "_") + "_scanner";

  // Enumerate cameras
  React.useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({
            id: d.id,
            label: d.label || `كاميرا ${devices.indexOf(d) + 1}`,
          }));
          setCameras(list);
          if (!selectedCameraId) {
            setSelectedCameraId(list[0]!.id);
          }
        }
      })
      .catch(() => {
        // Cameras not accessible or blocked
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [selectedCameraId]);

  // Start Scanner
  const startScanner = async (cameraIdToUse?: string) => {
    const camId = cameraIdToUse || selectedCameraId;
    setCameraError(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.88),
            height: Math.floor(minEdge * 0.55),
          };
        },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        camId ? { deviceId: { exact: camId } } : { facingMode: "environment" },
        config,
        (decodedText) => {
          if (cooldownRef.current || isProcessing) return;
          cooldownRef.current = true;
          onScan(decodedText, "camera");

          // Reset cooldown after 1.5s
          setTimeout(() => {
            cooldownRef.current = false;
          }, 1500);
        },
        () => {
          // Ignore transient frame errors
        }
      );

      setIsScanning(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "تعذر تشغيل الكاميرا. تأكد من منح الصلاحيات."
      );
      setIsScanning(false);
    }
  };

  // Stop Scanner
  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const nextTorch = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch } as unknown as MediaTrackConstraintSet],
        });
        setTorchOn(nextTorch);
      } catch {
        // Flashlight not supported
      }
    }
  };

  // Switch Camera
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex]!.id;
    setSelectedCameraId(nextCamId);

    if (isScanning) {
      await startScanner(nextCamId);
    }
  };

  // Manual Barcode scanner input submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim() || isProcessing) return;
    onScan(manualBarcode.trim(), "scanner");
    setManualBarcode("");
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Scanner Card Container */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-surface shadow-md">
        {/* Video stream container */}
        <div className="relative min-h-[300px] flex items-center justify-center bg-slate-950 overflow-hidden">
          <div id={containerId} className="w-full max-w-[340px] overflow-hidden" />

          {/* Overlay viewfinder when scanning */}
          {isScanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-56 w-56 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Laser scan line animation */}
                <div className="absolute top-0 right-0 left-0 h-0.5 bg-primary shadow-[0_0_12px_#3b82f6] animate-pulse" />
                {/* Corner Accents */}
                <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-primary rounded-tr-md" />
                <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-primary rounded-tl-md" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-primary rounded-br-md" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-primary rounded-bl-md" />
              </div>
            </div>
          )}

          {/* Camera offline placeholder */}
          {!isScanning && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 z-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
                <Camera className="h-8 w-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-200">الماسح متوقف حالياً</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  اضغط على زر تشغيل الكاميرا لبدء توجيه كروت الطلاب وتسجيل الحضور الفوري.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => startScanner()}
                className="gap-2 font-bold shadow-md"
              >
                <Camera className="h-4 w-4" />
                <span>تشغيل الكاميرا الآن</span>
              </Button>
            </div>
          )}
        </div>

        {/* Camera Controls Bar */}
        <div className="flex items-center justify-between gap-2 p-3 bg-surface border-t border-border">
          <div className="flex items-center gap-2">
            {isScanning ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={stopScanner}
                className="gap-1.5 font-bold text-xs"
              >
                <CameraOff className="h-4 w-4" />
                <span>إيقاف الكاميرا</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => startScanner()}
                className="gap-1.5 font-bold text-xs"
              >
                <Camera className="h-4 w-4" />
                <span>تشغيل الكاميرا</span>
              </Button>
            )}

            {isScanning && (
              <>
                {cameras.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchCamera}
                    className="h-8 w-8 p-0 text-muted hover:text-text"
                    title="تبديل الكاميرا"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleTorch}
                  className={`h-8 w-8 p-0 ${torchOn ? "text-primary border-primary" : "text-muted"}`}
                  title={torchOn ? "إطفاء الفلاش" : "تشغيل الفلاش"}
                >
                  {torchOn ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>

          <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
            <span
              className={`h-2 w-2 rounded-full ${isScanning ? "bg-success animate-ping" : "bg-muted"}`}
            />
            <span>{isScanning ? "الماسح متصل ونشط" : "جاهز للتشغيل"}</span>
          </span>
        </div>
      </div>

      {/* Error banner if camera permission failed */}
      {cameraError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{cameraError}</p>
        </div>
      )}

      {/* USB / Laser Barcode Scanner Input Form */}
      <form
        onSubmit={handleBarcodeSubmit}
        className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface/50"
      >
        <div className="flex items-center gap-2 text-muted shrink-0 pr-1">
          <Barcode className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold text-text hidden sm:inline">
            ماسح الباركود الخارجي (USB):
          </span>
        </div>
        <div className="relative flex-1">
          <Input
            placeholder="امسح بالباركود الليزر أو الصق كود الطالب واضغط Enter..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            disabled={isProcessing}
            className="text-xs font-mono pl-8"
            dir="ltr"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={!manualBarcode.trim() || isProcessing}
          className="font-bold text-xs shrink-0"
        >
          <span>تسجيل</span>
        </Button>
      </form>
    </div>
  );
}
