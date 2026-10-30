import { useEffect, useState } from 'react'

/**
 * ارتفاع اشغال‌شده توسط کیبورد موبایل (iOS کیبورد را در layout viewport لحاظ نمی‌کند).
 * با visualViewport محاسبه می‌شود تا کادر ارسال پیام هرگز پشت کیبورد پنهان نشود.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return inset
}
