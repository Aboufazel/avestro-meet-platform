import { memo } from 'react'
import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Settings, Users, Video, VideoOff, MoreHorizontal } from 'lucide-react'
import { selectActivePanelTab, selectIsPanelOpen, selectUnreadCount } from '../store/meeting-selectors'
import { useMeetingStore } from '../store/meeting-store'

export const MeetingControls = memo(function MeetingControls({ isAudioMuted, isVideoMuted, isScreenSharing, onToggleAudio, onToggleVideo, onToggleScreenShare, onLeave }) {
  const unreadCount = useMeetingStore(selectUnreadCount)
  const activeTab = useMeetingStore(selectActivePanelTab)
  const isPanelOpen = useMeetingStore(selectIsPanelOpen)
  const openSettings = useMeetingStore((s) => s.openSettings)
  const togglePanel = useMeetingStore((s) => s.togglePanel)

  return <div className={`fixed lg:absolute ${isPanelOpen ? 'md:bottom-5' : 'md:bottom-5'} bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 -translate-x-1/2 z-[60] w-max max-w-[calc(100%-20px)] transition-all duration-400 ease-out`}>
    <div className="mx-auto flex items-center justify-center gap-1 sm:gap-1.5 rounded-[20px] sm:rounded-[24px] border room-border bg-[var(--room-surface)]/92 backdrop-blur-2xl p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.42)] max-w-max room-rise">
      <ControlButton onClick={openSettings} label="تنظیمات" icon={<Settings size={17} />} extra="" />
      <ControlButton active={isPanelOpen && activeTab === 'chat'} onClick={() => togglePanel('chat')} label="گفتگو" icon={<MessageSquare size={17} />} badge={unreadCount} />
      <ControlButton active={isPanelOpen && activeTab === 'participants'} onClick={() => togglePanel('participants')} label="شرکت‌کنندگان" icon={<Users size={17} />} />
      <ControlButton active={isScreenSharing} onClick={onToggleScreenShare} label="اشتراک‌گذاری" icon={<MonitorUp size={17} />} extra="" />
      <ControlButton active={!isVideoMuted} off={isVideoMuted} onClick={onToggleVideo} label="دوربین" icon={isVideoMuted ? <VideoOff size={17} /> : <Video size={17} />} />
      <ControlButton active={!isAudioMuted} off={isAudioMuted} onClick={onToggleAudio} label="میکروفون" icon={isAudioMuted ? <MicOff size={17} /> : <Mic size={17} />} />
      <ControlButton danger onClick={onLeave} label="خروج" icon={<PhoneOff size={17} />} />
      <ControlButton onClick={() => togglePanel(activeTab || 'participants')} label="بیشتر" icon={<MoreHorizontal size={17} />} extra="hidden" />
    </div>
  </div>
})

function ControlButton({ icon, active = false, danger = false, off = false, onClick, label, extra = '', badge = 0 }) {
  let classes = `room-control relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center ${extra}`
  if (danger) classes += ' bg-[var(--room-danger)] hover:brightness-110 text-white shadow-[0_10px_24px_rgba(255,80,104,.28)]'
  else if (off) classes += ' bg-[var(--room-danger)]/10 text-[var(--room-danger)] ring-1 ring-[var(--room-danger)]/30'
  else if (active) classes += ' bg-[var(--room-mint-soft)] text-[var(--room-mint)] ring-1 ring-[var(--room-mint)]/25'
  else classes += ' bg-white/[.045] text-white/55 hover:bg-white/[.085] hover:text-white'
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={classes}>{icon}{off && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-8 h-8 rounded-xl ring-1 ring-[var(--room-danger)]/35" /></span>}{badge > 0 && <span className="absolute -top-1 -left-1 min-w-4 h-4 rounded-full bg-[var(--room-danger)] text-white text-[9px] flex items-center justify-center px-1">{badge}</span>}</button>
}
