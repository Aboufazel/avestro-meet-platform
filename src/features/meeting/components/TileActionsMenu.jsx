import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Pin,
  PinOff,
  ZoomIn,
  ZoomOut,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'

/**
 * منوی عملیات یک تایل (پین / Focus / بزرگ‌نمایی).
 *
 * چرا portal:
 * قبلاً منو داخل خود تایل رندر می‌شد. تایل `transform` دارد (hover و انیمیشن)
 * و هر ancestor با transform، `position: fixed` را نسبت به خودش حساب می‌کند،
 * نه نسبت به صفحه؛ برای همین منو بالای تایل گیر می‌کرد و بریده می‌شد.
 * با createPortal به document.body، منو همیشه نسبت به viewport جای می‌گیرد.
 *
 * موبایل : bottom sheet کامل با backdrop (لمس بیرون = بستن)
 * دسکتاپ : popover کنار دکمه، با جلوگیری از خروج از صفحه
 */
export function TileActionsMenu({
  name,
  isPinned,
  isFocused,
  zoom,
  onTogglePin,
  onToggleFocus,
  onZoomIn,
  onZoomReset,
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  const close = () => setOpen(false)

  // موقعیت popover دسکتاپ نسبت به دکمه
  useLayoutEffect(() => {
    if (!open || !isDesktop) return
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const width = 190
    const height = popoverRef.current?.offsetHeight || 190
    const margin = 8

    let left = rect.left
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))

    let top = rect.bottom + 6
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - height - 6)
    }

    setPos({ left, top })
  }, [open, isDesktop])

  // بستن با Escape / کلیک بیرون / scroll / resize
  useEffect(() => {
    if (!open) return

    const onKey = (e) => e.key === 'Escape' && close()
    const onPointerDown = (e) => {
      if (!isDesktop) return // موبایل با backdrop بسته می‌شود
      if (
        popoverRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) {
        return
      }
      close()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, isDesktop])

  // اسکرول صفحه‌ی پشت bottom sheet قفل شود
  useEffect(() => {
    if (!open || isDesktop) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, isDesktop])

  const run = (fn) => () => {
    fn()
    close()
  }

  const items = [
    {
      key: 'pin',
      icon: isPinned ? PinOff : Pin,
      label: isPinned ? 'برداشتن پین' : 'پین کردن',
      active: isPinned,
      onClick: run(onTogglePin),
    },
    {
      key: 'focus',
      icon: isFocused ? Minimize2 : Maximize2,
      label: isFocused ? 'خروج از Focus' : 'ورود به Focus',
      active: isFocused,
      onClick: run(onToggleFocus),
    },
    {
      key: 'zoom-in',
      icon: ZoomIn,
      label: 'نمایش بزرگ‌تر',
      onClick: run(onZoomIn),
    },
    {
      key: 'zoom-reset',
      icon: ZoomOut,
      label: zoom !== 100 ? `بازنشانی اندازه (${zoom}%)` : 'بازنشانی اندازه',
      disabled: zoom === 100,
      onClick: run(onZoomReset),
    },
  ]

  const menu = !open
    ? null
    : isDesktop
      ? (
        <div
          ref={popoverRef}
          role="menu"
          style={{
            position: 'fixed',
            left: pos?.left ?? 0,
            top: pos?.top ?? 0,
            width: 190,
            visibility: pos ? 'visible' : 'hidden',
          }}
          className="z-[100] rounded-2xl border room-border bg-[var(--room-surface)] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.45)]"
        >
          {items.map(({ key, icon: Icon, label, active, disabled, onClick }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={onClick}
              className={`w-full h-10 px-3 rounded-xl flex items-center gap-2 text-xs transition-colors disabled:opacity-35 disabled:pointer-events-none ${
                active
                  ? 'bg-[var(--room-blue)]/20 text-white'
                  : 'text-white/80 hover:bg-white/[.06]'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )
      : (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={`گزینه‌های ${name}`}>
          <div className="absolute inset-0 bg-black/60 room-backdrop" onClick={close} />

          <div className="room-sheet absolute inset-x-0 bottom-0 rounded-t-[26px] border-t room-border bg-[var(--room-surface)] px-3 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.5)]">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" aria-hidden="true" />

            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-sm font-medium text-white/85 truncate">{name}</span>
              <button
                type="button"
                onClick={close}
                aria-label="بستن"
                className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-white/55 active:bg-white/[.06]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {items.map(({ key, icon: Icon, label, active, disabled, onClick }) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={onClick}
                  className={`h-14 px-4 rounded-2xl flex items-center gap-3 text-[14px] border transition-colors disabled:opacity-35 ${
                    active
                      ? 'bg-[var(--room-blue)] border-[var(--room-blue)]/50 text-white'
                      : 'bg-white/[.045] border-white/[.07] text-white/85 active:bg-white/[.09]'
                  }`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="گزینه‌های تصویر"
        aria-label="گزینه‌های تصویر"
        className={`absolute z-40 flex items-center justify-center border border-white/10 bg-black/65 text-white/80 hover:text-white active:scale-95 transition-opacity
          bottom-2 left-2 w-8 h-8 rounded-lg
          md:bottom-auto md:top-2 md:w-9 md:h-9 md:rounded-xl
          md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${open ? 'md:!opacity-100' : ''}`}
      >
        <MoreHorizontal size={16} />
      </button>

      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </>
  )
}
