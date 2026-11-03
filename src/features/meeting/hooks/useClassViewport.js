import { useEffect, useMemo, useState } from 'react'

/**
 * منبع واحد حقیقت برای ابعاد «محیط کلاس».
 *
 *  • گوشی (کوچک‌ترین بُعد صفحه < ۷۶۸): کلاس همیشه افقی نمایش داده می‌شود.
 *    اگر گوشی عمودی است، کل محیط ۹۰ درجه می‌چرخد (rotated = true)؛ پس نباید به
 *    media queryهای orientation تکیه کرد.
 *  • ابعاد از visualViewport می‌آید تا بازشدن کیبورد و نوار آدرس را هم پوشش دهد.
 *  • lw / lh ابعاد «محلی» (بعد از چرخش) هستند؛ compact یعنی چیدمان گوشی.
 */
const PHONE_MAX = 768

function readViewport() {
  if (typeof window === 'undefined') return { rotated: false, compact: false, lw: 1280, lh: 720, offsetTop: 0, offsetLeft: 0 }
  const vv = window.visualViewport
  const vw = Math.round(vv?.width ?? window.innerWidth)
  const vh = Math.round(vv?.height ?? window.innerHeight)

  const shortSide = Math.min(window.screen?.width || vw, window.screen?.height || vh)
  const isPhone = shortSide < PHONE_MAX
  const orientation = window.screen?.orientation?.type
  const portrait = orientation ? orientation.startsWith('portrait') : window.innerHeight >= window.innerWidth

  const rotated = isPhone && portrait
  const lw = rotated ? vh : vw
  const lh = rotated ? vw : vh
  const compact = isPhone || lw < PHONE_MAX
  return {
    rotated,
    compact,
    lw,
    lh,
    offsetTop: Math.round(vv?.offsetTop ?? 0),
    offsetLeft: Math.round(vv?.offsetLeft ?? 0),
  }
}

export function useClassViewport(enabled = true) {
  const [vp, setVp] = useState(readViewport)

  useEffect(() => {
    if (!enabled) return undefined
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = readViewport()
        setVp((prev) => (
          prev.rotated === next.rotated && prev.compact === next.compact &&
          prev.lw === next.lw && prev.lh === next.lh &&
          prev.offsetTop === next.offsetTop && prev.offsetLeft === next.offsetLeft
            ? prev
            : next
        ))
      })
    }
    const vv = window.visualViewport
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.screen?.orientation?.addEventListener?.('change', update)
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.screen?.orientation?.removeEventListener?.('change', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [enabled])

  // استایل پوسته‌ی اتاق. دسکتاپ: بدون دخالت (fixed inset-0 همان‌طور که بود).
  const shellStyle = useMemo(() => {
    if (!enabled || !vp.compact) return undefined
    if (vp.rotated) {
      return {
        top: 0,
        left: vp.lh,
        right: 'auto',
        bottom: 'auto',
        width: vp.lw,
        height: vp.lh,
        transform: 'rotate(90deg)',
        transformOrigin: 'top left',
      }
    }
    return { top: vp.offsetTop, left: vp.offsetLeft, right: 'auto', bottom: 'auto', width: vp.lw, height: vp.lh }
  }, [enabled, vp])

  // بردار حرکت صفحه (clientX/Y) → بردار در دستگاه مختصات چرخیده‌ی رابط.
  const toLocalDelta = useMemo(() => (
    vp.rotated
      ? (dx, dy) => ({ x: dy, y: -dx })
      : (dx, dy) => ({ x: dx, y: dy })
  ), [vp.rotated])

  return useMemo(() => ({ ...vp, shellStyle, toLocalDelta }), [vp, shellStyle, toLocalDelta])
}
