import { useCallback, useEffect, useRef, useState } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import { ChatPanel } from './ChatPanel'
import { ParticipantList } from './ParticipantList'
import { useKeyboardInset } from '../hooks/useKeyboardInset'

/**
 * Bottom Sheet مشترک پنل‌های کلاس در موبایل.
 *
 *  • گفتگو و شرکت‌کنندگان هرگز هم‌زمان باز نمی‌شوند (یک تب فعال)
 *  • ارتفاع نزدیک به تمام محیط کلاس؛ دکمه‌ی بستن واضح در بالا
 *  • بستن با کشیدن دستگیره به پایین یا لمس بیرون پنل
 *  • وضعیت پیام‌ها و فهرست افراد در استور می‌ماند؛ بستن پنل چیزی را از بین نمی‌برد
 */
export function MobileClassSheets({ openTab, onClose, canControl = false, onOpenAttendance }) {
  const kb = useKeyboardInset()
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)

  // وضعیت «چت باز است» برای شمارنده‌ی پیام‌های خوانده‌نشده
  useEffect(() => {
    useMeetingStore.setState({ isChatOpen: openTab === 'chat' })
    if (openTab === 'chat') {
      const st = useMeetingStore.getState()
      st.setChatAtBottom(true)
      st.markMessagesAsRead()
    }
    return () => useMeetingStore.setState({ isChatOpen: false })
  }, [openTab])

  const onDown = useCallback((e) => {
    startY.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [])
  const onMove = useCallback((e) => {
    if (startY.current != null) setDragY(Math.max(0, e.clientY - startY.current))
  }, [])
  const onUp = useCallback(() => {
    if (dragY > 80) onClose()
    startY.current = null
    setDragY(0)
  }, [dragY, onClose])

  if (!openTab) return null

  return (
    <>
      <button type="button" aria-label="بستن پنل" className="cl-sheet-backdrop" onClick={onClose} />
      <div
        className="cl-sheet"
        role="dialog"
        aria-label={openTab === 'chat' ? 'گفتگو' : 'شرکت‌کنندگان'}
        style={{
          bottom: kb > 0 ? kb : 6,
          top: 6,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? 'none' : undefined,
        }}
      >
        <div className="cl-sheet-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="cl-sheet-grip" />
          <span className="cl-sheet-title">
            {openTab === 'chat' ? 'گفت‌وگو' : 'شرکت‌کنندگان'}
          </span>
          <button type="button" className="cl-sheet-close" onClick={onClose} aria-label="بستن">✕</button>
        </div>
        <div className="cl-sheet-body">
          {openTab === 'chat'
            ? <ChatPanel compact />
            : <ParticipantList canControl={canControl} onOpenAttendance={onOpenAttendance} />}
        </div>
      </div>
    </>
  )
}

/** دکمه‌ی کوچک برای نمایش دوباره‌ی نوار کنترل بعد از جمع‌شدن خودکار آن. */
export function DockPeek({ onShow }) {
  return (
    <button type="button" className="cl-dock-peek" onClick={onShow} aria-label="نمایش نوار کنترل">
      ▾
    </button>
  )
}
