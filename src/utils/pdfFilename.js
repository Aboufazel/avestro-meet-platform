// نام فایل را از هدر Content-Disposition می‌خواند (filename* = نام فارسی)؛ اگر نبود null.
export function pdfFilename(header) {
  if (!header) return null
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (star) {
    try { return decodeURIComponent(star[1].trim()) } catch { /* ignore */ }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain ? plain[1].trim() : null
}
