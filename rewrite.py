import re

file = 'src/components/shared/attendance-scanner.tsx'
with open(file, 'r') as f:
    content = f.read()

parts = content.split("isMounted = false;\n    };\n  }, [mode]);")
if len(parts) == 2:
    header = parts[0] + "isMounted = false;\n    };\n  }, [mode]);\n"
else:
    parts = content.split("isMounted = false;")
    header = parts[0] + "isMounted = false;\n    };\n  }, [mode]);\n"

body = """
  const startCamera = React.useCallback(
    async (cameraIdToUse?: string) => {
      try {
        setCameraError(null);
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("attendance-reader-container", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
          });
        }

        const camId = cameraIdToUse || selectedCameraId;
        const config: any = {
          fps: 20,
          disableFlip: false,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return {
              width: Math.floor(viewfinderWidth * 0.95),
              height: Math.floor(viewfinderHeight * 0.5),
            };
          },
        };

        const cameraConfig = camId ? { deviceId: { exact: camId } } : { facingMode: "environment" };

        await scannerRef.current.start(
          cameraConfig,
          config,
          (decodedText) => {
            if (isCooldownRef.current || isProcessing) return;

            isCooldownRef.current = true;
            processScan(decodedText, "camera");

            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = setTimeout(() => {
              isCooldownRef.current = false;
            }, 1500);
          },
          () => {
            // Frame search callback - ignore
          }
        );

        setIsCameraActive(true);
      } catch (err: unknown) {
        console.error("Camera start error:", err);
        setCameraError("تعذر تشغيل الكاميرا. يرجى التحقق من الأذونات.");
        setIsCameraActive(false);
      }
    },
    [selectedCameraId, isProcessing, processScan]
  );

  const stopCamera = React.useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error("Error stopping camera", err);
    } finally {
      setIsCameraActive(false);
      setTorchOn(false);
    }
  }, []);

  const handleSwitchCamera = React.useCallback(() => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    stopCamera().then(() => {
      startCamera(nextCamId);
    });
  }, [cameras, selectedCameraId, stopCamera, startCamera]);

  const toggleTorch = React.useCallback(() => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    const newTorchState = !torchOn;
    scannerRef.current
      .applyVideoConstraints({ advanced: [{ torch: newTorchState } as any] })
      .then(() => setTorchOn(newTorchState))
      .catch(() => setTorchOn(false));
  }, [torchOn]);

  React.useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

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
          processScan(keyBufferRef.current.trim(), "scanner");
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
  }, [mode, processScan]);

  const handleExternalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && manualInput.trim()) {
      processScan(manualInput.trim(), "scanner");
      setManualInput("");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl shadow-primary/5">
      {/* Premium Mode Selector Tabs */}
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
            ماسح باركود خارجي
          </button>
        </div>
      </div>

      {/* Camera Mode View */}
      {mode === "camera" && (
        <div className="relative flex flex-col p-2 sm:p-3 pt-0" dir="ltr">
          <div className="relative overflow-hidden rounded-2xl bg-black shadow-inner">
            <div
              id="attendance-reader-container"
              className="w-full h-[60vh] max-h-[500px] object-cover [&>video]:object-cover"
            />
            
            {isCameraActive && (
              <>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-primary/40 shadow-[0_0_20px_4px_var(--color-primary)]" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/10" dir="rtl">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                  </span>
                  وجّه الكاميرا نحو الباركود
                </div>
              </>
            )}

            {!isCameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised p-6 text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                  <Camera className="h-8 w-8" />
                </div>
                <h3 className="mb-1 font-bold text-text">الكاميرا متوقفة</h3>
                <p className="mb-6 text-xs text-muted">يرجى تشغيل الكاميرا لبدء مسح كروت الطلاب</p>
                <Button onClick={() => startCamera()} className="gap-2 rounded-xl px-8 shadow-lg font-bold" dir="rtl">
                  <Camera className="h-4 w-4" />
                  تشغيل الكاميرا الآن
                </Button>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised p-6 text-center">
                <div className="mb-4 rounded-full bg-danger/10 p-4 text-danger">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="mb-1 font-bold text-text">تعذر تشغيل الكاميرا</h3>
                <p className="text-xs text-muted max-w-xs">{cameraError}</p>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4" dir="rtl">
                <div className="flex items-center gap-2 rounded-2xl bg-black/40 p-2 backdrop-blur-md border border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopCamera}
                    className="h-10 rounded-xl bg-danger/20 text-white hover:bg-danger/40 hover:text-white"
                  >
                    <CameraOff className="h-4 w-4" />
                  </Button>

                  {cameras.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSwitchCamera}
                      className="h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:text-white gap-2 px-4"
                    >
                      <SwitchCamera className="h-4 w-4" />
                      <span className="text-xs font-bold">تبديل</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTorch}
                    className={`h-10 rounded-xl px-4 text-white hover:text-white gap-2 text-xs font-bold ${
                      torchOn ? "bg-warning/80 hover:bg-warning" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                    <span className="hidden sm:inline">{torchOn ? "إطفاء الكشاف" : "إضاءة"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  الماسح الخارجي متصل وجاهز للإدخال
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  قم بتوجيه مسدس الباركود نحو كارت الطالب واضغط الزر. سيتم رصد الكود وتثبيت الحضور فوراً وبدون أي تدخل إضافي.
                </p>
              </div>

              <div className="pt-3">
                <Badge
                  variant="success"
                  className="px-4 py-1.5 text-xs font-bold gap-2 shadow-sm"
                >
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  الاستماع النشط (Auto-Detect) مفعل
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
                    processScan(manualInput.trim(), "scanner");
                    setManualInput("");
                  }
                }}
                disabled={!manualInput.trim() || isProcessing}
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
          النظام يعمل بدون إنترنت (سيتم المزامنة لاحقاً)
        </div>
      )}
    </div>
  );
}
"""

with open(file, 'w') as f:
    f.write(header + body)

