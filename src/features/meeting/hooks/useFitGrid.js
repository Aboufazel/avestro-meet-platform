import { useEffect, useState } from 'react'

/**
 * اندازه‌ی کارت‌ها را طوری حساب می‌کند که همه‌ی کارت‌ها تا حد ممکن بزرگ و
 * بدون اسکرول در فضای در دسترس جا شوند. اگر کارت‌ها از حداقل کوچک‌تر می‌شدند،
 * اندازه روی حداقل می‌ماند و فهرست اسکرول عمودی می‌گیرد.
 *
 * کارت = تصویر با نسبت aspect + نوار اطلاعات با ارتفاع ثابت infoH.
 */
export function computeFitGrid({ width, height, count, aspect, infoH, gap, minW, maxW }) {
  if (!width || !height || count < 1) return { cardW: minW, cols: 1, scroll: false }

  let best = null
  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols)
    const byWidth = (width - gap * (cols - 1)) / cols
    const byHeight = ((height - gap * (rows - 1)) / rows - infoH) * aspect
    const w = Math.min(byWidth, byHeight, maxW)
    if (!best || w > best.w) best = { w, cols }
  }

  if (best.w >= minW) return { cardW: Math.floor(best.w), cols: best.cols, scroll: false }

  const cols = Math.max(1, Math.floor((width + gap) / (minW + gap)))
  const cardW = Math.min(maxW, Math.floor((width - gap * (cols - 1)) / cols))
  return { cardW, cols, scroll: true }
}

export function useFitGrid(ref, count, options) {
  const { aspect = 16 / 9, infoH = 30, gap = 10, minW = 150, maxW = 560 } = options || {}
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const measure = () => {
      const { clientWidth, clientHeight } = node
      setSize((prev) => (prev.width === clientWidth && prev.height === clientHeight ? prev : { width: clientWidth, height: clientHeight }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return computeFitGrid({ ...size, count, aspect, infoH, gap, minW, maxW })
}
