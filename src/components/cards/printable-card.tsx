"use client";

import * as React from "react";
import Image from "next/image";
import type { StudentCardData } from "@/lib/actions/students";

const PHOTO_CLIP_PATH =
  "polygon(22% 0%, 78% 0%, 100% 22%, 100% 78%, 78% 100%, 22% 100%, 0% 78%, 0% 22%)";

export type CardSizePreset = "large" | "extra-large" | "medium" | "standard";

export interface CardDimensions {
  widthMm: number;
  heightMm: number;
  colGapMm: number;
  rowGapMm: number;
  padLeftRightMm: number;
  padTopBottomMm: number;
  label: string;
}

export const CARD_SIZES: Record<CardSizePreset, CardDimensions> = {
  // Large option (Default): 96mm × 62mm (visibly larger, fills A4 with comfortable margins)
  large: {
    widthMm: 96,
    heightMm: 62,
    colGapMm: 6.0,
    rowGapMm: 5.5,
    padLeftRightMm: 6.0, // (210 - (96*2 + 6)) / 2 = 6mm
    padTopBottomMm: 15.5, // (296 - (62*4 + 5.5*3)) / 2 = 15.75mm
    label: "كبير (96 × 62 مم - موصى به ويملأ الورقة)",
  },
  // Extra Large option: 98mm × 63mm (maximum feasible size for 4 rows)
  "extra-large": {
    widthMm: 98,
    heightMm: 63,
    colGapMm: 5.0,
    rowGapMm: 5.0,
    padLeftRightMm: 4.5, // (210 - (98*2 + 5)) / 2 = 4.5mm
    padTopBottomMm: 14.5, // (296 - (63*4 + 5*3)) / 2 = 14.5mm
    label: "كبير جداً (98 × 63 مم - أقصى اتساع)",
  },
  // Medium option: 90mm × 58mm
  medium: {
    widthMm: 90,
    heightMm: 58,
    colGapMm: 6.0,
    rowGapMm: 6.0,
    padLeftRightMm: 12.0,
    padTopBottomMm: 23.0,
    label: "متوسط (90 × 58 مم)",
  },
  // Standard CR80 ID Card: 85.6mm × 54mm
  standard: {
    widthMm: 85.6,
    heightMm: 54,
    colGapMm: 6.8,
    rowGapMm: 6.0,
    padLeftRightMm: 16.0,
    padTopBottomMm: 31.0,
    label: "القياسي الصغير (85.6 × 54 مم - مقاس البطاقة الشخصية)",
  },
};

interface TeacherCardInfo {
  name: string;
  phone: string;
  signatureUrl?: string;
}

interface CardProps {
  student: StudentCardData;
  teacher?: TeacherCardInfo;
  barcodeUrl?: string;
  parentQrUrl?: string;
  showCutGuides?: boolean;
  sizePreset?: CardSizePreset;
}

/**
 * High-Precision Front Face (with size scaling)
 */
