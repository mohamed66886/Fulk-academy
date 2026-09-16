// Type declarations for W3C Barcode Detection API

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface Point2D {
  x: number;
  y: number;
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: Point2D[];
  format: string;
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
