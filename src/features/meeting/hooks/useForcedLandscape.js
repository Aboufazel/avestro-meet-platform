import { useEffect, useMemo, useState } from 'react'

/**
 * چرخش کنترل‌شده‌ی محیط کلاس در موبایل (Landscape مجازی).
 *
 * الزام: کلاس در موبایل همیشه افقی دیده شود، حتی وقتی گوشی عمودی است.
 * چون مرورگرها اجازه‌ی قفل جهت صفحه را (بدون تمام‌صفحه) نمی‌دهند، محیط
 * داخلی ۹۰ درجه می‌چرخد؛ ابعاد از visualViewport خوانده می‌شود تا تغییر
 * جهت گوشی، بازشدن کیبورد و تغییر اندازه‌ی viewport بی‌درنگ اعمال شود.
 *
 * خروجی:
 *  - active : چرخش باید فعال باشد (موبایل عمودی + کلاس)
 *  - attrs  : { 'data-fl': '1' } برای قرارگرفتن روی ریشه‌ی room-shell
 *  - vars   : متغیرهای CSS (--fl-w/--fl-h/--fl-top) برای اندازه‌ی دقیق
 *  - requestNativeLandscape : تلاش برای تمام‌صفحه + قفل جهت واقعی (best-effort)
 */
const MOBILE_QUERY = '(max-width: 767.98px)'

export function useForcedLandscape({ enabled = false } = {}) {
  const isMobile = useMatchMedia(MOBILE_QUERY)
  const [portrait, setPortrait] = useState(() => detectPortrait())
  const [viewport, setViewport] = useState(() => readViewport())

  // جهت واقعی گوشی — با تغییر جهت، بازشدن کیبورد و resize دوباره محاسبه می‌شود
  useEffect(() => {
    const updateOrientation = () => setPortrait(detectPortrait())
    window.addEventListener('orientationchange', updateOrientation)
    window.addEventListener('resize', updateOrientation)
    return () => {
      window.removeEventListener('orientationchange', updateOrientation)
      window.removeEventListener('resize', updateOrientation)
    }
  }, [])

  // ابعاد دقیق visualViewport (کیبورد موبایل layout viewport را کوچک نمی‌کند؛
  // visualViewport کوچک می‌شود — پس ابعاد چرخش از همین‌جا می‌آید)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const update = () => setViewport(readViewport())
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const active = Boolean(enabled && isMobile && portrait)

  useEffect(() => {
    const root = document.documentElement
    if (!active) {
      root.style.removeProperty('--fl-w')
      root.style.removeProperty('--fl-h')
      root.style.removeProperty('--fl-top')
      return undefined
    }
    const { width, height, top } = viewport
    root.style.setProperty('--fl-w', `${Math.round(width)}px`)
    root.style.setProperty('--fl-h', `${Math.round(height)}px`)
    root.style.setProperty('--fl-top', `${Math.round(top)}px`)
    return () => {
      root.style.removeProperty('--fl-w')
      root.style.removeProperty('--fl-h')
      root.style.removeProperty('--fl-top')
    }
  }, [active, viewport])

  // جلوگیری از اسکرول ناخواسته‌ی سند وقتی محیط چرخیده است
  useEffect(() => {
    if (!active) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])

  const requestNativeLandscape = useMemo(() => async () => {
    try {
      const element = document.documentElement
      if (!document.fullscreenElement && element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: 'hide' })
      }
      // پشتیبانی مرورگرها از قفل جهت کامل نیست؛ خطای آن نباید مانع تمام‌صفحه شود
      if (screen.orientation?.lock) {
        try { await screen.orientation.lock('landscape') } catch { /* مرورگر اجازه نمی‌دهد */ }
      }
    } catch {
      /* کاربر/مرورگر اجازه نداد؛ چرخش داخلی همچنان فعال می‌ماند */
    }
  }, [])

  return { active, attrs: active ? { 'data-fl': '1' } : {}, requestNativeLandscape }
}

function detectPortrait() {
  if (typeof window === 'undefined') return false
  // innerHeight > innerWidth معیار مستقیم جهت است؛ orientation media query هم
  // برای پوشش دستگاه‌هایی که گزارش جهت‌شان به‌روز نمی‌شود.
  return window.innerHeight > window.innerWidth
}

function readViewport() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (vv) {
    return {
      width: vv.width || window.innerWidth,
      height: vv.height || window.innerHeight,
      top: vv.offsetTop || 0,
    }
  }
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    top: 0,
  }
}

function useMatchMedia(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [query])
  return matches
}
