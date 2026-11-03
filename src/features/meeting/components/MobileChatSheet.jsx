import { useEffect, useRef, useState } from 'react'
import { MessageSquare, ChevronDown } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectMessages, selectUnreadCount } from '../store/meeting-selectors'
import { ChatPanel } from './ChatPanel'

/** ارتفاع کیبورد موبایل (iOS کیبورد را در layout viewport لحاظ نمی‌کند). */
function useKeyboardInset() {
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

/** یک خط پیش‌نمایش آخرین پیام زیر صحنه؛ با لمس، چت باز می‌شود. */
export function ChatPreview({ onOpen }) {
  const messages = useMeetingStore(selectMessages)
  const unread = useMeetingStore(selectUnreadCount)
  const last = messages[messages.length - 1]
  return (
    <button type="button" className="cl-preview" onClick={onOpen} aria-label="باز کردن گفتگو">
      <MessageSquare size={16} className="shrink-0 opacity-70" />
      <span className="cl-preview-text">
        {last ? <><b>{last.displayName || 'شرکت‌کننده'}:</b> {last.text}</> : 'گفتگو — برای نوشتن پیام لمس کنید'}
      </span>
      {unread > 0 && <span className="cl-preview-badge">{unread}</span>}
    </button>
  )
}

/** پنل گفتگوی کشویی از پایین؛ با کشیدن دستگیره به پایین یا لمس بیرون بسته می‌شود. */
export function MobileChatSheet({ open, onClose }) {
  const kb = useKeyboardInset()
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)

  // وضعیت «چت باز است» برای شمارنده‌ی پیام خوانده‌نشده
  useEffect(() => {
    useMeetingStore.setState({ isChatOpen: open })
    if (open) {
      const st = useMeetingStore.getState()
      st.setChatAtBottom(true)
      st.markMessagesAsRead()
    }
    return () => useMeetingStore.setState({ isChatOpen: false })
  }, [open])

  if (!open) return null

  const onDown = (e) => { startY.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId) }
  const onMove = (e) => { if (startY.current != null) setDragY(Math.max(0, e.clientY - startY.current)) }
  const onUp = () => {
    if (dragY > 80) onClose()
    startY.current = null
    setDragY(0)
  }

  return (
    <>
      <button type="button" aria-label="بستن گفتگو" className="cl-sheet-backdrop" onClick={onClose} />
      <div
        className="cl-sheet"
        role="dialog"
        aria-label="گفتگو"
        style={{ bottom: kb > 0 ? kb : 'var(--dock-h)', transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined, maxHeight: `calc(100dvh - ${kb}px - 72px)` }}
      >
        <div className="cl-sheet-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="cl-sheet-grip" />
          <button type="button" className="cl-sheet-close" onClick={onClose} aria-label="بستن"><ChevronDown size={18} /></button>
        </div>
        <div className="cl-sheet-body"><ChatPanel compact /></div>
      </div>
    </>
  )
}
