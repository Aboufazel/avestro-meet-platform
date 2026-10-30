import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useJitsi } from '../../features/meeting/hooks/useJitsi'
import { VideoGrid } from '../../features/meeting/components/VideoGrid'
import { MeetingLoading } from '../../features/meeting/components/MeetingLoading'
import { MeetingError } from '../../features/meeting/components/MeetingError'
import { MeetingControls } from '../../features/meeting/components/MeetingControls'
import { SidePanel } from '../../features/meeting/components/SidePanel'
import { AttendanceModal } from '../../features/meeting/components/AttendanceModal'
import { RoomHeader } from '../../components/shared/RoomHeader.jsx'
import { SettingsModal } from '../../features/meeting/components/SettingsModal.jsx'
import { useMeetingStore } from '../../features/meeting/store/meeting-store'
import { selectIsMeetingMuted, selectIsRecording, selectRecordingSeconds, selectIsVoiceRecording, selectVoiceRecordingSeconds } from '../../features/meeting/store/meeting-selectors'
import { startRecording, stopRecording, startVoiceRec, stopVoiceRec, raiseHand, markAsTeacher, setScreenShareStatePublisher, applyAuthoritativeScreenShareState } from '../../features/meeting/store/meeting-actions'
import toast from 'react-hot-toast'
import { useRoomFeatures } from '../../hooks/useRoomFeatures'
import { useClassAccess } from '../../hooks/useClassAccess'
import { useMediaQuery } from '../../features/meeting/hooks/useMediaQuery'
import { ClassLayout } from '../../features/meeting/components/ClassLayout'
import { useParticipants } from '../../features/meeting/hooks/useParticipants'
import { ClassAccessContext } from '../../features/meeting/ClassAccessContext'
import { PenTool } from 'lucide-react'
import WhiteboardPanel from '../../features/whiteboard/WhiteboardPanel'
import { useHandRaiseAlerts } from '../../features/meeting/hooks/useHandRaiseAlerts'
import { MobileClassSheets, DockPeek } from '../../features/meeting/components/MobileClassSheets'
import { HandRaiseAlert } from '../../features/meeting/components/HandRaiseAlert'

