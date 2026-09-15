/**
 * Arabic Text Normalization for Search
 * Removes diacritics (tashkeel), normalizes alef variations, taa marbuta, and alif maqsura.
 */
export function normalizeArabic(text: string): string {
  if (!text) return "";
  return (
    text
      .toLowerCase()
      .trim()
      // Remove diacritics / Tashkeel: Fatha, Damma, Kasra, Sukun, Shadda, Tanween, etc.
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // Normalize Alef variations (أ, إ, آ -> ا)
      .replace(/[أإآٱ]/g, "ا")
      // Normalize Taa Marbuta (ة -> ه)
      .replace(/ة/g, "ه")
      // Normalize Alif Maqsura (ى -> ي)
      .replace(/ى/g, "ي")
      // Normalize Persian/Urdu variants (ك, ي)
      .replace(/ك/g, "ك")
      .replace(/ي/g, "ي")
      // Collapse multiple whitespace
      .replace(/\s+/g, " ")
  );
}

/**
 * Builds normalized search index string combining all searchable student fields
 */
export function buildStudentSearchIndex(data: {
  name: string;
  phone: string;
  parentPhone?: string;
  parentName?: string;
}): string {
  const parts = [
    normalizeArabic(data.name || ""),
    (data.phone || "").replace(/\s+/g, ""),
    (data.parentPhone || "").replace(/\s+/g, ""),
    normalizeArabic(data.parentName || ""),
  ];
  return parts.filter(Boolean).join(" ");
}
