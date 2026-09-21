import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { X, Users, MessageSquare, GripVertical } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsPanelOpen, selectActivePanelTab } from '../store/meeting-selectors'
import { ParticipantList } from './ParticipantList'
import { ChatPanel } from './ChatPanel'

const DEFAULT_PARTICIPANT_HEIGHT = 42
const MIN_PARTICIPANT_HEIGHT = 24
const MAX_PARTICIPANT_HEIGHT = 72

export const SidePanel = memo(function SidePanel() {
  const isOpen = useMeetingStore(selectIsPanelOpen)
  const activeTab = useMeetingStore(selectActivePanelTab)
  const closePanel = useMeetingStore((s) => s.closePanel)
  const togglePanel = useMeetingStore((s) => s.togglePanel)
  const [participantHeight, setParticipantHeight] = useState(DEFAULT_PARTICIPANT_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const panelContentRef = useRef(null)
  const dragState = useRef(null)

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem('avestro-room-participant-height'))
      if (Number.isFinite(saved) && saved >= MIN_PARTICIPANT_HEIGHT && saved <= MAX_PARTICIPANT_HEIGHT) {
        setParticipantHeight(saved)
      }
    } catch {
      // Storage can be unavailable in private contexts.
    }
  }, [])

  const stopDragging = useCallback(() => {
    dragState.current = null
    setIsDragging(false)
    try {
      window.localStorage.setItem('avestro-room-participant-height', String(participantHeight))
    } catch {
      // Ignore storage errors.
    }
  }, [participantHeight])

  const updateFromPointer = useCallback((clientY) => {
    const panel = panelContentRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    if (!rect.height) return

    // RTL panel still uses physical top/bottom for vertical resizing.
    const next = ((clientY - rect.top) / rect.height) * 100
    setParticipantHeight(Math.min(MAX_PARTICIPANT_HEIGHT, Math.max(MIN_PARTICIPANT_HEIGHT, next)))
  }, [])

  const handlePointerMove = useCallback((event) => {
    if (!dragState.current) return
    updateFromPointer(event.clientY)
  }, [updateFromPointer])

  const handlePointerUp = useCallback(() => stopDragging(), [stopDragging])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'row-resize'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragState.current = { pointerId: event.pointerId }
    setIsDragging(true)
  }

  const handleDoubleClick = () => {
    setParticipantHeight(DEFAULT_PARTICIPANT_HEIGHT)
    try {
      window.localStorage.setItem('avestro-room-participant-height', String(DEFAULT_PARTICIPANT_HEIGHT))
    } catch {
      // Ignore storage errors.
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] md:hidden room-backdrop"
        onClick={closePanel}
      />

      <aside
        dir="rtl"
        className="room-sheet room-panel-desktop fixed bottom-0 left-0 right-0 z-50 h-[43vh] min-h-[300px] max-h-[520px] rounded-t-[26px] border-t room-border room-surface room-panel-shadow md:static md:h-full md:max-h-none md:min-h-0 md:w-[360px] md:rounded-[20px] md:border md:shrink-0 overflow-hidden flex flex-col"
      >
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-11 h-1 rounded-full bg-white/20" />
        </div>

        <div className="h-[54px] shrink-0 flex items-center px-3 border-b room-border">
          <div className="flex items-center gap-1 flex-1 justify-start">
            <TabButton active={activeTab === 'participants'} icon={<Users size={16} />} label="شرکت‌کنندگان" onClick={() => togglePanel('participants')} />
            <TabButton active={activeTab === 'chat'} icon={<MessageSquare size={16} />} label="گفتگو" onClick={() => togglePanel('chat')} />
          </div>
          <button onClick={closePanel} className="room-control w-9 h-9 rounded-xl bg-white/[.045] text-white/50 hover:text-white flex items-center justify-center" aria-label="بستن">
            <X size={17} />
          </button>
        </div>

        <div className="md:hidden flex-1 min-h-0">
          {activeTab === 'participants' ? <ParticipantList /> : <ChatPanel />}
        </div>

        <div ref={panelContentRef} className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
          <section
            className="min-h-0 border-b room-border flex flex-col shrink-0 overflow-hidden"
            style={{ height: `${participantHeight}%` }}
          >
            <ParticipantList />
          </section>

          <div
            role="separator"
            aria-label="تغییر ارتفاع شرکت‌کنندگان و گفتگو"
            aria-orientation="horizontal"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                const delta = event.key === 'ArrowUp' ? -3 : 3
                setParticipantHeight((value) => Math.min(MAX_PARTICIPANT_HEIGHT, Math.max(MIN_PARTICIPANT_HEIGHT, value + delta)))
              }
              if (event.key === 'Home') setParticipantHeight(MIN_PARTICIPANT_HEIGHT)
              if (event.key === 'End') setParticipantHeight(MAX_PARTICIPANT_HEIGHT)
            }}
            className={`room-panel-resizer shrink-0 h-3 -my-1.5 relative z-20 flex items-center justify-center cursor-row-resize touch-none ${isDragging ? 'is-dragging' : ''}`}
          >
            <span className="room-panel-resizer-line" />
            <span className="room-panel-resizer-grip"><GripVertical size={13} /></span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      </aside>
    </>
  )
})

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${active ? 'text-white bg-[var(--room-blue)]/12' : 'text-white/45 hover:text-white hover:bg-white/[.04]'}`}
    >
      {icon}
      <span>{label}</span>
      {active && <span className="absolute bottom-[-13px] left-3 right-3 h-0.5 rounded-full bg-[var(--room-blue)] shadow-[0_0_14px_rgba(77,125,255,.65)]" />}
    </button>
  )
}
