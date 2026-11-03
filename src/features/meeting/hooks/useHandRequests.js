import { useEffect, useMemo, useRef, useState } from 'react'

const AUTO_DISMISS_MS = 9000

/**
 * درخواست‌های اجازه‌ی صحبت برای مدرس؛ مستقیم از roster لحظه‌ای سرور (useClassAccess).
 *
 *  pending  : همه‌ی درخواست‌های در انتظار (به ترتیب زمان) — برای شمارنده‌ی دکمه‌ی شرکت‌کنندگان
 *  notices  : اعلان‌های هنوز دیده‌نشده (هر درخواست فقط یک بار؛ بعد از ۹ ثانیه خودکار جمع می‌شوند)
 *  dismiss  : بستن اعلان بدون رد درخواست
 *
 * هویت هر درخواست = key + hand_at؛ پس بلندکردن دوباره‌ی دست یک اعلان تازه می‌سازد
 * ولی رویداد تکراری سرور برای همان درخواست اعلان دوباره نمی‌سازد.
 * با تأیید/رد/پایین‌آمدن دست، اعلان و شمارنده خودکار از roster پاک می‌شوند.
 */
export function useHandRequests(roster, enabled) {
  const [dismissed, setDismissed] = useState(() => new Set())
  const announced = useRef(new Set())
  const timers = useRef(new Map())

  const pending = useMemo(() => {
    if (!enabled) return []
    return (roster || [])
      .filter((p) => p.hand_at)
      .sort((a, b) => new Date(a.hand_at) - new Date(b.hand_at))
      .map((p) => ({ id: `${p.key}:${p.hand_at}`, key: p.key, name: p.name, at: p.hand_at }))
  }, [roster, enabled])

  useEffect(() => {
    const live = new Set(pending.map((r) => r.id))

    // هر درخواست جدید فقط یک بار اعلام می‌شود و تایمر بستن خودکار می‌گیرد.
    pending.forEach((r) => {
      if (announced.current.has(r.id)) return
      announced.current.add(r.id)
      timers.current.set(r.id, window.setTimeout(() => {
        setDismissed((prev) => new Set(prev).add(r.id))
        timers.current.delete(r.id)
      }, AUTO_DISMISS_MS))
    })

    // درخواست‌های تمام‌شده (تأیید/رد/پایین‌آمدن دست) از حافظه و تایمرها پاک شوند.
    announced.current.forEach((id) => { if (!live.has(id)) announced.current.delete(id) })
    timers.current.forEach((timer, id) => {
      if (!live.has(id)) { window.clearTimeout(timer); timers.current.delete(id) }
    })
  }, [pending])

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((t) => window.clearTimeout(t))
  }, [])

  const notices = pending.filter((r) => !dismissed.has(r.id))
  const dismiss = (id) => setDismissed((prev) => new Set(prev).add(id))
  const dismissAll = () => setDismissed((prev) => new Set([...prev, ...pending.map((r) => r.id)]))

  return { pending, notices, dismiss, dismissAll }
}