export default function RoomPage() {
  const { slug: roomName } = useParams()
  const isMeetingMuted = useMeetingStore(selectIsMeetingMuted)
  const toggleMeetingMute = useMeetingStore((s) => s.toggleMeetingMute)
  const isVoiceRecording = useMeetingStore(selectIsVoiceRecording)
  const voiceRecordingSeconds = useMeetingStore(selectVoiceRecordingSeconds)
  const isRecording = useMeetingStore(selectIsRecording)
  const recordingSeconds = useMeetingStore(selectRecordingSeconds)
  const closeMeetingPanel = useMeetingStore((s) => s.closePanel)

  const { can, has, settings, role, kind } = useRoomFeatures(roomName)
  const canChat = can('chat')
  const canParticipants = can('participants_list')
  const canScreenShare = can('screen_share')
  const canRecord = can('recording')
  const canWhiteboard = has('whiteboard')

  // ───── کنترل صحبت/تصویر (لحظه‌ای از طریق WebSocket) ─────
  const isHostRole = role === 'host'
  const moderated = has('speak_permission')
  const handFeature = has('raise_hand')
  const canControlMedia = isHostRole && has('speak_permission', 'control')
  const canAttendance = isHostRole && has('attendance', 'control')
  const classLayout = kind === 'class'
  const canShowScreenShare = canScreenShare && (!classLayout || isHostRole)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [whiteboardObjects, setWhiteboardObjects] = useState([])
  const [mobileSheet, setMobileSheet] = useState(null) // 'chat' | 'participants' | null — هرگز دو پنل با هم باز نیست
  const storeHand = useMeetingStore((s) => !!s.participants.get(s.localParticipantId)?.isHandRaised)

  const { error, isConnecting, isReconnecting, isAudioMuted, isVideoMuted, isScreenSharing, isConnected, leave, toggleAudio, toggleVideo, toggleScreenShare } = useJitsi(roomName)
  const { participants } = useParticipants()
  const hasActiveScreenShare = isScreenSharing || participants.some((participant) => participant.isScreenSharing)
  const classContentMode = classLayout && (whiteboardOpen || hasActiveScreenShare)
  const mobileClass = classLayout && !isDesktop
  // جهت واقعی گوشی: هر دو چیدمان (عمودی انباشته / افقی با ریل عمودی) کامل و کاربردی‌اند
  const isPortrait = useMediaQuery('(orientation: portrait)')
  const portraitClass = mobileClass && isPortrait

  // با فعال‌شدن تخته یا اشتراک صفحه، پنل‌ها پیش‌فرض بسته باشند
  useEffect(() => {
    if (classContentMode) {
      closeMeetingPanel()
      // همگام‌سازی وضعیت پنل موبایل با تغییر حالت چیدمان (رفتار مورد انتظار اسپک)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileSheet(null)
    }
  }, [classContentMode, closeMeetingPanel])

  const access = useClassAccess(roomName, { enabled: isConnected && (classLayout || moderated || handFeature || canWhiteboard) })
  const me = access.me

  useEffect(() => {
    if (!classLayout) {
      setScreenShareStatePublisher(null)
      access.setOnScreenShareState(null)
      return () => {
        setScreenShareStatePublisher(null)
        access.setOnScreenShareState(null)
      }
    }

    setScreenShareStatePublisher(isHostRole ? access.publishScreenShareState : null)
    access.setOnScreenShareState((state) => applyAuthoritativeScreenShareState({
      participantId: state.participant_id,
      isSharing: state.is_sharing,
      seq: state.seq,
    }))
    return () => {
      setScreenShareStatePublisher(null)
      access.setOnScreenShareState(null)
    }
  }, [classLayout, isHostRole, access.publishScreenShareState, access.setOnScreenShareState])

  const whiteboardSettings = settings('whiteboard')
  const studentsCanDraw = Boolean(whiteboardSettings.students_can_draw)

  // ───── همگام‌سازی تخته با سرور، همگام‌سازی «لبه‌ای» (edge-triggered) ─────
  // باگ قبلی: هر پیام whiteboard_state مقدار whiteboardOpen را با is_open سرور
  // بازنویسی می‌کرد؛ echoهای کهنه (یا snapshot اتصال دوباره) تخته را خودکار
  // باز می‌کردند — نتیجه: با زدن ضربدر، تخته بلافاصله دوباره باز می‌شد.
  // راه‌حل: فقط «تغییر واقعی» is_open اعمال می‌شود؛ پیام تکراری/کهنه بی‌اثر است.
  const seenIsOpenRef = useRef(null) // آخرین مقدار is_open که از سرور دیده/اعمال شده
  const isHostRoleRef = useRef(isHostRole)
  useEffect(() => { isHostRoleRef.current = isHostRole }, [isHostRole])

  // دسترسی‌های پایدار هوک برای deps تمیزِ اثر همگام‌سازی
  const { whiteboardState: accessWhiteboardState, setWhiteboardOpen: publishWhiteboardOpen } = access

  useEffect(() => {
    const state = accessWhiteboardState
    if (!state) return
    // همگام‌سازی از سامانه‌ی خارجی (پیام‌های WebSocket سرور)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWhiteboardObjects(state.objects || [])
    const incoming = Boolean(state.is_open)
    if (seenIsOpenRef.current === null) {
      // اولین snapshot این نشست: کلاس همیشه با تخته‌ی بسته شروع می‌شود.
      // میزبان سرور را هم به بسته همگام می‌کند تا برای همه از ابتدا بسته باشد؛
      // دانش‌آموز از وضعیت واقعی سرور پیروی می‌کند (اگر مدرس تخته را باز کرده ببیند).
      seenIsOpenRef.current = incoming
      if (incoming && isHostRoleRef.current) {
        publishWhiteboardOpen(false)
        setWhiteboardOpen(false)
      } else {
        setWhiteboardOpen(incoming)
      }
      return
    }
    if (incoming === seenIsOpenRef.current) return // echo/snapshot تکراری — بی‌اثر
    seenIsOpenRef.current = incoming
    setWhiteboardOpen(incoming)
  }, [accessWhiteboardState, publishWhiteboardOpen])

  const openWhiteboard = () => {
    setWhiteboardOpen(true)
    publishWhiteboardOpen(true)
  }
  const closeWhiteboard = () => {
    setWhiteboardOpen(false)
    publishWhiteboardOpen(false)
  }

  // معلم خودش را برای چیدمان کلاس علامت می‌زند (فقط نمایشی)
  useEffect(() => {
    if (classLayout && isHostRole && isConnected) markAsTeacher(true)
  }, [classLayout, isHostRole, isConnected])

  // دانش‌آموز تا وقتی سرور اجازه نداده (یا اتصال برقرار نشده) دکمه‌ی میکروفون/دوربین را نمی‌بیند
  const gated = moderated && !isHostRole
  const showMic = !gated || Boolean(me?.audio)
  const showCamera = !gated || Boolean(me?.video)
  const canHand = !isHostRole && handFeature && Boolean(me?.hand_enabled)
  const isHandRaised = me ? me.hand : storeHand

  // اجرای اجازه‌ها: هر لحظه که اجازه نیست (ورود، پس‌گرفتن، قطع اتصال) رسانه‌ی باز بسته می‌شود
  useEffect(() => {
    if (!gated) return
    if (!me?.audio && !isAudioMuted) toggleAudio()
    if (!me?.video && !isVideoMuted) toggleVideo()
  }, [gated, me?.audio, me?.video, isAudioMuted, isVideoMuted, toggleAudio, toggleVideo])

  // وقتی مدیر اجازه داد (دست پایین آمد)، آیکن دست در Jitsi هم پایین بیاید
  useEffect(() => {
    if (me && !me.hand && storeHand) raiseHand(false)
  }, [me, storeHand])

  const handleToggleHand = () => {
    const next = !isHandRaised
    access.raiseHand(next)
    raiseHand(next)
  }

  const handleToggleScreenShare = () => {
    if (!isScreenSharing && !canShowScreenShare) {
      toast.error('اشتراک‌گذاری صفحه در این اتاق مجاز نیست.')
      return
    }
    return toggleScreenShare()
  }
  const handleToggleVoiceRecording = async () => {
    try { isVoiceRecording ? await stopVoiceRec() : await startVoiceRec() }
    catch { toast.error('امکان شروع ضبط صدا وجود نداشت.') }
  }
  const handleToggleRecording = async () => {
    try { isRecording ? await stopRecording() : await startRecording() }
    catch { toast.error('امکان شروع ضبط وجود نداشت.') }
  }
  const handleCopyLink = async () => {
    const joinUrl = window.location.href.replace('/room/', '/join/')
    try { await navigator.clipboard.writeText(joinUrl); toast.success('لینک جلسه کپی شد.') }
    catch { toast.error('کپی لینک انجام نشد.') }
  }

  // ───── اعلان واقعی درخواست اجازه صحبت (فقط مدرس، از رستر لحظه‌ای) ─────
  const { current: handAlert, queuedCount: handAlertQueued, pendingCount, dismiss: dismissHandAlert } = useHandRaiseAlerts({
    enabled: Boolean(classLayout && isHostRole && access.connected),
    roster: access.roster,
  })
  const openMobileSheet = useCallback((tab) => setMobileSheet((current) => (current === tab ? null : tab)), [])
  const closeMobileSheet = useCallback(() => setMobileSheet(null), [])
  const handleViewHandRequest = useCallback((alert) => {
    dismissHandAlert(alert.id)
    closeMeetingPanel()
    setMobileSheet('participants')
  }, [dismissHandAlert, closeMeetingPanel])
  const handleDenyHandRequest = useCallback((alert) => {
    access.lowerHand(alert.key)
    dismissHandAlert(alert.id)
  }, [access, dismissHandAlert])

  // ───── جمع‌شدن خودکار داک در چیدمان عمودی وقتی کاربر مدتی تعامل نکرده (فقط حالت محتوا) ─────
  // در چیدمان افقی ریل عمودی همیشه پیدا است و جمع نمی‌شود.
  // dockShown در رندر مشتق می‌شود تا با تغییر حالت، نوار بدون تأخیر برگردد.
  const dockAutoHide = Boolean(portraitClass && classContentMode && !mobileSheet)
  const [dockIdleHidden, setDockIdleHidden] = useState(false)
  const dockShown = !dockAutoHide || !dockIdleHidden
  useEffect(() => {
    if (!dockAutoHide) return undefined
    let timer = window.setTimeout(() => setDockIdleHidden(true), 6000)
    const show = () => {
      setDockIdleHidden(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setDockIdleHidden(true), 6000)
    }
    document.addEventListener('pointerdown', show, true)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', show, true)
    }
  }, [dockAutoHide])

  if (isConnecting && !isReconnecting) return <div className="fixed inset-0 room-shell text-white"><MeetingLoading /></div>
  if (error && !isReconnecting) return <div className="fixed inset-0 room-shell text-white"><MeetingError error={error} onLeave={leave} /></div>

  const whiteboardSlot = canWhiteboard && whiteboardOpen ? (
    <WhiteboardPanel
      initialObjects={whiteboardObjects}
      onObjectsChange={(next) => {
        setWhiteboardObjects(next)
        access.updateWhiteboardObjects(next)
      }}
      onClose={closeWhiteboard}
      onClear={() => {
        setWhiteboardObjects([])
        access.clearWhiteboard()
      }}
      readOnly={!isHostRole && !studentsCanDraw}
      isHost={isHostRole}
    />
  ) : null

  return (
    <ClassAccessContext.Provider value={access}>
    <div dir="rtl" className={`room-shell fixed inset-0 overflow-hidden flex flex-col text-white room-enter ${classContentMode ? 'room-class-content-mode' : ''}`}>
      <RoomHeader compact={mobileClass} canRecord={canRecord} slug={roomName} isConnected={isConnected} onCopyLink={handleCopyLink} isMeetingMuted={isMeetingMuted} onToggleMeetingMute={toggleMeetingMute} isRecording={isRecording} recordingSeconds={recordingSeconds} onToggleRecording={handleToggleRecording} isVoiceRecording={isVoiceRecording} voiceRecordingSeconds={voiceRecordingSeconds} onToggleVoiceRecording={handleToggleVoiceRecording} />

      <div className="flex-1 min-h-0 relative">
        <div className={`absolute inset-0 ${classLayout && !isDesktop ? 'p-0' : 'p-2 sm:p-3 lg:p-4'}`}>
          <div className="h-full min-h-0 flex flex-row gap-2.5 lg:gap-3">
            {(!classLayout || isDesktop) && <SidePanel canChat={canChat} canParticipants={canParticipants} canControl={canControlMedia} onOpenAttendance={canAttendance ? () => setAttendanceOpen(true) : undefined} />}
            <main className={`relative flex-1 min-w-0 min-h-0 room-surface overflow-hidden ${classLayout && !isDesktop ? '' : 'rounded-[20px] border room-border room-panel-shadow'}`}>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(77,125,255,.08),transparent_34%)]" />
              {classLayout
                ? <ClassLayout portrait={portraitClass} contentMode={classContentMode} whiteboardSlot={whiteboardSlot} onStopShare={toggleScreenShare} />
                : <VideoGrid />}

              {canWhiteboard && isHostRole && !whiteboardOpen && <button type="button" onClick={openWhiteboard} className="absolute top-3 right-3 z-30 flex items-center gap-2 rounded-xl border room-border bg-[var(--room-surface)]/95 px-3 py-2 text-xs text-white shadow-lg transition hover:bg-[var(--room-elevated)]" aria-label="بازکردن تخته تعاملی"><PenTool size={16} /><span>تخته تعاملی</span></button>}

              {/* اعلان درخواست اجازه صحبت — حتی وقتی پنل‌ها بسته‌اند دیده می‌شود */}
              {classLayout && isHostRole && (
                <div className="cl-hand-alert-anchor">
                  <HandRaiseAlert
                    alert={handAlert}
                    remaining={Math.max(0, handAlertQueued - 1)}
                    onView={handleViewHandRequest}
                    onDeny={handleDenyHandRequest}
                  />
                </div>
              )}

              {isReconnecting && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 room-pop"><div className="flex items-center gap-2 rounded-full bg-[var(--room-surface)] border room-border px-4 py-2 text-xs shadow-xl"><span className="w-2 h-2 rounded-full bg-[var(--room-warning)] animate-pulse" /><span>اتصال ضعیف است؛ در حال برقراری مجدد...</span></div></div>}

              <MeetingControls
                isAudioMuted={isAudioMuted}
                isVideoMuted={isVideoMuted}
                isScreenSharing={isScreenSharing}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={handleToggleScreenShare}
                onLeave={leave}
                canChat={canChat}
                canParticipants={canParticipants}
                canScreenShare={canShowScreenShare || isScreenSharing}
                showHand={canHand}
                isHandRaised={isHandRaised}
                onToggleHand={handleToggleHand}
                showMic={showMic}
                showCamera={showCamera}
                showAttendance={canAttendance}
                onOpenAttendance={() => setAttendanceOpen(true)}
                docked={mobileClass}
                rail={mobileClass && !isPortrait}
                dockVisible={portraitClass ? dockShown : true}
                copyAction={{ label: 'کپی لینک کلاس', onClick: handleCopyLink }}
                chatOpen={mobileSheet === 'chat'}
                onToggleChat={() => openMobileSheet('chat')}
                participantsOpen={mobileSheet === 'participants'}
                onToggleParticipants={() => openMobileSheet('participants')}
                participantsCount={participants.length}
                pendingRequests={pendingCount}
                whiteboardAction={canWhiteboard && isHostRole ? { label: whiteboardOpen ? 'بستن تخته تعاملی' : 'بازکردن تخته تعاملی', onClick: whiteboardOpen ? closeWhiteboard : openWhiteboard } : null}
                showSettings
              />
            </main>
          </div>
        </div>

        {/* پنل‌های موبایل کلاس: Bottom Sheet مشترک گفتگو و شرکت‌کنندگان */}
        {mobileClass && (
          <MobileClassSheets
            openTab={mobileSheet}
            onClose={closeMobileSheet}
            canControl={canControlMedia}
            onOpenAttendance={canAttendance ? () => setAttendanceOpen(true) : undefined}
          />
        )}
        {portraitClass && dockAutoHide && !dockShown && <DockPeek onShow={() => setDockIdleHidden(false)} />}
        <SettingsModal />
        {canAttendance && <AttendanceModal slug={roomName} open={attendanceOpen} onClose={() => setAttendanceOpen(false)} />}
      </div>
    </div>
    </ClassAccessContext.Provider>
  )
}
