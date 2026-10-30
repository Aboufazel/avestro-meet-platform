/** سطح کیفیت اتصال: 'strong' | 'medium' | 'weak' — مشترک بین کارت تصویر و فهرست شرکت‌کنندگان. */
export function getConnectionLevel(quality, packetLoss) {
  // پکت‌لاس بالای ۱۰٪ مشکل واقعی است، مستقل از quality (که با adaptive bitrate جمع می‌شود).
  if (packetLoss != null && packetLoss > 10) return 'weak'
  if (quality == null) return 'strong'
  if (quality >= 60) return 'strong'
  if (quality >= 30) return 'medium'
  return 'weak'
}

export const CONNECTION_LABEL = {
  strong: 'اتصال خوب',
  medium: 'اتصال متوسط',
  weak: 'اتصال ضعیف',
}
