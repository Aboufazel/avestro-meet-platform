import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * مدیریت فوکوس دیالوگ: ورود به عنصر data-autofocus، حبس Tab، بستن با Escape،
 * قفل اسکرول پس‌زمینه و برگرداندن فوکوس به عنصر قبلی.
 */
export function useDialogFocus(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('[data-autofocus]')?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !ref.current) return
      const nodes = [...ref.current.querySelectorAll(FOCUSABLE)]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous && previous.focus) previous.focus()
    }
  }, [open, onClose])
  return ref
}
