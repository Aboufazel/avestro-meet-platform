import { memo, useState } from 'react'
import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Settings, Users, Video, VideoOff, MoreHorizontal, Hand, UserCheck, PenTool, Maximize, Minimize, FileText, Power } from 'lucide-react'
import { selectActivePanelTab, selectIsPanelOpen, selectUnreadCount } from '../store/meeting-selectors'
import { useMeetingStore } from '../store/meeting-store'
import { canFullscreen, isFullscreen, toggleFullscreen } from '../utils/fullscreen'

export const MeetingControls = memo(function MeetingControls({ isAudioMuted, isVideoMuted, isScreenSharing, onToggleAudio, onToggleVideo, onToggleScreenShare, onLeave, canChat = true, canParticipants = true, canScreenShare = true, showHand = false, isHandRaised = false, onToggleHand, showMic = true, showCamera = true, showAttendance = false, onOpenAttendance, rail = false, showSettings = true, handCount = 0, showBoard = false, boardOpen = false, onToggleBoard, showDocuments = false, documentOpen = false, onOpenDocuments, showEnd = false, onEnd }) {
  const unreadCount = useMeetingStore(selectUnreadCount)
  const activeTab = useMeetingStore(selectActivePanelTab)
  const isPanelOpen = useMeetingStore(selectIsPanelOpen)
  const openSettings = useMeetingStore((s) => s.openSettings)
  const togglePanel = useMeetingStore((s) => s.togglePanel)

  const [moreOpen, setMoreOpen] = useState(false)

  if (rail) {
    // گوشیِ کلاس: ریل عمودی کنار صحنه. روی محتوا قرار نمی‌گیرد و با ارتفاع نمایش هماهنگ است.
    // دکمه‌های اصلی همیشه پیدا هستند؛ بقیه داخل «بیشتر».
    const chatActive = isPanelOpen && activeTab === 'chat'
    const peopleActive = isPanelOpen && activeTab === 'participants'
    const moreItems = [
      canScreenShare && { key: 'share', label: isScreenSharing ? 'توقف اشتراک صفحه' : 'اشتراک‌گذاری صفحه', icon: <MonitorUp size={19} />, onClick: onToggleScreenShare },
      showDocuments && { key: 'documents', label: 'فایل‌های کلاس', icon: <FileText size={19} />, onClick: onOpenDocuments },
      showAttendance && { key: 'attendance', label: 'حضور و غیاب', icon: <UserCheck size={19} />, onClick: onOpenAttendance },
      canFullscreen() && { key: 'fullscreen', label: isFullscreen() ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه (مخفی‌کردن نوار مرورگر)', icon: isFullscreen() ? <Minimize size={19} /> : <Maximize size={19} />, onClick: toggleFullscreen },
      showSettings && { key: 'settings', label: 'تنظیمات', icon: <Settings size={19} />, onClick: openSettings },
    ].filter(Boolean)
    const runMore = (fn) => () => { setMoreOpen(false); fn?.() }

    return (
      <div className="cl-rail-wrap">
        {moreOpen && <button type="button" aria-label="بستن منو" className="cl-more-backdrop" onClick={() => setMoreOpen(false)} />}
        {moreOpen && (
          <div className="cl-more-menu" role="menu">
            {moreItems.map((it) => (
              <button key={it.key} type="button" role="menuitem" className="cl-more-item" onClick={runMore(it.onClick)}>{it.icon}<span>{it.label}</span></button>
            ))}
          </div>
        )}
        <div className="cl-rail" role="toolbar" aria-label="کنترل‌های کلاس">
          {showMic && <RailButton state={isAudioMuted ? 'off' : 'on'} onClick={onToggleAudio} label={isAudioMuted ? 'روشن‌کردن میکروفون' : 'خاموش‌کردن میکروفون'} icon={isAudioMuted ? <MicOff size={19} /> : <Mic size={19} />} />}
          {showCamera && <RailButton state={isVideoMuted ? 'off' : 'on'} onClick={onToggleVideo} label={isVideoMuted ? 'روشن‌کردن دوربین' : 'خاموش‌کردن دوربین'} icon={isVideoMuted ? <VideoOff size={19} /> : <Video size={19} />} />}
          {showHand && <RailButton state={isHandRaised ? 'warn' : 'idle'} onClick={onToggleHand} label={isHandRaised ? 'پایین‌آوردن دست' : 'درخواست اجازه صحبت'} pressed={isHandRaised} icon={<Hand size={19} />} />}
          {showBoard && <RailButton state={boardOpen ? 'active' : 'idle'} onClick={onToggleBoard} label={boardOpen ? 'بستن تخته' : 'بازکردن تخته'} pressed={boardOpen} icon={<PenTool size={19} />} />}
          {canChat && <RailButton state={chatActive ? 'active' : 'idle'} onClick={() => togglePanel('chat')} label="گفتگو" pressed={chatActive} badge={chatActive ? 0 : unreadCount} icon={<MessageSquare size={19} />} />}
          {canParticipants && <RailButton state={peopleActive ? 'active' : 'idle'} onClick={() => togglePanel('participants')} label={handCount > 0 ? `شرکت‌کنندگان؛ ${handCount} درخواست صحبت` : 'شرکت‌کنندگان'} pressed={peopleActive} badge={handCount} badgeKind="hand" icon={<Users size={19} />} />}
          {moreItems.length > 0 && <RailButton state={moreOpen ? 'active' : 'idle'} onClick={() => setMoreOpen((v) => !v)} label="بیشتر" pressed={moreOpen} icon={<MoreHorizontal size={19} />} />}
          <span className="cl-rail-spacer" />
          {showEnd && <RailButton state="danger" onClick={onEnd} label="پایان جلسه برای همه" icon={<Power size={19} />} />}
          <RailButton state="danger" onClick={onLeave} label="خروج از کلاس" icon={<PhoneOff size={19} />} />
        </div>
      </div>
    )
  }

  return <div className={`fixed lg:absolute ${isPanelOpen ? 'md:bottom-5' : 'md:bottom-5'} bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 -translate-x-1/2 z-[60] w-max max-w-[calc(100%-20px)] transition-all duration-400 ease-out`}>
    <div className="mx-auto flex items-center justify-center gap-1 sm:gap-1.5 rounded-[20px] sm:rounded-[24px] border room-border bg-[var(--room-surface)] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.42)] max-w-max room-rise">
      {showHand && <ControlButton active={isHandRaised} onClick={onToggleHand} label={isHandRaised ? 'پایین‌آوردن دست' : 'بلندکردن دست'} icon={<Hand size={17} />} extra="" />}
      <ControlButton onClick={openSettings} label="تنظیمات" icon={<Settings size={17} />} extra="" />
      {canChat && <ControlButton active={isPanelOpen && activeTab === 'chat'} onClick={() => togglePanel('chat')} label="گفتگو" icon={<MessageSquare size={17} />} badge={unreadCount} />}
      {canParticipants && <ControlButton active={isPanelOpen && activeTab === 'participants'} onClick={() => togglePanel('participants')} label="شرکت‌کنندگان" icon={<Users size={17} />} badge={handCount} />}
      {showAttendance && <button type="button" onClick={onOpenAttendance} aria-label="حضور و غیاب" title="حضور و غیاب"
        className="room-control h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl flex items-center gap-2 bg-[var(--room-blue)] text-white text-xs font-medium shadow-[0_8px_22px_rgba(77,125,255,.35)] hover:brightness-110">
        <UserCheck size={17} /><span className="hidden sm:inline">حضور و غیاب</span>
      </button>}
      {showDocuments && <ControlButton active={documentOpen} onClick={onOpenDocuments} label="فایل‌های کلاس" icon={<FileText size={17} />} extra="" />}
      {canScreenShare && <ControlButton active={isScreenSharing} onClick={onToggleScreenShare} label="اشتراک‌گذاری" icon={<MonitorUp size={17} />} extra="" />}
      {showCamera && <ControlButton active={!isVideoMuted} off={isVideoMuted} onClick={onToggleVideo} label="دوربین" icon={isVideoMuted ? <VideoOff size={17} /> : <Video size={17} />} />}
      {showMic && <ControlButton active={!isAudioMuted} off={isAudioMuted} onClick={onToggleAudio} label="میکروفون" icon={isAudioMuted ? <MicOff size={17} /> : <Mic size={17} />} />}
      {showEnd && <ControlButton danger onClick={onEnd} label="پایان جلسه" icon={<Power size={17} />} />}
      <ControlButton danger onClick={onLeave} label="خروج" icon={<PhoneOff size={17} />} />
      <ControlButton onClick={() => togglePanel(activeTab || 'participants')} label="بیشتر" icon={<MoreHorizontal size={17} />} extra="hidden" />
    </div>
  </div>
})

function ControlButton({ icon, active = false, danger = false, off = false, primary = false, onClick, label, extra = '', badge = 0 }) {
  let classes = `room-control relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center ${extra}`
  if (primary) classes += ' bg-[var(--room-blue)] text-white'
  else if (danger) classes += ' bg-[var(--room-danger)] hover:brightness-110 text-white shadow-[0_10px_24px_rgba(255,80,104,.28)]'
  else if (off) classes += ' bg-[var(--room-danger)]/10 text-[var(--room-danger)] ring-1 ring-[var(--room-danger)]/30'
  else if (active) classes += ' bg-[var(--room-mint-soft)] text-[var(--room-mint)] ring-1 ring-[var(--room-mint)]/25'
  else classes += ' bg-white/[.045] text-white/55 hover:bg-white/[.085] hover:text-white'
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={classes}>{icon}{off && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-8 h-8 rounded-xl ring-1 ring-[var(--room-danger)]/35" /></span>}{badge > 0 && <span className="absolute -top-1 -left-1 min-w-4 h-4 rounded-full bg-[var(--room-danger)] text-white text-[9px] flex items-center justify-center px-1">{badge}</span>}</button>
}

function RailButton({ icon, state = 'idle', onClick, label, pressed, badge = 0, badgeKind = '' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} className={`rail-btn is-${state}`}>
      {icon}
      {badge > 0 && <span className={`rail-badge ${badgeKind === 'hand' ? 'is-hand' : ''}`}>{badge}</span>}
    </button>
  )
}
