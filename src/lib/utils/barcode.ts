import JsBarcode from "jsbarcode";

export interface BarcodeOptions {
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  fontOptions?: string;
  font?: string;
  fontSize?: number;
  text?: string;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
}

/**
 * Generates a high-quality Data URL (base64 image/png) from a given token using HTML5 Canvas
 */
export function generateBarcodeDataUrl(token: string, options: BarcodeOptions = {}): string {
  if (!token || typeof window === "undefined") return "";

  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, token, {
      format: options.format || "CODE128",
      width: options.width ?? 1.4,
      height: options.height ?? 38,
      displayValue: options.displayValue !== undefined ? options.displayValue : true,
      fontSize: options.fontSize ?? 10,
      font: "monospace",
      margin: options.margin !== undefined ? options.margin : 4,
      background: options.background || "#FFFFFF",
      lineColor: options.lineColor || "#0F172A",
      text: options.text,
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Barcode generation error:", err);
    return "";
  }
}
