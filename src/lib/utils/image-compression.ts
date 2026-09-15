/**
 * Client-side image compression utility using HTML5 Canvas.
 * Resizes images to avatar-appropriate dimensions (e.g., max 400x400)
 * and compresses quality to reduce phone camera uploads from 5-10MB to ~30-60KB.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
}

export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const { maxWidth = 400, maxHeight = 400, quality = 0.82, mimeType = "image/webp" } = options;

  // If already very small (under 40KB) and not an oversized dimension, keep original
  if (file.size < 40 * 1024 && file.type === "image/webp") {
    return file;
  }

  return new Promise((resolve) => {
    // Only process standard images
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const extension = mimeType === "image/webp" ? "webp" : "jpg";
            const originalBase = file.name.substring(0, file.name.lastIndexOf(".")) || "photo";
            const newName = `${originalBase}_compressed.${extension}`;

            const compressedFile = new File([blob], newName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
