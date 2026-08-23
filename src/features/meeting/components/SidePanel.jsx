import { memo } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsPanelOpen } from '../store/meeting-selectors'
import { ParticipantList } from './ParticipantList'
import { ChatPanel } from './ChatPanel'
import { X } from 'lucide-react'

export const SidePanel = memo(function SidePanel() {
  const isOpen = useMeetingStore(selectIsPanelOpen)
  const closePanel = useMeetingStore((s) => s.closePanel)

  if (!isOpen) return null

  return (
    <>
      {/* بک‌دراپ فقط روی موبایل */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={closePanel}
      />

      <aside
        className="
          fixed bottom-0 left-0 right-0 z-50 h-[70vh] rounded-t-2xl
          md:static md:z-auto md:h-full md:rounded-none md:w-80
          border-t md:border-t-0 md:border-r border-olive-800
          bg-olive-950 shrink-0 flex flex-col
        "
      >
        {/* دستگیره‌ی موبایل */}
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-olive-700" />
        </div>

        {/* دکمه بستن روی موبایل */}
        <button
          onClick={closePanel}
          className="md:hidden absolute top-2 left-2 w-8 h-8 flex items-center justify-center text-olive-400"
        >
          <X size={18} />
        </button>

        {/* شرکت‌کننده‌ها — ارتفاع محدود، قابل اسکرول */}
        <div className="max-h-[35%] min-h-[120px] border-b border-olive-800 flex flex-col shrink-0">
          <ParticipantList />
        </div>

        {/* چت — بقیه‌ی فضا */}
        <div className="flex-1 min-h-0">
          <ChatPanel />
        </div>
      </aside>
    </>
  )
})