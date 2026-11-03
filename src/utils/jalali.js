/**
 * کمک‌های تاریخ شمسی روی پکیج react-multi-date-picker (react-date-object).
 *
 * قرارداد پروژه: مقدار ذخیره/ارسال همیشه میلادی است؛ فقط نمایش و انتخاب شمسی است.
 * فرمت «محلی» = 'YYYY-MM-DDTHH:mm' (همان خروجی datetime-local) تا منطق فرم‌ها (ISO و ...) تغییری نکند.
 */
import DateObjectModule from 'react-date-object'
import persianModule from 'react-date-object/calendars/persian'
import persianFaModule from 'react-date-object/locales/persian_fa'

/** رفع ناسازگاری CJS/ESM در Vite: اگر ماژول به‌صورت {default: x} آمد، x را بده */
export const unwrap = (m) => (m && typeof m === 'object' && 'default' in m ? m.default : m)

const DateObject = unwrap(DateObjectModule)
export const persian = unwrap(persianModule)
export const persian_fa = unwrap(persianFaModule)

const pad = (n) => String(n).padStart(2, '0')

/** Date جاوااسکریپت → DateObject شمسی */
export function toPersian(date) {
  return new DateObject({ date, calendar: persian, locale: persian_fa })
}

/** 'YYYY-MM-DDTHH:mm' (محلی) → Date یا null */
export function parseLocal(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value || '')
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0'] = m
  return new Date(+y, +mo - 1, +d, +h, +mi)
}

/** Date → 'YYYY-MM-DDTHH:mm' (وقت محلی) */
export function formatLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO (UTC) از API → مقدار محلی برای فرم‌ها */
export function isoToLocalValue(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : formatLocal(d)
}

/** تاریخ شمسی یک ISO، مثل «۱۴۰۵/۰۸/۰۴» (یا با ساعت) */
export function formatIsoJalali(iso, { withTime = false } = {}) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return toPersian(d).format(withTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD')
}

/** ساعت یک ISO، مثل «۱۸:۳۰» */
export function formatIsoTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return toPersian(d).format('HH:mm')
}
