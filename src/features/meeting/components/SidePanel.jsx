import { memo } from 'react'
import { X, Users, MessageSquare } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'
import { selectIsPanelOpen, selectActivePanelTab } from '../store/meeting-selectors'
import { ParticipantList } from './ParticipantList'
import { ChatPanel } from './ChatPanel'

export const SidePanel = memo(function SidePanel() {
  const isOpen = useMeetingStore(selectIsPanelOpen)
  const activeTab = useMeetingStore(selectActivePanelTab)
  const closePanel = useMeetingStore((s) => s.closePanel)
  const togglePanel = useMeetingStore((s) => s.togglePanel)

  if (!isOpen) return null

  return (
    <>
      {/* بک‌دراپ فقط روی موبایل */}
      <div
        className="fixed inset-0 bg-neutral-950/60 z-40 md:hidden"
        onClick={closePanel}
      />

      <aside
        className="
          fixed bottom-0 left-0 right-0 z-50 h-[75vh] rounded-t-2xl
          md:static md:z-auto md:h-full md:rounded-none md:w-80
          border-t md:border-t-0 md:border-r border-neutral-800
          bg-neutral-950 shrink-0 flex flex-col
        "
      >
        {/* دستگیره‌ی موبایل */}
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        {/* تب‌های موبایل — فقط زیر md دیده میشه */}
        <div className="md:hidden flex items-center gap-1 px-3 pb-2 shrink-0">
          <TabButton
            active={activeTab === 'participants'}
            icon={<Users size={15} />}
            label="شرکت‌کنندگان"
            onClick={() => togglePanel('participants')}
          />
          <TabButton
            active={activeTab === 'chat'}
            icon={<MessageSquare size={15} />}
            label="گفتگو"
            onClick={() => togglePanel('chat')}
          />

          {/* دکمه‌ی بستن */}
          <button
            onClick={closePanel}
            className="
              mr-auto w-8 h-8 shrink-0 rounded-full flex items-center justify-center
              bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100
              transition-colors
            "
            aria-label="بستن"
          >
            <X size={16} />
          </button>
        </div>

        {/* دکمه‌ی بستن دسکتاپ — بالای پنل، گوشه */}
        <div className="hidden md:flex items-center justify-end px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={closePanel}
            className="
              w-8 h-8 rounded-full flex items-center justify-center
              bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100
              transition-colors
            "
            aria-label="بستن"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── محتوا ─────────────────────────────────────── */}

        {/* موبایل: فقط یکی از دو تب، تمام‌قد */}
        <div className="md:hidden flex-1 min-h-0">
          {activeTab === 'participants' ? <ParticipantList /> : <ChatPanel />}
        </div>

        {/* دسکتاپ: هر دو با هم، شرکت‌کنندگان بالا محدود، چت پایین بقیه‌ی فضا */}
        <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
          <div className="max-h-[35%] min-h-[120px] border-b border-neutral-800 flex flex-col shrink-0">
            <ParticipantList />
          </div>
          <div className="flex-1 min-h-0">
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
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
        ${active
          ? 'bg-primary-600 text-neutral-50'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}