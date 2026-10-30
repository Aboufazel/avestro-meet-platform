import { memo, useState } from 'react'
import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Settings, Users, Video, VideoOff, MoreHorizontal, Hand, UserCheck, PenTool, X } from 'lucide-react'
import { selectActivePanelTab, selectIsPanelOpen, selectUnreadCount } from '../store/meeting-selectors'
import { useMeetingStore } from '../store/meeting-store'

/**
 * نوار کنترل جلسه.
 *
 * حالت docked (موبایلِ کلاس): نوار باریک ثابت پایین با dvh و safe-area.
 *  • دکمه‌های اصلی (میکروفون، دوربین، گفتگو، شرکت‌کنندگان، خروج) همیشه در دسترس‌اند
 *  • امکانات کم‌کاربردتر (اشتراک صفحه، حضور و غیاب، تخته، تنظیمات) در منوی «بیشتر»
 *  • بج گفتگو = پیام‌های خوانده‌نشده؛ بج شرکت‌کنندگان = درخواست‌های در انتظار
 *  • با فعال‌بودن تخته/اشتراک می‌تواند خودکار جمع شود و با لمس صفحه برگردد
 */
export const MeetingControls = memo(function MeetingControls({ isAudioMuted, isVideoMuted, isScreenSharing, onToggleAudio, onToggleVideo, onToggleScreenShare, onLeave, canChat = true, canParticipants = true, canScreenShare = true, showHand = false, isHandRaised = false, onToggleHand, showMic = true, showCamera = true, showAttendance = false, onOpenAttendance, docked = false, showSettings = true, chatOpen = false, onToggleChat, participantsOpen = false, onToggleParticipants, participantsCount = 0, pendingRequests = 0, dockVisible = true, whiteboardAction = null }) {
  const unreadCount = useMeetingStore(selectUnreadCount)
  const activeTab = useMeetingStore(selectActivePanelTab)
  const isPanelOpen = useMeetingStore(selectIsPanelOpen)
  const openSettings = useMeetingStore((s) => s.openSettings)
  const togglePanel = useMeetingStore((s) => s.togglePanel)

  const [moreOpen, setMoreOpen] = useState(false)

  if (docked) {
    // موبایلِ کلاس: دکمه‌های اصلی همیشه پیدا هستند؛
    // بقیه (اشتراک صفحه، حضور و غیاب، تخته، تنظیمات) داخل «بیشتر» می‌روند.
    const moreItems = [
      canScreenShare && { key: 'share', label: isScreenSharing ? 'توقف اشتراک صفحه' : 'اشتراک‌گذاری صفحه', icon: <MonitorUp size={19} />, onClick: onToggleScreenShare },
      whiteboardAction && { key: 'whiteboard', label: whiteboardAction.label, icon: <PenTool size={19} />, onClick: whiteboardAction.onClick },
      showAttendance && { key: 'attendance', label: 'حضور و غیاب', icon: <UserCheck size={19} />, onClick: onOpenAttendance },
      showSettings && { key: 'settings', label: 'تنظیمات', icon: <Settings size={19} />, onClick: openSettings },
    ].filter(Boolean)
    const runMore = (fn) => () => { setMoreOpen(false); fn?.() }
    const participantsBadge = pendingRequests > 0 ? pendingRequests : participantsCount

    return <>
      {moreOpen && <button type="button" aria-label="بستن" className="cl-more-backdrop" onClick={() => setMoreOpen(false)} />}
      {moreOpen && <div className="cl-more-menu" role="menu">
        {moreItems.map((it) => <button key={it.key} type="button" role="menuitem" className="cl-more-item" onClick={runMore(it.onClick)}>{it.icon}<span>{it.label}</span></button>)}
      </div>}
      <div className={`cl-dock ${dockVisible ? '' : 'is-hidden'}`}>
        <div className="cl-dock-inner">
          {showHand && <button type="button" onClick={onToggleHand} className={`cl-hand ${isHandRaised ? 'is-raised' : ''}`} aria-label={isHandRaised ? 'پایین‌آوردن دست' : 'بلندکردن دست'}>
            <Hand size={18} /><span>{isHandRaised ? 'پایین دست' : 'بلندکردن دست'}</span>
          </button>}
          {showMic && <ControlButton active={!isAudioMuted} off={isAudioMuted} onClick={onToggleAudio} label="میکروفون" icon={isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />} />}
          {showCamera && <ControlButton active={!isVideoMuted} off={isVideoMuted} onClick={onToggleVideo} label="دوربین" icon={isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />} />}
          {canChat && <ControlButton active={chatOpen} onClick={onToggleChat} label="گفتگو" icon={<MessageSquare size={18} />} badge={chatOpen ? 0 : unreadCount} />}
          {canParticipants && <ControlButton active={participantsOpen} onClick={onToggleParticipants} label="شرکت‌کنندگان" icon={<Users size={18} />} badge={participantsOpen ? 0 : participantsBadge} badgeTone={pendingRequests > 0 ? 'warn' : 'default'} />}
          {moreItems.length > 0 && <ControlButton active={moreOpen} onClick={() => setMoreOpen((v) => !v)} label="بیشتر" icon={moreOpen ? <X size={18} /> : <MoreHorizontal size={18} />} />}
          <ControlButton danger onClick={onLeave} label="خروج" icon={<PhoneOff size={18} />} />
        </div>
      </div>
    </>
  }

  return <div className={`fixed lg:absolute ${isPanelOpen ? 'md:bottom-5' : 'md:bottom-5'} bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 -translate-x-1/2 z-[60] w-max max-w-[calc(100%-20px)] transition-all duration-400 ease-out`}>
    <div className="mx-auto flex items-center justify-center gap-1 sm:gap-1.5 rounded-[20px] sm:rounded-[24px] border room-border bg-[var(--room-surface)] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.42)] max-w-max room-rise">
      {showHand && <ControlButton active={isHandRaised} onClick={onToggleHand} label={isHandRaised ? 'پایین‌آوردن دست' : 'بلندکردن دست'} icon={<Hand size={17} />} extra="" />}
      <ControlButton onClick={openSettings} label="تنظیمات" icon={<Settings size={17} />} extra="" />
      {canChat && <ControlButton active={isPanelOpen && activeTab === 'chat'} onClick={() => togglePanel('chat')} label="گفتگو" icon={<MessageSquare size={17} />} badge={unreadCount} />}
      {canParticipants && <ControlButton active={isPanelOpen && activeTab === 'participants'} onClick={() => togglePanel('participants')} label="شرکت‌کنندگان" icon={<Users size={17} />} />}
      {showAttendance && <button type="button" onClick={onOpenAttendance} aria-label="حضور و غیاب" title="حضور و غیاب"
        className="room-control h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl flex items-center gap-2 bg-[var(--room-blue)] text-white text-xs font-medium shadow-[0_8px_22px_rgba(77,125,255,.35)] hover:brightness-110">
        <UserCheck size={17} /><span className="hidden sm:inline">حضور و غیاب</span>
      </button>}
      {canScreenShare && <ControlButton active={isScreenSharing} onClick={onToggleScreenShare} label="اشتراک‌گذاری" icon={<MonitorUp size={17} />} extra="" />}
      {showCamera && <ControlButton active={!isVideoMuted} off={isVideoMuted} onClick={onToggleVideo} label="دوربین" icon={isVideoMuted ? <VideoOff size={17} /> : <Video size={17} />} />}
      {showMic && <ControlButton active={!isAudioMuted} off={isAudioMuted} onClick={onToggleAudio} label="میکروفون" icon={isAudioMuted ? <MicOff size={17} /> : <Mic size={17} />} />}
      <ControlButton danger onClick={onLeave} label="خروج" icon={<PhoneOff size={17} />} />
      <ControlButton onClick={() => togglePanel(activeTab || 'participants')} label="بیشتر" icon={<MoreHorizontal size={17} />} extra="hidden" />
    </div>
  </div>
})

function ControlButton({ icon, active = false, danger = false, off = false, primary = false, onClick, label, extra = '', badge = 0, badgeTone = 'default' }) {
  let classes = `room-control relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center ${extra}`
  if (primary) classes += ' bg-[var(--room-blue)] text-white'
  else if (danger) classes += ' bg-[var(--room-danger)] hover:brightness-110 text-white shadow-[0_10px_24px_rgba(255,80,104,.28)]'
  else if (off) classes += ' bg-[var(--room-danger)]/10 text-[var(--room-danger)] ring-1 ring-[var(--room-danger)]/30'
  else if (active) classes += ' bg-[var(--room-mint-soft)] text-[var(--room-mint)] ring-1 ring-[var(--room-mint)]/25'
  else classes += ' bg-white/[.045] text-white/55 hover:bg-white/[.085] hover:text-white'
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={classes}>{icon}{off && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-8 h-8 rounded-xl ring-1 ring-[var(--room-danger)]/35" /></span>}{badge > 0 && <span className={`cl-btn-badge ${badgeTone === 'warn' ? 'is-warn' : ''}`}>{badge > 99 ? '99+' : badge}</span>}</button>
}
