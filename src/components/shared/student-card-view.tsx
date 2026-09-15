"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { generateQrDataUrl } from "@/lib/utils/qr";
import { generateBarcodeDataUrl } from "@/lib/utils/barcode";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Student } from "@/types";
import { getTeacherProfile, type TeacherProfileData } from "@/lib/actions/profile";
import { Printer, Download, ShieldCheck, ExternalLink } from "lucide-react";

interface StudentCardViewProps {
  student: Student & {
    className: string;
    groupName: string;
  };
  standalone?: boolean;
}

// Octagon "cut corner" clip path used for the student photo on the front face.
const PHOTO_CLIP_PATH =
  "polygon(22% 0%, 78% 0%, 100% 22%, 100% 78%, 78% 100%, 22% 100%, 0% 78%, 0% 22%)";

export function StudentCardView({ student, standalone = false }: StudentCardViewProps) {
  const [studentBarcodeUrl, setStudentBarcodeUrl] = React.useState<string>("");
  const [parentQrUrl, setParentQrUrl] = React.useState<string>("");
  const [viewSide, setViewSide] = React.useState<"both" | "front" | "back">("both");
  const [isExporting, setIsExporting] = React.useState(false);

  const [teacher, setTeacher] = React.useState<TeacherProfileData | null>(null);

  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const combinedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadCodes() {
      if (student.qrToken) {
        const barcodeDataUrl = generateBarcodeDataUrl(student.qrToken, {
          width: 5, // massive bars since token is extremely short (6 chars)
          height: 100, // very tall bars
          margin: 0,
          displayValue: false, // remove the ID text under the barcode
        });
        if (isMounted) setStudentBarcodeUrl(barcodeDataUrl);
      }

      if (student.parentQrToken) {
        const parentPortalUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/p/${student.parentQrToken}`
            : `/p/${student.parentQrToken}`;

        const pUrl = await generateQrDataUrl(parentPortalUrl, {
          width: 250,
          margin: 1,
          darkColor: "#0F172A",
        });
        if (isMounted) setParentQrUrl(pUrl);
      }
    }
    loadCodes();

    return () => {
      isMounted = false;
    };
  }, [student.qrToken, student.parentQrToken]);

  React.useEffect(() => {
    async function fetchTeacher() {
      const res = await getTeacherProfile();
      if (res.success && res.profile) {
        setTeacher(res.profile);
      }
    }
    fetchTeacher();
  }, []);

  // Handle Print Action
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = student.name;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Handle PNG Download
  const handleDownloadPng = async (target: "front" | "back" | "combined") => {
    let node: HTMLElement | null = null;
    let filename = `${student.name.replace(/\s+/g, "_")}_card`;

    if (target === "front") {
      node = frontRef.current;
      filename += "_front.png";
    } else if (target === "back") {
      node = backRef.current;
      filename += "_back.png";
    } else {
      node = combinedRef.current;
      filename += "_full.png";
    }

    if (!node) return;

    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 4, // High-resolution output
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success("تم تصدير كارت الطالب كصورة عالية الدقة بنجاح");
    } catch {
      toast.error("تعذر تصدير الكارت كصورة");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Print CSS Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-cards-container,
          #print-cards-container * {
            visibility: visible;
          }
          #print-cards-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background-color: #e5e7eb !important;
            display: flex !important;
            flex-direction: column !important;
            flex-wrap: wrap !important;
            gap: 20mm !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .id-card-print-box {
            zoom: 1.5 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Interactive Control Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface/40">
        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setViewSide("both")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewSide === "both"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            الوجهين معاً
          </button>
          <button
            type="button"
            onClick={() => setViewSide("front")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewSide === "front"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            الوجه الأمامي
          </button>
          <button
            type="button"
            onClick={() => setViewSide("back")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewSide === "back"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            الوجه الخلفي
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة البطاقة (ID Print)</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isExporting}
            onClick={() => handleDownloadPng("combined")}
            className="gap-1.5 font-bold"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? "جاري التصدير..." : "تحميل PNG (الوجهين)"}</span>
          </Button>

          {!standalone && (
            <Link href={`/students/${student.id}/card`}>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted hover:text-text">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Cards Area (Print Container) */}
      <div
        id="print-cards-container"
        ref={combinedRef}
        className="flex flex-col items-center justify-center gap-8 py-6"
      >
        {/* ========================================================================= */}
        {/* FRONT FACE — 85.6mm × 54mm (standard CR80 ID card size)                  */}
        {/* ========================================================================= */}
        {(viewSide === "both" || viewSide === "front") && (
          <div className="flex flex-col items-center gap-2">
            <span className="no-print text-xs font-bold text-muted mb-1">
              الوجه الأمامي (Front)
            </span>
            <div
              ref={frontRef}
              className="id-card-print-box relative w-[342px] h-[216px] rounded-[14px] bg-[#FFFFFF] shadow-sm flex flex-col overflow-hidden select-none font-sans"
              style={{ aspectRatio: "85.6 / 54" }}
              dir="ltr"
            >
              {/* Header — brand wordmark + logo */}
              <div className="flex items-start justify-between px-5 pt-2 h-[34px] shrink-0">
                <span
                  className="text-[13px] font-bold tracking-widest text-[#056239] uppercase leading-none mt-1"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  RASHAD
                </span>
                <div className="relative w-[42px] h-[26px]">
                  <Image src="/logo.png" alt="فُلك" fill className="object-contain" />
                </div>
              </div>

              {/* Body Content */}
              <div className="flex items-start gap-4 px-5 flex-1 min-h-0 mt-1.5">
                {/* Photo — octagon cut-corner shape */}
                <div
                  className="relative shrink-0 overflow-hidden bg-gray-100"
                  style={{
                    width: "102px",
                    height: "122px",
                    clipPath: PHOTO_CLIP_PATH,
                  }}
                >
                  {student.photoUrl ? (
                    <Image
                      src={student.photoUrl}
                      alt={student.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl text-gray-400 font-bold">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info & Barcode */}
                <div className="flex flex-col flex-1 min-w-0 h-[122px] justify-between py-1">
                  <div className="w-full text-right" dir="rtl">
                    <h4 className="text-[15px] font-semibold text-gray-900 leading-tight">
                      {student.name}
                    </h4>
                    <p className="text-[11px] font-medium text-gray-800 mt-1.5">
                      {student.className}
                    </p>
                    <p className="text-[11px] font-medium text-gray-800 mt-0.5">
                      {student.groupName}
                    </p>
                  </div>

                  {/* Barcode (No text, full width) */}
                  <div className="w-full flex justify-end mt-1.5">
                    {studentBarcodeUrl ? (
                      <img
                        src={studentBarcodeUrl}
                        alt="Barcode"
                        className="h-[64px] w-[180px] object-contain object-right"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <div className="h-[46px] w-[140px] bg-gray-50 border border-gray-100 rounded flex items-center justify-center text-[9px] text-gray-400">
                        Barcode
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-3 pt-2 mt-auto shrink-0 w-full">
                <div className="flex items-center justify-between border-t-[1.5px] border-gray-400/60 pt-1.5 text-[10px] text-gray-800 font-medium bg-white shrink-0">
                  <span className="font-sans" dir="ltr">
                    ID: {student.qrToken ? student.qrToken.slice(0, 16) : "—"}
                  </span>
                  <span className="font-sans" dir="ltr">
                    Tel: {teacher?.phone || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Face Export button */}
            <div className="no-print flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadPng("front")}
                className="h-7 text-[11px] text-muted hover:text-text gap-1"
              >
                <Download className="h-3 w-3" />
                <span>تحميل الوجه الأمامي PNG</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BACK FACE — 85.6mm × 54mm (standard CR80 ID card size)                   */}
        {/* ========================================================================= */}
        {(viewSide === "both" || viewSide === "back") && (
          <div className="flex flex-col items-center gap-2">
            <span className="no-print text-xs font-bold text-muted mb-1">الوجه الخلفي (Back)</span>
            <div
              ref={backRef}
              className="id-card-print-box relative w-[342px] h-[216px] rounded-[14px] bg-[#FFFFFF] shadow-sm flex flex-col overflow-hidden select-none font-sans"
              style={{ aspectRatio: "85.6 / 54" }}
              dir="ltr"
            >
              {/* Header — identical to front */}
              <div className="flex items-start justify-between px-5 pt-2 h-[34px] shrink-0">
                <span
                  className="text-[13px] font-bold tracking-widest text-[#056239] uppercase leading-none mt-1"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  RASHAD
                </span>
                <div className="relative w-[42px] h-[26px]">
                  <Image src="/logo.png" alt="فُلك" fill className="object-contain" />
                </div>
              </div>

              {/* Body */}
              <div className="flex items-start gap-4 px-5 flex-1 min-h-0 mt-1.5">
                {/* QR Code */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-[82px] h-[82px]">
                    {parentQrUrl ? (
                      <Image src={parentQrUrl} alt="QR ولي الأمر" fill className="object-contain" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg"></div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-800 mt-2 whitespace-nowrap">
                    متابعة ولي الامر
                  </span>
                </div>

                {/* Quote (centered) + Signature (pushed to the right edge) */}
                <div className="flex flex-col flex-1 min-w-0 h-[122px] py-1" dir="rtl">
                  {/* Quote — centered within the remaining width */}
                  <div className="w-full text-center mt-1">
                    <p className="text-[11.5px] font-bold text-gray-900 leading-tight">
                      " انت تصنع مستقبلك بنفسك "
                    </p>
                    <p className="text-[11.5px] font-bold text-gray-900 leading-tight mt-1">
                      " خليك قد ثقة اهلك فيك "
                    </p>
                  </div>

                  {/* Signature block — flush to the left edge of its RTL container (which means right edge of card) */}
                  <div className="flex flex-col items-center mt-auto self-start ml-2 translate-y-1.5">
                    <div className="relative w-[85px] h-[40px]">
                      {teacher?.signatureUrl ? (
                        <Image
                          src={teacher.signatureUrl}
                          alt="Signature"
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-[8px]">
                          No Signature
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-800 border-t-[1.5px] border-gray-400 px-4 pt-1 whitespace-nowrap">
                      {teacher?.name || "المدرس"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-3 pt-2 mt-auto shrink-0 w-full">
                <div className="flex items-center justify-between border-t-[1.5px] border-gray-400/60 pt-1.5 text-[10px] text-gray-800 font-medium bg-white shrink-0">
                  <span className="font-sans" dir="ltr">
                    ID: {student.qrToken ? student.qrToken.slice(0, 16) : "—"}
                  </span>
                  <span className="font-sans" dir="ltr">
                    Tel: {teacher?.phone || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Face Export button */}
            <div className="no-print flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadPng("back")}
                className="h-7 text-[11px] text-muted hover:text-text gap-1"
              >
                <Download className="h-3 w-3" />
                <span>تحميل الوجه الخلفي PNG</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Security & Token Guarantee Notice */}
      <div className="no-print rounded-xl border border-border bg-surface/30 p-4 text-xs text-muted flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-text text-sm">التصميم مطابق لمتطلبات الطباعة القياسية:</h4>
          <p className="text-xs text-muted leading-relaxed">
            تم ضبط المقاسات والألوان وتخطيط العناصر في هذه البطاقة بحيث تكون مطابقة تمامًا للنموذج
            المعتمد (رشاد - فُلك). قم برفع صورة فُلك بصيغة شفافة للمنصة باسم (logo.png) لتظهر بشكل
            أفضل.
          </p>
        </div>
      </div>
    </div>
  );
}
