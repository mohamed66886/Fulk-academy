import QRCode from "qrcode";

export interface QrCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generates a high-quality Data URL (base64 image/png) from a given token
 */
export async function generateQrDataUrl(
  token: string,
  options: QrCodeOptions = {}
): Promise<string> {
  if (!token) return "";

  try {
    return await QRCode.toDataURL(token, {
      width: options.width || 200,
      margin: options.margin !== undefined ? options.margin : 1,
      errorCorrectionLevel: options.errorCorrectionLevel || "M",
      color: {
        dark: options.darkColor || "#0F172A",
        light: options.lightColor || "#FFFFFF",
      },
    });
  } catch {
    return "";
  }
}

/**
 * Generates an SVG string from a given token (ideal for vector rendering / print)
 */
export async function generateQrSvg(token: string, options: QrCodeOptions = {}): Promise<string> {
  if (!token) return "";

  try {
    return await QRCode.toString(token, {
      type: "svg",
      width: options.width || 200,
      margin: options.margin !== undefined ? options.margin : 1,
      errorCorrectionLevel: options.errorCorrectionLevel || "M",
      color: {
        dark: options.darkColor || "#0F172A",
        light: options.lightColor || "#FFFFFF",
      },
    });
  } catch {
    return "";
  }
}
