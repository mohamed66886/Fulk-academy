"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getStudentsCardsData, type StudentCardData } from "@/lib/actions/students";
import { useClassesForSelect, useGroups } from "@/hooks/use-cached-data";
import { generateBarcodeDataUrl } from "@/lib/utils/barcode";
import { generateQrDataUrl } from "@/lib/utils/qr";
import {
  StudentCardFront,
  StudentCardBack,
  EmptyCardSlot,
  A4PrintSheet,
  CARD_SIZES,
  type CardSizePreset,
} from "@/components/cards/printable-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Printer,
  ArrowRight,
  Settings2,
  HelpCircle,
  Scissors,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";

const CARDS_PER_SHEET = 8; // 2 columns x 4 rows

export default function PrintCardsStudioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground font-cairo">جاري التحميل...</div>
      }
    >
      <PrintCardsStudioContent />
    </React.Suspense>
  );
}

function PrintCardsStudioContent() {
  const searchParams = useSearchParams();
  const rawIds = searchParams.get("ids");
  const queryClassId = searchParams.get("classId");
  const queryGroupId = searchParams.get("groupId");

  const [students, setStudents] = React.useState<StudentCardData[]>([]);
  const [teacher, setTeacher] = React.useState<{
    name: string;
    phone: string;
    signatureUrl?: string;
  }>();
  const [isLoading, setIsLoading] = React.useState(true);

  // Barcode and QR code cache
  const [barcodeMap, setBarcodeMap] = React.useState<Map<string, string>>(new Map());
  const [qrMap, setQrMap] = React.useState<Map<string, string>>(new Map());
  const [isGeneratingCodes, setIsGeneratingCodes] = React.useState(false);

  // Filter options for changing or loading students
  const [selectedClass, setSelectedClass] = React.useState(queryClassId || "all");
  const [selectedGroup, setSelectedGroup] = React.useState(queryGroupId || "all");
  const { data: classesData } = useClassesForSelect();
  const { data: groupsData } = useGroups();
  const classesList = classesData || [];
  const groupsList = React.useMemo(() => {
    if (groupsData?.success && groupsData.groups) {
      return groupsData.groups.map((g) => ({
        id: g.id,
        name: g.name,
        classId: g.classId,
      }));
    }
    return [];
  }, [groupsData]);

  const availableGroups = React.useMemo(() => {
    if (selectedClass === "all") return groupsList;
    return groupsList.filter((g) => g.classId === selectedClass);
  }, [groupsList, selectedClass]);

  // Print & Display Settings
  const [cardSize, setCardSize] = React.useState<CardSizePreset>("large");
  const [printLayout, setPrintLayout] = React.useState<
    "duplex" | "fronts-then-backs" | "fronts-only" | "backs-only"
  >("duplex");
  const [flipMode, setFlipMode] = React.useState<"long-edge" | "short-edge">("long-edge");
  const [showCutGuides, setShowCutGuides] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState<number>(0.75); // 75% preview zoom by default
  const [showTipsModal, setShowTipsModal] = React.useState(false);

  // Load students data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let studentIds: string[] | undefined;

      if (rawIds) {
        studentIds = rawIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("selectedStudentIdsForPrint");
        if (stored) {
          try {
            studentIds = JSON.parse(stored);
          } catch {
            // Ignore parse errors
          }
        }
      }

      const res = await getStudentsCardsData({
        studentIds,
        classId: selectedClass !== "all" ? selectedClass : undefined,
        groupId: selectedGroup !== "all" ? selectedGroup : undefined,
      });

      if (res.success) {
        setStudents(res.students);
        if (res.teacher) setTeacher(res.teacher);
      } else {
        toast.error(res.error || "فشل جلب بيانات الطلاب للطباعة");
      }
    } catch {
      toast.error("حدث خطأ أثناء تحميل بيانات الكروت");
    } finally {
      setIsLoading(false);
    }
  }, [rawIds, selectedClass, selectedGroup]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate barcodes and QR codes for all loaded students
  React.useEffect(() => {
    if (students.length === 0) return;

    let isMounted = true;
    setIsGeneratingCodes(true);

    async function generateCodes() {
      const bMap = new Map<string, string>();
      const qMap = new Map<string, string>();

      const host = typeof window !== "undefined" ? window.location.origin : "https://fulk.academy";

      const promises = students.map(async (st) => {
        // Barcode for student attendance
        if (st.qrToken) {
          try {
            const bUrl = generateBarcodeDataUrl(st.qrToken, {
              width: 4,
              height: 90,
              margin: 0,
              displayValue: false,
            });
            bMap.set(st.id, bUrl);
          } catch (e) {
            console.error("Barcode gen error for student", st.name, e);
          }
        }

        // QR for parent portal
        if (st.parentQrToken) {
          try {
            const portalUrl = `${host}/p/${st.parentQrToken}`;
            const qUrl = await generateQrDataUrl(portalUrl, {
              width: 260,
              margin: 1,
              darkColor: "#0F172A",
            });
            qMap.set(st.id, qUrl);
          } catch (e) {
            console.error("QR gen error for student", st.name, e);
          }
        }
      });

      await Promise.all(promises);

      if (isMounted) {
        setBarcodeMap(bMap);
        setQrMap(qMap);
        setIsGeneratingCodes(false);
      }
    }

    generateCodes();

    return () => {
      isMounted = false;
    };
  }, [students]);

  // Compute Sheet Batches (8 students per A4 sheet)
  const batches = React.useMemo(() => {
    const list: Array<Array<StudentCardData | null>> = [];
    for (let i = 0; i < students.length; i += CARDS_PER_SHEET) {
      const chunk: Array<StudentCardData | null> = students.slice(i, i + CARDS_PER_SHEET);
      // Pad to 8 slots so geometric grid remains identical on front and back
      while (chunk.length < CARDS_PER_SHEET) {
        chunk.push(null);
      }
      list.push(chunk);
    }
    return list;
  }, [students]);

  // Build Pages List based on Layout Mode & Duplex Mirroring
  const sheetsToRender = React.useMemo(() => {
    type SheetItem = {
      id: string;
      pageNumber: number;
      sheetType: "front" | "back";
      slots: Array<StudentCardData | null>;
      label: string;
    };

    const frontSheets: SheetItem[] = [];
    const backSheets: SheetItem[] = [];

    batches.forEach((batch, batchIdx) => {
      // 1. Front Face Sheet (Normal Order 0..7)
      frontSheets.push({
        id: `front-${batchIdx}`,
        pageNumber: 0, // will renumber
        sheetType: "front",
        slots: batch,
        label: `الأوجه (Fronts) - دفعة ${batchIdx + 1}`,
      });

      // 2. Back Face Sheet (Mirrored for Duplex Alignment)
      // Front Row r: Slot 2*r (Col 0, Left), Slot 2*r + 1 (Col 1, Right)
      // When paper is flipped on Long Edge (horizontal flip):
      // Left becomes Right, Right becomes Left!
      // So on Back Row r:
      // Col 0 (Left) = Student at 2*r + 1
      // Col 1 (Right) = Student at 2*r
      const mirroredSlots: Array<StudentCardData | null> = new Array(CARDS_PER_SHEET).fill(null);

      if (flipMode === "long-edge") {
        for (let row = 0; row < 4; row++) {
          const frontLeft = batch[row * 2] ?? null;
          const frontRight = batch[row * 2 + 1] ?? null;

          mirroredSlots[row * 2] = frontRight; // Back Left receives Front Right
          mirroredSlots[row * 2 + 1] = frontLeft; // Back Right receives Front Left
        }
      } else {
        // Short edge flip (flip on horizontal axis):
        // Row 0 <-> Row 3, Row 1 <-> Row 2
        for (let row = 0; row < 4; row++) {
          const targetRow = 3 - row;
          mirroredSlots[row * 2] = batch[targetRow * 2] ?? null;
          mirroredSlots[row * 2 + 1] = batch[targetRow * 2 + 1] ?? null;
        }
      }

      backSheets.push({
        id: `back-${batchIdx}`,
        pageNumber: 0, // will renumber
        sheetType: "back",
        slots: mirroredSlots,
        label: `الظهور (Backs) - دفعة ${batchIdx + 1}`,
      });
    });

    let combined: SheetItem[] = [];

    if (printLayout === "duplex") {
      // Interleaved: Front 0, Back 0, Front 1, Back 1...
      batches.forEach((_, idx) => {
        if (frontSheets[idx]) combined.push(frontSheets[idx]);
        if (backSheets[idx]) combined.push(backSheets[idx]);
      });
    } else if (printLayout === "fronts-then-backs") {
      // All fronts first, then all backs
      combined = [...frontSheets, ...backSheets];
    } else if (printLayout === "fronts-only") {
      combined = frontSheets;
    } else if (printLayout === "backs-only") {
      combined = backSheets;
    }

    return combined.map((sheet, idx) => ({
      ...sheet,
      pageNumber: idx + 1,
    }));
  }, [batches, flipMode, printLayout]);

  // Execute Print
  const handlePrint = () => {
    if (students.length === 0) {
      toast.error("لا يوجد طلاب محددين للطباعة");
      return;
    }
    const originalTitle = document.title;
    document.title = `كروت_الطلاب_${students.length}_طالب_فلك`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-20 text-text" dir="rtl">
      {/* ─── Global Print Stylesheet ─────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html,
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all app chrome, sidebars, headers */
          body * {
            visibility: hidden !important;
          }
          /* Show only the printable sheets container */
          #print-sheets-area,
          #print-sheets-area * {
            visibility: visible !important;
          }
          #print-sheets-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            background: #ffffff !important;
          }
          #print-sheets-area > * {
            margin: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }
          .preview-sheet-wrapper {
            margin: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .preview-scale-box {
            transform: none !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }
          .a4-print-page {
            position: relative !important;
            width: 210mm !important;
            height: 295.5mm !important;
            max-width: 210mm !important;
            max-height: 295.5mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: page !important;
            break-after: page !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Eliminate any trailing blank page */
          .preview-sheet-wrapper:last-child .a4-print-page,
          .a4-print-page:last-of-type,
          .a4-print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print,
          aside,
          header,
          nav {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── Top Interactive Header (Hidden on Print) ─────────────── */}
      <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Back link & Title */}
          <div className="flex items-center gap-3">
            <Link href="/students">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted hover:text-text rounded-xl"
                title="الرجوع لقائمة الطلاب"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-extrabold text-text tracking-tight flex items-center gap-2">
                  <span>استوديو طباعة كروت الطلاب الذكية</span>
                  <Badge variant="primary" size="sm" className="font-mono font-bold">
                    A4 Duplex
                  </Badge>
                </h1>
              </div>
              <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                <span>تم تجهيز</span>
                <strong className="text-text font-bold">{students.length} كارت</strong>
                <span>•</span>
                <span>
                  {Math.ceil(students.length / CARDS_PER_SHEET) || 0} ورقة A4 (
                  {sheetsToRender.length} صفحة طباعة)
                </span>
                {isGeneratingCodes && (
                  <span className="inline-flex items-center gap-1 text-primary animate-pulse font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    جاري تجهيز الباركودات...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons & Zoom */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-surface-raised rounded-xl p-1 border border-border text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                className="p-1 text-muted hover:text-text rounded-lg hover:bg-surface"
                title="تصغير المعاينة"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="font-mono font-bold px-1.5 min-w-[42px] text-center text-[11px]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.2, Number((z + 0.15).toFixed(2))))}
                className="p-1 text-muted hover:text-text rounded-lg hover:bg-surface"
                title="تكبير المعاينة"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Print Instructions Dialog Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTipsModal(true)}
              className="gap-1.5 font-bold text-xs rounded-xl"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">إرشادات الطباعة المتطابقة</span>
            </Button>

            {/* Main Print Button */}
            <Button
              type="button"
              size="md"
              onClick={handlePrint}
              disabled={isLoading || students.length === 0}
              className="gap-2 font-black shadow-md rounded-xl bg-primary hover:bg-primary/95 px-5"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة الكروت الآن</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Control & Settings Toolbar (Hidden on Print) ─────────── */}
      <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Card Size Preset */}
            <div>
              <label className="block text-xs font-bold text-text mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>حجم الكارت المطبوع:</span>
              </label>
              <Select
                value={cardSize}
                onChange={(e) => setCardSize(e.target.value as CardSizePreset)}
                className="text-xs font-bold text-primary"
              >
                <option value="large">كبير جداً (96 × 62 مم - يملأ الورقة بوضوح)</option>
                <option value="extra-large">أقصى حجم (98 × 63 مم)</option>
                <option value="medium">متوسط (90 × 58 مم)</option>
                <option value="standard">القياسي الأصلي (85.6 × 54 مم)</option>
              </Select>
            </div>

            {/* 2. Print Mode */}
            <div>
              <label className="block text-xs font-bold text-text mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>نمط ترتيب الصفحات:</span>
              </label>
              <Select
                value={printLayout}
                onChange={(e) =>
                  setPrintLayout(
                    e.target.value as "duplex" | "fronts-then-backs" | "fronts-only" | "backs-only"
                  )
                }
                className="text-xs font-medium"
              >
                <option value="duplex">وجه وظهر متتاليان (Duplex المزدوج)</option>
                <option value="fronts-then-backs">الأوجه أولاً ثم كل الظهور (طابعة عادية)</option>
                <option value="fronts-only">الأوجه فقط (Front Only)</option>
                <option value="backs-only">الظهور فقط (Back Only)</option>
              </Select>
            </div>

            {/* 2. Duplex Flip Mode */}
            <div>
              <label className="block text-xs font-bold text-text mb-1.5 flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                <span>طريقة قلب الورقة (Duplex Flip):</span>
              </label>
              <Select
                value={flipMode}
                onChange={(e) => setFlipMode(e.target.value as "long-edge" | "short-edge")}
                className="text-xs font-medium"
              >
                <option value="long-edge">
                  على الحافة الطويلة (Long Edge - الافتراضي والموصى به)
                </option>
                <option value="short-edge">على الحافة القصيرة (Short Edge)</option>
              </Select>
            </div>

            {/* 3. Class Filter */}
            <div>
              <label className="block text-xs font-bold text-text mb-1.5">الصف الدراسي:</label>
              <Select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedGroup("all");
                }}
                className="text-xs font-medium"
              >
                <option value="all">جميع الصفوف (أو المحدد مسبقاً)</option>
                {classesList.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 4. Group Filter */}
            <div>
              <label className="block text-xs font-bold text-text mb-1.5">المجموعة الدراسية:</label>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="text-xs font-medium"
              >
                <option value="all">جميع المجموعات</option>
                {availableGroups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Quick toggles row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCutGuides}
                onChange={(e) => setShowCutGuides(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-bold text-text flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5 text-muted" />
                إظهار علامات وإرشادات القص المتقطعة (Cut Guides)
              </span>
            </label>

            <div className="flex items-center gap-2 text-muted">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>
                المقاس المطبق: <strong className="text-text">{CARD_SIZES[cardSize].label}</strong> •
                كل ورقة A4 تضم 8 كروت متطابقة الوجه والظهر.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Sheets Area (Printed + Previewed) ────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {isLoading ? (
          <div className="bg-surface rounded-2xl border border-border p-12 text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="font-bold text-text">جاري إعداد وتحميل بيانات الكروت...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-12 text-center space-y-4">
            <Info className="h-10 w-10 text-muted mx-auto stroke-[1.5]" />
            <h3 className="text-base font-bold text-text">لم يتم العثور على طلاب للطباعة</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              قم بالرجوع لقائمة الطلاب وحدد الطلاب المراد طباعة كروت لهم، أو اختر صَفاً ومجموعة من
              القائمة أعلاه.
            </p>
            <Link href="/students">
              <Button size="sm" className="gap-1.5 font-bold">
                <ArrowRight className="h-4 w-4" />
                <span>العودة لقائمة الطلاب</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div id="print-sheets-area" className="space-y-12">
            {sheetsToRender.map((sheet) => (
              <div key={sheet.id} className="preview-sheet-wrapper flex flex-col items-center">
                {/* Visual Sheet Banner (hidden on print) */}
                <div className="no-print w-full max-w-[210mm] flex items-center justify-between pb-2 text-xs font-bold text-muted">
                  <span className="flex items-center gap-2">
                    <Badge variant={sheet.sheetType === "front" ? "primary" : "default"} size="sm">
                      صفحة {sheet.pageNumber}:{" "}
                      {sheet.sheetType === "front"
                        ? "الوجه الأمامي (Front)"
                        : "الوجه الخلفي (Back)"}
                    </Badge>
                    <span className="text-gray-500 font-normal">
                      {sheet.sheetType === "front"
                        ? "باركود الحضور والبيانات"
                        : "QR ولي الأمر ومقولة التحفيز وتوقيع الأستاذ (محاذاة معكوسة للقلب)"}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">A4 • 210 × 297 mm</span>
                </div>

                {/* The Scaled A4 Sheet Container */}
                <div
                  className="preview-scale-box origin-top transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    marginBottom: `${(1 - zoomLevel) * -297 * 3.7795}px`, // negative margin compensation for css zoom
                  }}
                >
                  <A4PrintSheet
                    pageNumber={sheet.pageNumber}
                    sheetType={sheet.sheetType}
                    sizePreset={cardSize}
                  >
                    {sheet.slots.map((student, slotIdx) => {
                      if (!student) {
                        return (
                          <EmptyCardSlot
                            key={`empty-${sheet.id}-${slotIdx}`}
                            showCutGuides={showCutGuides}
                            sizePreset={cardSize}
                          />
                        );
                      }

                      if (sheet.sheetType === "front") {
                        return (
                          <StudentCardFront
                            key={`front-${student.id}-${slotIdx}`}
                            student={student}
                            teacher={teacher}
                            barcodeUrl={barcodeMap.get(student.id)}
                            showCutGuides={showCutGuides}
                            sizePreset={cardSize}
                          />
                        );
                      } else {
                        return (
                          <StudentCardBack
                            key={`back-${student.id}-${slotIdx}`}
                            student={student}
                            teacher={teacher}
                            parentQrUrl={qrMap.get(student.id)}
                            showCutGuides={showCutGuides}
                            sizePreset={cardSize}
                          />
                        );
                      }
                    })}
                  </A4PrintSheet>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── Print Tips Modal (Hidden on Print) ───────────────────── */}
      {showTipsModal && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowTipsModal(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-border p-6 max-w-lg w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">
                  إرشادات للحصول على تطابق 100% بين الوجه والظهر
                </h3>
                <p className="text-xs text-muted">
                  اتبع هذه الإعدادات البسيطة في نافذة الطباعة بمجرد الضغط على زر &quot;طباعة&quot;:
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-text">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-raised border border-border">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">حجم الورق (Paper Size):</strong>
                  <p className="text-muted text-[11px] mt-0.5">
                    اختر <strong>A4</strong> دائماً (وليس Letter).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-raised border border-border">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">الهوامش (Margins):</strong>
                  <p className="text-muted text-[11px] mt-0.5">
                    اختر <strong>بلا هوامش (None)</strong> أو <strong>صفر</strong>، لأن التصميم
                    يحتوي على هوامش هندسية دقيقة متماثلة في الكود.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-raised border border-border">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">مقياس الرسم (Scale):</strong>
                  <p className="text-muted text-[11px] mt-0.5">
                    اختر <strong>100% (الافتراضي / Default)</strong>، وتجنب خيار &quot;Fit to
                    printable area&quot;.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-raised border border-border">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">الطباعة على الوجهين (Duplex / Two-Sided):</strong>
                  <p className="text-muted text-[11px] mt-0.5">
                    اختر <strong>Flip on long edge (القلب على الحافة الطويلة)</strong> حتى يتطابق
                    الوجه والظهر تماماً.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-raised border border-border">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">رسومات الخلفية (Background Graphics):</strong>
                  <p className="text-muted text-[11px] mt-0.5">
                    تأكد من تفعيل خيار <strong>Background Graphics</strong> في المتصفح لظهور ألوان
                    وشعار الكارت بأعلى جودة.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setShowTipsModal(false)}
                className="font-bold"
              >
                فهمت، جاهز للطباعة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