export function StudentCardFront({
  student,
  teacher,
  barcodeUrl,
  showCutGuides = true,
  sizePreset = "large",
}: CardProps) {
  const dims = CARD_SIZES[sizePreset] || CARD_SIZES.large;
  const isLarge = sizePreset === "large" || sizePreset === "extra-large";

  return (
    <div
      className="card-slot relative bg-white select-none overflow-hidden"
      style={{
        width: `${dims.widthMm}mm`,
        height: `${dims.heightMm}mm`,
        minWidth: `${dims.widthMm}mm`,
        minHeight: `${dims.heightMm}mm`,
        maxWidth: `${dims.widthMm}mm`,
        maxHeight: `${dims.heightMm}mm`,
        boxSizing: "border-box",
        border: showCutGuides ? "0.35pt dashed #cbd5e1" : "none",
        borderRadius: "3.5mm",
      }}
      dir="ltr"
    >
      <div className="w-full h-full flex flex-col justify-between p-[2.5mm] bg-white text-gray-900">
        {/* Header: Wordmark + Logo */}
        <div className="flex items-center justify-between px-[2mm] pt-[1mm] h-[8.5mm] shrink-0">
          <span
            className={`font-black tracking-widest text-[#056239] uppercase leading-none ${
              isLarge ? "text-[11.5pt]" : "text-[9.5pt]"
            }`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            RASHAD
          </span>
          <div
            className="relative"
            style={{
              width: isLarge ? "13.5mm" : "11mm",
              height: isLarge ? "7.5mm" : "6.5mm",
            }}
          >
            <Image src="/logo.png" alt="فُلك" fill className="object-contain" priority />
          </div>
        </div>

        {/* Body: Photo on left + Info/Barcode on right */}
        <div className="flex items-center gap-[3.5mm] px-[2mm] flex-1 min-h-0 my-[1mm]">
          {/* Photo */}
          <div
            className="relative shrink-0 overflow-hidden bg-gray-100 shadow-inner"
            style={{
              width: isLarge ? "28mm" : "23.5mm",
              height: isLarge ? "34mm" : "28.5mm",
              clipPath: PHOTO_CLIP_PATH,
            }}
          >
            {student.photoUrl ? (
              <Image
                src={student.photoUrl}
                alt={student.name}
                fill
                sizes="140px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-[22pt]">
                {student.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Student Info & Barcode */}
          <div
            className="flex flex-col flex-1 min-w-0 justify-between py-[0.5mm]"
            style={{ height: isLarge ? "34mm" : "28.5mm" }}
          >
            {/* Arabic Details */}
            <div className="w-full text-right" dir="rtl">
              <h4
                className={`font-black text-gray-950 leading-tight truncate ${
                  isLarge ? "text-[12pt]" : "text-[10pt]"
                }`}
              >
                {student.name}
              </h4>
              <p
                className={`font-bold text-gray-700 mt-[1.2mm] truncate ${
                  isLarge ? "text-[9pt]" : "text-[7.5pt]"
                }`}
              >
                {student.className}
              </p>
              <p
                className={`font-bold text-gray-700 mt-[0.5mm] truncate ${
                  isLarge ? "text-[9pt]" : "text-[7.5pt]"
                }`}
              >
                {student.groupName}
              </p>
            </div>

            {/* Attendance Barcode */}
            <div className="w-full flex justify-end items-center mt-auto">
              {barcodeUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={barcodeUrl}
                  alt="Barcode"
                  className="object-contain object-right"
                  style={{
                    height: isLarge ? "16mm" : "12.5mm",
                    maxWidth: isLarge ? "50mm" : "42mm",
                    imageRendering: "pixelated",
                  }}
                />
              ) : (
                <div className="h-[10mm] w-[35mm] bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-[6pt] text-gray-400">
                  Barcode
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: ID & Teacher Phone */}
        <div className="px-[2mm] pt-[1mm] pb-[0.5mm] shrink-0 w-full">
          <div
            className={`flex items-center justify-between border-t-[1pt] border-gray-400/70 pt-[1mm] text-gray-700 font-bold ${
              isLarge ? "text-[7.5pt]" : "text-[6.5pt]"
            }`}
          >
            <span className="font-mono tracking-tight" dir="ltr">
              ID: {student.qrToken ? student.qrToken.slice(0, 16) : "—"}
            </span>
            <span className="font-mono tracking-tight" dir="ltr">
              Tel: {teacher?.phone || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * High-Precision Back Face (with size scaling)
 */
export function StudentCardBack({
  student,
  teacher,
  parentQrUrl,
  showCutGuides = true,
  sizePreset = "large",
}: CardProps) {
  const dims = CARD_SIZES[sizePreset] || CARD_SIZES.large;
  const isLarge = sizePreset === "large" || sizePreset === "extra-large";

  return (
    <div
      className="card-slot relative bg-white select-none overflow-hidden"
      style={{
        width: `${dims.widthMm}mm`,
        height: `${dims.heightMm}mm`,
        minWidth: `${dims.widthMm}mm`,
        minHeight: `${dims.heightMm}mm`,
        maxWidth: `${dims.widthMm}mm`,
        maxHeight: `${dims.heightMm}mm`,
        boxSizing: "border-box",
        border: showCutGuides ? "0.35pt dashed #cbd5e1" : "none",
        borderRadius: "3.5mm",
      }}
      dir="ltr"
    >
      <div className="w-full h-full flex flex-col justify-between p-[2.5mm] bg-white text-gray-900">
        {/* Header: Wordmark + Logo */}
        <div className="flex items-center justify-between px-[2mm] pt-[1mm] h-[8.5mm] shrink-0">
          <span
            className={`font-black tracking-widest text-[#056239] uppercase leading-none ${
              isLarge ? "text-[11.5pt]" : "text-[9.5pt]"
            }`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            RASHAD
          </span>
          <div
            className="relative"
            style={{
              width: isLarge ? "13.5mm" : "11mm",
              height: isLarge ? "7.5mm" : "6.5mm",
            }}
          >
            <Image src="/logo.png" alt="فُلك" fill className="object-contain" priority />
          </div>
        </div>

        {/* Body: Parent QR on left + Motivational Quote & Teacher Signature on right */}
        <div className="flex items-center gap-[3.5mm] px-[2mm] flex-1 min-h-0 my-[1mm]">
          {/* QR Box */}
          <div
            className="flex flex-col items-center shrink-0"
            style={{ width: isLarge ? "28mm" : "23.5mm" }}
          >
            <div
              className="relative"
              style={{
                width: isLarge ? "24mm" : "19mm",
                height: isLarge ? "24mm" : "19mm",
              }}
            >
              {parentQrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={parentQrUrl}
                  alt="QR ولي الأمر"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-[6pt] text-gray-400">
                  QR
                </div>
              )}
            </div>
            <span
              className={`font-bold text-gray-800 mt-[1mm] whitespace-nowrap ${
                isLarge ? "text-[7.5pt]" : "text-[6.5pt]"
              }`}
            >
              متابعة ولي الامر
            </span>
          </div>

          {/* Quotes & Signature */}
          <div
            className="flex flex-col flex-1 min-w-0 justify-between py-[0.5mm]"
            style={{ height: isLarge ? "34mm" : "28.5mm" }}
            dir="rtl"
          >
            <div className="w-full text-center mt-[0.5mm]">
              <p
                className={`font-black text-gray-950 leading-tight ${
                  isLarge ? "text-[9.5pt]" : "text-[7.5pt]"
                }`}
              >
                &quot; انت تصنع مستقبلك بنفسك &quot;
              </p>
              <p
                className={`font-black text-gray-950 leading-tight mt-[1mm] ${
                  isLarge ? "text-[9.5pt]" : "text-[7.5pt]"
                }`}
              >
                &quot; خليك قد ثقة اهلك فيك &quot;
              </p>
            </div>

            {/* Signature Block */}
            <div className="flex flex-col items-center mt-auto self-start ml-[2mm]">
              <div
                className="relative"
                style={{
                  width: isLarge ? "26mm" : "21mm",
                  height: isLarge ? "11mm" : "9mm",
                }}
              >
                {teacher?.signatureUrl ? (
                  <Image
                    src={teacher.signatureUrl}
                    alt="Signature"
                    fill
                    className="object-contain"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-[6pt]">
                    توقيع المدرس
                  </div>
                )}
              </div>
              <span
                className={`font-bold text-gray-800 border-t-[1pt] border-gray-400 px-[3mm] pt-[0.5mm] whitespace-nowrap ${
                  isLarge ? "text-[8.5pt]" : "text-[7pt]"
                }`}
              >
                {teacher?.name || "المدرس"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: ID & Teacher Phone */}
        <div className="px-[2mm] pt-[1mm] pb-[0.5mm] shrink-0 w-full">
          <div
            className={`flex items-center justify-between border-t-[1pt] border-gray-400/70 pt-[1mm] text-gray-700 font-bold ${
              isLarge ? "text-[7.5pt]" : "text-[6.5pt]"
            }`}
          >
            <span className="font-mono tracking-tight" dir="ltr">
              ID: {student.qrToken ? student.qrToken.slice(0, 16) : "—"}
            </span>
            <span className="font-mono tracking-tight" dir="ltr">
              Tel: {teacher?.phone || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty Placeholder Slot (keeps geometric grid balanced if cards count is odd)
 */
export function EmptyCardSlot({
  showCutGuides = true,
  sizePreset = "large",
}: {
  showCutGuides?: boolean;
  sizePreset?: CardSizePreset;
}) {
  const dims = CARD_SIZES[sizePreset] || CARD_SIZES.large;

  return (
    <div
      className="card-slot relative select-none"
      style={{
        width: `${dims.widthMm}mm`,
        height: `${dims.heightMm}mm`,
        minWidth: `${dims.widthMm}mm`,
        minHeight: `${dims.heightMm}mm`,
        maxWidth: `${dims.widthMm}mm`,
        maxHeight: `${dims.heightMm}mm`,
        boxSizing: "border-box",
        border: showCutGuides ? "0.35pt dashed #e2e8f0" : "none",
        borderRadius: "3.5mm",
      }}
    />
  );
}

/**
 * A4 Printable Sheet (210mm × 296mm - calibrated to eliminate extra blank page)
 */
export function A4PrintSheet({
  children,
  pageNumber,
  sheetType,
  sizePreset = "large",
}: {
  children: React.ReactNode;
  pageNumber: number;
  sheetType: "front" | "back";
  sizePreset?: CardSizePreset;
}) {
  const dims = CARD_SIZES[sizePreset] || CARD_SIZES.large;

  return (
    <div
      className="a4-print-page relative bg-white text-gray-900 shadow-md print:shadow-none mx-auto overflow-hidden"
      data-page-number={pageNumber}
      data-sheet-type={sheetType}
      style={{
        width: "210mm",
        height: "296mm",
        minWidth: "210mm",
        minHeight: "296mm",
        maxWidth: "210mm",
        maxHeight: "296mm",
        paddingLeft: `${dims.padLeftRightMm}mm`,
        paddingRight: `${dims.padLeftRightMm}mm`,
        paddingTop: `${dims.padTopBottomMm}mm`,
        paddingBottom: `${dims.padTopBottomMm}mm`,
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `${dims.widthMm}mm ${dims.widthMm}mm`,
          gridTemplateRows: `repeat(4, ${dims.heightMm}mm)`,
          columnGap: `${dims.colGapMm}mm`,
          rowGap: `${dims.rowGapMm}mm`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
