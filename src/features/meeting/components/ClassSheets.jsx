import { memo, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsPanelOpen, selectActivePanelTab } from '../store/meeting-selectors'
import { useViewportContext } from '../ClassViewportContext'
import { ChatPanel } from './ChatPanel'
import { ParticipantList } from './ParticipantList'

const CLOSE_DRAG_PX = 80

/**
 * شیت پایین کلاس در گوشی: گفتگو یا شرکت‌کنندگان (هیچ‌وقت هم‌زمان).
 * وضعیت باز/بسته از store می‌آید؛ پس بستن شیت پیام‌ها و وضعیت گفتگو را از بین نمی‌برد
 * (ChatPanel فقط نمایش است و پیام‌ها در store می‌مانند).
 * شیت داخل .cl-main می‌نشیند؛ ریل کنترل همیشه در دسترس می‌ماند.
 */
export const ClassSheets = memo(function ClassSheets({ canChat, canParticipants, canControl, onOpenAttendance }) {
  const isOpen = useMeetingStore(selectIsPanelOpen)
  const tab = useMeetingStore(selectActivePanelTab)
  const closePanel = useMeetingStore((s) => s.closePanel)
  const { toLocalDelta } = useViewportContext()

  const kind = !isOpen ? null : (tab === 'chat' && canChat ? 'chat' : (tab === 'participants' && canParticipants ? 'participants' : null))

  const [dragY, setDragY] = useState(0)
  const start = useRef(null)

  // با باز بودن گفتگو، پیام‌های جدید خوانده‌شده حساب می‌شوند و شمارنده صفر می‌ماند.
  useEffect(() => {
    if (kind !== 'chat') return
    const st = useMeetingStore.getState()
    st.setChatAtBottom(true)
    st.markMessagesAsRead()
  }, [kind])

  useEffect(() => {
    if (!kind) return undefined
    const onKey = (e) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [kind, closePanel])

  if (!kind) return null

  const onDown = (e) => {
    if (e.target.closest('button')) return
    start.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!start.current) return
    const d = toLocalDelta(e.clientX - start.current.x, e.clientY - start.current.y)
    setDragY(Math.max(0, d.y))
  }
  const onUp = () => {
    if (dragY > CLOSE_DRAG_PX) closePanel()
    start.current = null
    setDragY(0)
  }

  const title = kind === 'chat' ? 'گفتگو' : 'شرکت‌کنندگان'

  return (
    <div className="cl-sheet-layer">
      <button type="button" className="cl-sheet-backdrop" aria-label="بستن" onClick={closePanel} />
      <section
        className="cl-sheet"
        role="dialog"
        aria-label={title}
        style={dragY ? { transform: `translateY(${dragY}px)`, animation: 'none' } : undefined}
      >
        <div className="cl-sheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="cl-sheet-grip" aria-hidden="true" />
          <h2 className="cl-sheet-title">{title}</h2>
          <button type="button" className="cl-sheet-close" onClick={closePanel} aria-label={`بستن ${title}`}>
            <X size={18} />
          </button>
        </div>
        <div className="cl-sheet-body">
          {kind === 'chat'
            ? <ChatPanel compact />
            : <ParticipantList canControl={canControl} onOpenAttendance={onOpenAttendance} />}
        </div>
      </section>
    </div>
  )
})
