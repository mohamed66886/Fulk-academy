"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  getTodayAttendanceInfo,
  getOrCreateAttendanceSession,
  recordAttendanceScan,
  recordManualAttendance,
  completeAttendanceSession,
  type TodayAttendanceInfo,
  type SessionActiveDetails,
  type ScanResultResponse,
  type SessionRecordItem,
} from "@/lib/actions/attendance";
import { soundEffects } from "@/lib/utils/sound";
import { formatArabicTime, formatISOTimeToCairo } from "@/lib/utils/date";

const AttendanceScanner = dynamic(
  () => import("@/components/shared/attendance-scanner").then((mod) => mod.AttendanceScanner),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex flex-col items-center justify-center rounded-2xl bg-surface border border-border animate-pulse gap-3 text-muted">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs">جاري تجهيز ماسح الباركود والكمبيوتر...</p>
      </div>
    ),
  }
);
import {
  enqueueOfflineScan,
  getPendingScansCount,
  syncOfflineQueue,
} from "@/lib/offline/attendanceQueue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock3,
  UserCheck,
  UserPlus,
  Play,
  ArrowRight,
  Layers,
  Search,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

function AttendanceContent() {
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId");

  // Page level state
  const [todayInfo, setTodayInfo] = React.useState<TodayAttendanceInfo | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = React.useState(true);

  // Selected active session state
  const [activeSession, setActiveSession] = React.useState<SessionActiveDetails | null>(null);
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);

  // Scan result feedback state
  const [lastScanResult, setLastScanResult] = React.useState<ScanResultResponse | null>(null);
  const [isProcessingScan, setIsProcessingScan] = React.useState(false);

  // Manual Attendance Modal
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [manualSearch, setManualSearch] = React.useState("");

  // Complete Session Modal & Summary
  const [isCompleteModalOpen, setIsCompleteModalOpen] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [completedSummary, setCompletedSummary] = React.useState<{
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
  } | null>(null);

  // Offline & Synchronization Queue State
  const [isOnline, setIsOnline] = React.useState(true);
  const [pendingQueueCount, setPendingQueueCount] = React.useState(0);
  const [isSyncingQueue, setIsSyncingQueue] = React.useState(false);

  // Sync Offline Queue Function
  const triggerSync = React.useCallback(async () => {
    if (!activeSession || isSyncingQueue) return;
    setIsSyncingQueue(true);
    try {
      const syncResult = await syncOfflineQueue(activeSession.session.id);
      const remaining = await getPendingScansCount(activeSession.session.id);
      setPendingQueueCount(remaining);

      if (syncResult.synced > 0 || syncResult.duplicates > 0) {
        soundEffects.playSuccess();
        toast.success(`تمت مزامنة ${syncResult.synced} سجل بنجاح!`);

        // Refresh active session from server to retrieve accurate student names and counts
        const updated = await getOrCreateAttendanceSession(activeSession.session.groupId);
        if (updated.success && updated.data) {
          setActiveSession(updated.data);
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("حدث خطأ أثناء مزامنة السجلات المعلقة");
    } finally {
      setIsSyncingQueue(false);
    }
  }, [activeSession, isSyncingQueue]);

  // Monitor Online / Offline and Pending Scans Count
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const updatePending = async () => {
      if (activeSession?.session.id) {
        const count = await getPendingScansCount(activeSession.session.id);
        setPendingQueueCount(count);
      }
    };

    updatePending();

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("تمت استعادة الاتصال بالإنترنت، جاري مزامنة السجلات المعلقة...");
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("انقطع الاتصال بالإنترنت — تم تفعيل وضع الحفظ المحلي دون اتصال");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [activeSession?.session.id, triggerSync]);

  // 1. Fetch Today Info on Mount
  const fetchInitialData = React.useCallback(async () => {
    setIsLoadingInitial(true);
    try {
      const res = await getTodayAttendanceInfo();
      if (res.success && res.data) {
        setTodayInfo(res.data);

        // If URL provided groupId, launch session directly
        if (urlGroupId) {
          startSessionForGroup(urlGroupId);
        }
      }
    } finally {
      setIsLoadingInitial(false);
    }
  }, [urlGroupId]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Start / Resume Session for a group
  const startSessionForGroup = async (groupId: string) => {
    setIsLoadingSession(true);
    setLastScanResult(null);
    try {
      const res = await getOrCreateAttendanceSession(groupId);
      if (!res.success || !res.data) {
        toast.error(res.error || "تعذر فتح جلسة الحضور لهذه المجموعة");
        return;
      }
      setActiveSession(res.data);
      const count = await getPendingScansCount(res.data.session.id);
      setPendingQueueCount(count);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // 3. Ultra-Fast Asynchronous Scan Queue (Zero-Loss, Non-Blocking)
  const scanQueueRef = React.useRef<Array<{ token: string; source: "camera" | "scanner" }>>([]);
  const isProcessingQueueRef = React.useRef(false);
  const activeSessionRef = React.useRef(activeSession);
  activeSessionRef.current = activeSession;
  const isOnlineRef = React.useRef(isOnline);
  isOnlineRef.current = isOnline;

  const processScanQueue = React.useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    setIsProcessingScan(true);

    try {
      while (scanQueueRef.current.length > 0) {
        const item = scanQueueRef.current.shift();
        if (!item) break;
        const currentSession = activeSessionRef.current;
        if (!currentSession) break;

        const { token, source } = item;
        const online = isOnlineRef.current;

        // If Offline: Save locally to IndexedDB queue with duplicate check
        if (!online) {
          try {
            const queueRes = await enqueueOfflineScan({
              sessionId: currentSession.session.id,
              groupId: currentSession.session.groupId,
              qrToken: token,
              source,
            });

            const count = await getPendingScansCount(currentSession.session.id);
            setPendingQueueCount(count);

            if (queueRes.duplicate) {
              soundEffects.playDuplicate();
              setLastScanResult({
                success: false,
                status: "already_recorded",
                message: "تم تسجيل هذا الكود مسبقاً في قائمة الانتظار بدون اتصال (محلياً)",
                source,
                scannedAt: new Date().toISOString(),
              });
              toast.warning("تم تسجيل هذا الكود مسبقاً في قائمة الانتظار محلياً");
              continue;
            }

            if (queueRes.success) {
              soundEffects.playSuccess();
              const nowStr = new Date().toISOString();
              setLastScanResult({
                success: true,
                status: "success",
                message:
                  "تم حفظ المسح محلياً في قائمة الانتظار (سيتم المزامنة تلقائياً عند عودة الاتصال)",
                studentName: `كود طالب: ${token.length > 14 ? `${token.substring(0, 12)}...` : token}`,
                source,
                scannedAt: nowStr,
              });

              // Add temporary local entry to records list
              const localRecord: SessionRecordItem = {
                id: `temp_${Date.now()}`,
                studentId: `offline_${token}`,
                studentName: `طالب أوفلاين (${token.length > 10 ? `${token.slice(0, 8)}...` : token})`,
                studentPhone: "",
                status: "present",
                scannedAt: nowStr,
                source,
              };

              setActiveSession((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  session: {
                    ...prev.session,
                    presentCount: prev.session.presentCount + 1,
                  },
                  records: [localRecord, ...prev.records],
                };
              });
              continue;
            }
          } catch (err) {
            console.error("Offline enqueue error:", err);
            toast.error("فشل حفظ السجل محلياً");
          }
          continue;
        }

        // If Online: Call atomic recordAttendanceScan Server Action
        try {
          const res = await recordAttendanceScan({
            sessionId: currentSession.session.id,
            groupId: currentSession.session.groupId,
            qrToken: token,
            source,
          });

          setLastScanResult(res);

          // Trigger Web Audio tone & state update according to result
          if (res.status === "success") {
            soundEffects.playSuccess();
            const newRecord: SessionRecordItem = {
              id: res.studentId!,
              studentId: res.studentId!,
              studentName: res.studentName!,
              studentPhone: res.studentPhone || "",
              status: "present",
              scannedAt: res.scannedAt!,
              source: res.source || source,
            };

            setActiveSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                session: {
                  ...prev.session,
                  presentCount: prev.session.presentCount + 1,
                },
                records: [newRecord, ...prev.records.filter((r) => r.studentId !== res.studentId)],
              };
            });
          } else if (res.status === "wrong_group") {
            soundEffects.playWarning();
          } else if (res.status === "blocked") {
            soundEffects.playBlocked();
          } else if (res.status === "already_recorded") {
            soundEffects.playDuplicate();
          } else {
            soundEffects.playWarning();
          }
        } catch {
          // If network failed mid-scan, fallback seamlessly to offline queue
          try {
            const queueRes = await enqueueOfflineScan({
              sessionId: currentSession.session.id,
              groupId: currentSession.session.groupId,
              qrToken: token,
              source,
            });
            const count = await getPendingScansCount(currentSession.session.id);
            setPendingQueueCount(count);

            if (queueRes.duplicate) {
              soundEffects.playDuplicate();
              setLastScanResult({
                success: false,
                status: "already_recorded",
                message: "تم تسجيل هذا الكود مسبقاً في قائمة الانتظار بدون اتصال",
                source,
                scannedAt: new Date().toISOString(),
              });
            } else if (queueRes.success) {
              soundEffects.playSuccess();
              setLastScanResult({
                success: true,
                status: "success",
                message:
                  "تعذر الاتصال بالخادم — تم حفظ الكود محلياً في قائمة الانتظار للمزامنة اللاحقة",
                studentName: `كود طالب: ${token.length > 14 ? `${token.substring(0, 12)}...` : token}`,
                source,
                scannedAt: new Date().toISOString(),
              });
            }
          } catch {
            toast.error("حدث خطأ أثناء معالجة كود المسح");
          }
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      setIsProcessingScan(false);
    }
  }, []);

  const handleScan = React.useCallback(
    (token: string, source: "camera" | "scanner") => {
      const cleanToken = token.trim();
      const currentSession = activeSessionRef.current;
      if (!cleanToken || !currentSession) return;

      // 1. Instant Cache Check: If student is already recorded in active session
      if (currentSession.registeredStudents) {
        const matched = currentSession.registeredStudents.find((s) => s.qrToken === cleanToken);
        if (matched) {
          const isAlreadyPresent = currentSession.records.some((r) => r.studentId === matched.id);
          if (isAlreadyPresent) {
            soundEffects.playDuplicate();
            setLastScanResult({
              success: false,
              status: "already_recorded",
              message: `تم رصد حضور الطالب "${matched.name}" مسبقاً في هذه الجلسة`,
              studentName: matched.name,
              source,
              scannedAt: new Date().toISOString(),
            });
            return;
          }
        }
      }

      // 2. Prevent duplicate entries in queue
      if (scanQueueRef.current.some((item) => item.token === cleanToken)) {
        return;
      }

      // 3. Push to queue and process
      scanQueueRef.current.push({ token: cleanToken, source });
      processScanQueue();
    },
    [processScanQueue]
  );

  // 4. Handle Manual Attendance Registration
  const handleManualRecord = async (studentId: string, status: "present" | "late") => {
    if (!activeSession) return;

    try {
      const res = await recordManualAttendance({
        sessionId: activeSession.session.id,
        groupId: activeSession.session.groupId,
        studentId,
        status,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
      soundEffects.playSuccess();

      if (res.record) {
        setActiveSession((prev) => {
          if (!prev) return prev;
          const isNew = !prev.records.some((r) => r.studentId === studentId);
          return {
            ...prev,
            session: {
              ...prev.session,
              presentCount:
                isNew && status === "present"
                  ? prev.session.presentCount + 1
                  : prev.session.presentCount,
              lateCount:
                isNew && status === "late" ? prev.session.lateCount + 1 : prev.session.lateCount,
            },
            records: [res.record!, ...prev.records.filter((r) => r.studentId !== studentId)],
          };
        });
      }

      setIsManualModalOpen(false);
    } catch {
      toast.error("فشل تسجيل الحضور اليدوي");
    }
  };

  // 5. Complete Session & Auto Absentee Assignment
  const handleCompleteSession = async () => {
    if (!activeSession) return;

    setIsCompleting(true);
    try {
      const res = await completeAttendanceSession(activeSession.session.id);
      if (!res.success || !res.summary) {
        toast.error(res.error || "تعذر إغلاق الجلسة");
        return;
      }

      setCompletedSummary(res.summary);
      setIsCompleteModalOpen(false);
      toast.success("تم إنهاء الجلسة واحتساب الغياب التلقائي بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء إنهاء الجلسة");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm font-semibold text-muted">
          جاري فحص مواعيد حصص اليوم بتوقيت مصر...
        </span>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ACTIVE ATTENDANCE SCANNER SESSION VIEW
  // =========================================================================
  if (activeSession) {
    const presentCount = activeSession.records.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;
    const totalStudents = activeSession.registeredStudents.length;
    const remainingCount = Math.max(0, totalStudents - presentCount);
    const attendancePercentage =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return (
      <div className="space-y-5 pb-24 lg:pb-12" dir="rtl">
        {/* Session Top Bar */}
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSession(null)}
              className="h-9 w-9 shrink-0 p-0 text-muted hover:text-text"
              title="الرجوع لاختيار مجموعة أخرى"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-text tracking-tight sm:text-2xl">
                  {activeSession.session.groupName}
                </h1>
                <Badge variant="success" size="sm" dot>
                  جلسة نشطة
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                <span className="flex items-center gap-1 font-bold text-text">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  {activeSession.session.className}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>تاريخ: {activeSession.session.date}</span>
                <span className="hidden sm:inline">•</span>
                <span>بدأت: {formatArabicTime(activeSession.session.startTime)}</span>
              </div>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="gap-1.5 font-bold"
            >
              <UserPlus className="h-4 w-4" />
              <span>تسجيل يدوي</span>
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsCompleteModalOpen(true)}
              className="gap-1.5 font-bold"
            >
              <Check className="h-4 w-4" />
              <span>إنهاء الجلسة واحتساب الغياب</span>
            </Button>
          </div>
        </div>

        {/* Mobile sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="flex-1 gap-1.5 font-bold"
          >
            <UserPlus className="h-4 w-4" />
            <span>تسجيل يدوي</span>
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsCompleteModalOpen(true)}
            className="flex-1 gap-1.5 font-bold"
          >
            <Check className="h-4 w-4" />
            <span>إنهاء الجلسة</span>
          </Button>
        </div>

        {/* Offline & Synchronization Status Banner */}
        {(!isOnline || pendingQueueCount > 0) && (
          <div
            className={`flex flex-col items-center justify-between gap-3 rounded-xl border p-3.5 sm:flex-row ${
              !isOnline ? "border-warning/30 bg-warning/10" : "border-primary/25 bg-primary/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  !isOnline ? "bg-warning text-white" : "bg-primary text-white"
                }`}
              >
                {!isOnline ? <WifiOff className="h-4.5 w-4.5" /> : <Wifi className="h-4.5 w-4.5" />}
              </div>
              <div>
                <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-text">
                  {!isOnline ? "وضع العمل بدون اتصال مفعّل" : "الاتصال بالإنترنت متوفر"}
                  <Badge
                    variant={!isOnline ? "outline" : "primary"}
                    className="text-[11px] font-bold"
                  >
                    {pendingQueueCount} سجل في الانتظار
                  </Badge>
                </h4>
                <p className="mt-0.5 text-xs text-muted">
                  {!isOnline
                    ? "يتم حفظ السجلات محلياً بأمان وستتم مزامنتها تلقائياً فور عودة الاتصال."
                    : `يوجد ${pendingQueueCount} سجل معلق جاهز للمزامنة الآن.`}
                </p>
              </div>
            </div>

            {isOnline && pendingQueueCount > 0 && (
              <Button
                size="sm"
                onClick={triggerSync}
                disabled={isSyncingQueue}
                className="w-full gap-2 text-xs font-bold sm:w-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingQueue ? "animate-spin" : ""}`} />
                {isSyncingQueue ? "جاري المزامنة..." : "مزامنة الآن"}
              </Button>
            )}
          </div>
        )}

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs font-medium text-muted">إجمالي المقيدين</span>
            <h3 className="mt-0.5 text-xl font-bold text-text sm:text-2xl">{totalStudents} طالب</h3>
          </div>

          <div className="rounded-xl border border-success/20 bg-success/5 p-3.5">
            <span className="text-xs font-semibold text-success">الحاضرون حتى الآن</span>
            <h3 className="mt-0.5 text-xl font-bold text-success sm:text-2xl">{presentCount}</h3>
          </div>

          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3.5">
            <span className="text-xs font-semibold text-warning">المتبقي (غياب محتمل)</span>
            <h3 className="mt-0.5 text-xl font-bold text-warning sm:text-2xl">{remainingCount}</h3>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <span className="text-xs font-semibold text-primary">نسبة الحضور الحالية</span>
            <h3 className="mt-0.5 text-xl font-bold text-primary sm:text-2xl">
              {attendancePercentage}%
            </h3>
          </div>
        </div>

        {/* Dynamic Scan Result Feedback Banner */}
        {lastScanResult && (
          <div
            className={`flex flex-col items-start justify-between gap-3 rounded-xl border-2 p-4 sm:flex-row sm:items-center transition-colors ${
              lastScanResult.status === "success"
                ? "border-success bg-success/15 text-text"
                : lastScanResult.status === "wrong_group"
                  ? "border-warning bg-warning/15 text-text"
                  : lastScanResult.status === "blocked"
                    ? "border-danger bg-danger/15 text-text"
                    : "border-slate-400 bg-slate-100 dark:bg-slate-900 text-text"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  lastScanResult.status === "success"
                    ? "bg-success text-white"
                    : lastScanResult.status === "wrong_group"
                      ? "bg-warning text-white"
                      : lastScanResult.status === "blocked"
                        ? "bg-danger text-white"
                        : "bg-slate-400 text-white"
                }`}
              >
                {lastScanResult.status === "success" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : lastScanResult.status === "wrong_group" ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : lastScanResult.status === "blocked" ? (
                  <Ban className="h-6 w-6" />
                ) : (
                  <Clock3 className="h-6 w-6" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold tracking-tight sm:text-lg">
                  {lastScanResult.status === "success"
                    ? `حاضر: ${lastScanResult.studentName}`
                    : lastScanResult.status === "wrong_group"
                      ? `مجموعة غير مطابقة`
                      : lastScanResult.status === "blocked"
                        ? `طالب محظور`
                        : lastScanResult.status === "already_recorded"
                          ? `تم تسجيله مسبقاً`
                          : "كود غير صالح"}
                </h3>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed opacity-90">
                  {lastScanResult.message}
                </p>
              </div>
            </div>

            {lastScanResult.scannedAt && (
              <span className="shrink-0 rounded-lg border border-border bg-surface/80 px-2.5 py-1 font-mono text-xs font-bold">
                {formatISOTimeToCairo(lastScanResult.scannedAt)}
              </span>
            )}
          </div>
        )}

        {/* Main 2-Column Split: Scanner + Live Attendance List */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Scanner (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            <AttendanceScanner
              onScan={handleScan}
              isProcessing={isProcessingScan}
              isOnline={isOnline}
            />
          </div>

          {/* Right Column: Live Attendance List (7 cols) */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">سجل الحضور الحي بالجلسة</CardTitle>
                  </div>
                  <CardDescription className="mt-0.5">
                    الطلاب الذين تم مسح كروتهم أو رصدهم يدوياً في هذه الحصة.
                  </CardDescription>
                </div>

                <Badge variant="primary" size="sm">
                  {activeSession.records.length} مسجل
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
                  {activeSession.records.length === 0 ? (
                    <div className="p-12 text-center text-muted space-y-2">
                      <UserCheck className="h-10 w-10 text-muted mx-auto stroke-[1.5]" />
                      <p className="text-sm font-semibold text-text">لم يتم رصد أي حضور بعد</p>
                      <p className="text-xs text-muted max-w-xs mx-auto">
                        وجّه كاميرا الماسح نحو كروت الطلاب أو استخدم ماسح الباركود للبدء.
                      </p>
                    </div>
                  ) : (
                    activeSession.records.map((rec, idx) => (
                      <div
                        key={rec.id || idx}
                        className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-surface/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            {rec.studentId.startsWith("offline_") ? (
                              <span className="flex items-center gap-1.5 text-sm font-bold text-text">
                                {rec.studentName}
                                <Badge
                                  variant="warning"
                                  className="px-1 py-0 text-[10px] font-normal"
                                >
                                  قيد الانتظار
                                </Badge>
                              </span>
                            ) : (
                              <Link
                                href={`/students/${rec.studentId}`}
                                className="text-sm font-bold text-text transition-colors hover:text-primary"
                              >
                                {rec.studentName}
                              </Link>
                            )}
                            <span className="font-mono text-[11px] text-muted" dir="ltr">
                              {rec.studentPhone}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pr-9 sm:pr-0">
                          <span className="hidden rounded border border-border bg-surface px-2 py-0.5 text-[10px] text-muted sm:inline">
                            {rec.source === "camera"
                              ? "كاميرا باركود"
                              : rec.source === "scanner"
                                ? "ماسح باركود USB"
                                : "يدوي"}
                          </span>
                          <span className="font-mono text-xs font-bold text-text" dir="ltr">
                            {rec.scannedAt ? formatISOTimeToCairo(rec.scannedAt) : "—"}
                          </span>
                          <Badge variant="success" size="sm" dot>
                            حاضر
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Manual Attendance Modal */}
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title="تسجيل حضور طالب يدوياً"
        >
          <div className="space-y-4" dir="rtl">
            <p className="text-xs text-muted">
              اختر الطالب من قائمة الطلاب المسجلين بهذه المجموعة في حال نسيان الكارت.
            </p>

            <div className="relative">
              <Input
                placeholder="بحث باسم الطالب أو رقم الهاتف..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="pl-9 pr-3"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border">
              {activeSession.registeredStudents
                .filter((s) => {
                  const q = manualSearch.toLowerCase().trim();
                  return !q || s.name.toLowerCase().includes(q) || s.phone.includes(q);
                })
                .map((student) => {
                  const isPresent = activeSession.records.some((r) => r.studentId === student.id);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-text">{student.name}</span>
                        <span className="text-xs text-muted font-mono" dir="ltr">
                          {student.phone}
                        </span>
                      </div>

                      {isPresent ? (
                        <Badge variant="success" size="sm">
                          سُجّل حضوره بالفعل
                        </Badge>
                      ) : student.status === "blocked" ? (
                        <Badge variant="danger" size="sm">
                          محظور
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleManualRecord(student.id, "present")}
                            className="text-xs h-7 font-bold"
                          >
                            تسجيل حاضر
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManualRecord(student.id, "late")}
                            className="text-xs h-7 text-warning"
                          >
                            متأخر
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Modal>

        {/* Confirmation Modal to End Session */}
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => !isCompleting && setIsCompleteModalOpen(false)}
          title="تأكيد إنهاء جلسة الحضور واحتساب الغياب"
        >
          <div className="space-y-4" dir="rtl">
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-sm text-text">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-text">تنبيه هام حول احتساب الغياب:</h4>
                <p className="text-xs text-muted leading-relaxed">
                  عند إنهاء الجلسة، سيتم تلقائياً اعتبار أي طالب مسجل بالمجموعة (
                  <strong className="text-text font-bold">{remainingCount} طالب</strong>) ولم يُسجل
                  حضوره حتى الآن كـ &quot;غائب&quot;، وتحديث تقارير أولياء الأمور.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsCompleteModalOpen(false)}
                disabled={isCompleting}
              >
                متابعة المسح
              </Button>
              <Button
                variant="danger"
                onClick={handleCompleteSession}
                isLoading={isCompleting}
                className="font-bold"
              >
                تأكيد الإنهاء واحتساب الغياب
              </Button>
            </div>
          </div>
        </Modal>

        {/* Post-Completion Summary Modal */}
        {completedSummary && (
          <Modal
            isOpen={true}
            onClose={() => {
              setCompletedSummary(null);
              setActiveSession(null);
            }}
            title="تم إنهاء الجلسة بنجاح"
          >
            <div className="space-y-5 text-center" dir="rtl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h3 className="text-lg font-black text-text">ملخص جلسة الحضور</h3>
                <p className="text-xs text-muted mt-1">
                  تم اعتماد وحفظ سجلات الحضور والغياب لجميع طلاب المجموعة.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface">
                  <span className="text-xs text-muted block">الإجمالي</span>
                  <span className="text-xl font-black text-text mt-1 block">
                    {completedSummary.totalStudents}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-success/20 bg-success/10">
                  <span className="text-xs text-success block">حضور</span>
                  <span className="text-xl font-black text-success mt-1 block">
                    {completedSummary.presentCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-danger/20 bg-danger/10">
                  <span className="text-xs text-danger block">غياب</span>
                  <span className="text-xl font-black text-danger mt-1 block">
                    {completedSummary.absentCount}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setCompletedSummary(null);
                    setActiveSession(null);
                  }}
                  className="font-bold w-full"
                >
                  العودة لقائمة الحصص
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: GROUP SELECTION & REAL-TIME CAIRO RECOMMENDATION VIEW
  // =========================================================================
  const { cairo, currentSuggestedGroups, todayScheduledGroups, allActiveGroups } = todayInfo || {
    cairo: {
      dayOfWeek: "monday",
      formattedDate: "",
      arabicDayName: "",
      arabicFormattedDate: "",
      currentTime: "",
    },
    currentSuggestedGroups: [],
    todayScheduledGroups: [],
    allActiveGroups: [],
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12" dir="rtl">
      {/* Top Header with Cairo Time Info */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text tracking-tight sm:text-2xl">
              تسجيل الحضور والغياب
            </h1>
            <Badge variant="primary" size="sm">
              مباشر
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            اختر المجموعة لبدء جلسة المسح الضوئي لكروت الطلاب عبر الكاميرا أو ماسح الباركود.
          </p>
        </div>

        {/* Cairo Real Time Widget */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-text">
              يوم {cairo.arabicDayName} — {cairo.arabicFormattedDate}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <span>توقيت القاهرة:</span>
              <strong className="font-mono text-xs font-bold text-primary">
                {formatArabicTime(cairo.currentTime)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Current Suggested Group(s) based on real Cairo time */}
      {currentSuggestedGroups.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <h2 className="text-sm font-bold text-text sm:text-base">
              المجموعات المقترحة الآن وفق جدول اليوم
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {currentSuggestedGroups.map((group) => (
              <Card key={group.id} className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      الحصة الآن ({group.todaySchedule?.startTime} – {group.todaySchedule?.endTime})
                    </span>
                    <Badge variant="success" size="sm">
                      {group.studentsCount} طالب
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg font-bold sm:text-xl">{group.name}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1 text-xs font-semibold text-text">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    {group.className}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => startSessionForGroup(group.id)}
                    isLoading={isLoadingSession}
                    className="w-full gap-2 font-bold"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>بدء تسجيل الحضور الآن</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:p-5">
          <div className="flex items-center gap-3 text-right">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                لا توجد حصص مجدولة في هذا التوقيت تحديداً
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                يمكنك اختيار إحدى حصص اليوم المجدولة أدناه، أو اختيار أي مجموعة أخرى يدوياً.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: All Other Sessions Scheduled Today */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text">
          <Calendar className="h-4 w-4 text-primary" />
          <span>جدول حصص اليوم بالكامل ({todayScheduledGroups.length} مجموعات)</span>
        </h3>

        {todayScheduledGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted">
            لا توجد مجموعات لديها مواعيد مجدولة ليوم {cairo.arabicDayName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayScheduledGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-mono text-xs font-bold text-muted">
                      <Clock className="h-3 w-3 text-primary" />
                      من {group.todaySchedule?.startTime} إلى {group.todaySchedule?.endTime}
                    </span>
                    <span className="text-xs font-semibold text-text">
                      {group.studentsCount} طالب
                    </span>
                  </div>
                  <CardTitle className="mt-1 text-base font-bold">{group.name}</CardTitle>
                  <CardDescription className="text-xs text-muted">
                    {group.className}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startSessionForGroup(group.id)}
                    className="w-full gap-1.5 text-xs font-bold"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>فتح جلسة الحضور</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Manual Group Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">تسجيل حضور لمجموعة أخرى يدوياً</CardTitle>
          </div>
          <CardDescription>
            اختر أي مجموعة دراسية أخرى لتسجيل الحضور خارج أوقات الجدول الدوري.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-xl flex-col items-center gap-3 sm:flex-row">
            <Select
              onChange={(e) => {
                if (e.target.value) {
                  startSessionForGroup(e.target.value);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                اختر المجموعة الدراسية...
              </option>
              {allActiveGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.className} ({g.studentsCount} طالب)
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse p-4 md:p-6 max-w-7xl mx-auto" dir="rtl">
          <div className="h-8 w-48 rounded-lg bg-surface border border-border" />
          <div className="h-4 w-72 rounded-lg bg-surface border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="h-36 rounded-2xl bg-surface border border-border" />
            <div className="h-36 rounded-2xl bg-surface border border-border" />
            <div className="h-36 rounded-2xl bg-surface border border-border" />
          </div>
        </div>
      }
    >
      <AttendanceContent />
    </React.Suspense>
  );
}
