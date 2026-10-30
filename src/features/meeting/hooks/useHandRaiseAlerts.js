import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * اعلان واقعی «درخواست اجازه صحبت» برای مدرس.
 *
 * منبع داده، رسترِ لحظه‌ای WebSocket کلاس است (useClassAccess → roster)؛
 * هیچ پیام ساختگی‌ای در کار نیست. صف اعلان‌ها «مشتق» از رستر است:
 *  • هر ورودیِ با hand_at = یک درخواست زنده → اعلان؛ پس برای یک درخواست واحد
 *    هرگز اعلان تکراری ساخته نمی‌شود و با تأیید/رد/خروج دانش‌آموز، هم اعلان
 *    و هم شمارنده‌ی در انتظار بی‌درنگ به‌روز می‌شود (همگام با سرور).
 *  • درخواست‌ها به ترتیب زمان درخواست نمایش داده می‌شوند؛ هیچ درخواستی گم نمی‌شود.
 *  • بسته‌شدن اعلان (دستی یا خودکار بعد از ۹ ثانیه) با dismissedIds نگه داشته
 *    می‌شود؛ اگر همان دانش‌آموز دوباره درخواست دهد، hand_at جدید است → اعلان جدید.
 *    درخواستِ در انتظار همچنان در پنل شرکت‌کنندگان و روی بج دکمه دیده می‌شود.
 */
export function useHandRaiseAlerts({ enabled = false, roster = [] } = {}) {
  const [dismissedIds, setDismissedIds] = useState(() => new Set())

  const liveRequests = useMemo(() => {
    if (!enabled) return []
    return (roster || [])
      .filter((item) => item?.hand_at)
      .sort((a, b) => new Date(a.hand_at) - new Date(b.hand_at))
      .map((item) => ({
        id: `${item.key}:${item.hand_at}`,
        key: item.key,
        name: item.name || 'دانش‌آموز',
        handAt: item.hand_at,
      }))
  }, [enabled, roster])

  const alerts = useMemo(
    () => liveRequests.filter((alert) => !dismissedIds.has(alert.id)),
    [liveRequests, dismissedIds]
  )

  // تعداد درخواست‌های در انتظار (برای بج روی دکمه‌ی شرکت‌کنندگان)
  const pendingCount = liveRequests.length

  const dismiss = useCallback((id) => {
    setDismissedIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })
  }, [])

  const current = alerts[0] || null

  // اعلان جلوی صف بعد از ۹ ثانیه خودش جمع می‌شود
  useEffect(() => {
    if (!current) return undefined
    const timer = window.setTimeout(() => dismiss(current.id), 9000)
    return () => window.clearTimeout(timer)
  }, [current, dismiss])

  return {
    current,
    queuedCount: alerts.length,
    pendingCount,
    dismiss,
  }
}
