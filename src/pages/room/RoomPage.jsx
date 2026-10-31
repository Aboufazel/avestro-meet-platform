import { useEffect, useMemo, useState } from 'react'
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
import { ClassLayout } from '../../features/meeting/components/ClassLayout'
import { ClassSheets } from '../../features/meeting/components/ClassSheets'
import { HandRequestToasts } from '../../features/meeting/components/HandRequestToasts'
import { canFullscreen, isFullscreen, enterFullscreen } from '../../features/meeting/utils/fullscreen'
import { useParticipants } from '../../features/meeting/hooks/useParticipants'
import { useClassViewport } from '../../features/meeting/hooks/useClassViewport'
import { useHandRequests } from '../../features/meeting/hooks/useHandRequests'
import { ClassAccessContext } from '../../features/meeting/ClassAccessContext'
import { ClassViewportContext } from '../../features/meeting/ClassViewportContext'
import { PenTool } from 'lucide-react'
import WhiteboardPanel from '../../features/whiteboard/WhiteboardPanel'

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
  // بر اساس فعال‌بودن ماژول است، نه نوع رویداد؛ پس هر امکان برای سمینار هم قابل روشن‌کردن است.
  const isHostRole = role === 'host'
  const moderated = has('speak_permission')
  const handFeature = has('raise_hand')
  const canControlMedia = isHostRole && has('speak_permission', 'control')
  const canAttendance = isHostRole && has('attendance', 'control')
  const classLayout = kind === 'class'
  // در کلاس فقط معلم/مدیر دکمه‌ی اشتراک صفحه را می‌بیند؛ رفتار سمینار تغییری نکرده
  const canShowScreenShare = canScreenShare && (!classLayout || isHostRole)

  // ابعاد محیط کلاس: در گوشی همیشه افقی (در حالت عمودی، کل محیط می‌چرخد)
  const viewport = useClassViewport(classLayout)
  const compactClass = classLayout && viewport.compact

  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [whiteboardObjects, setWhiteboardObjects] = useState([])
  const storeHand = useMeetingStore((s) => !!s.participants.get(s.localParticipantId)?.isHandRaised)

  const { error, isConnecting, isReconnecting, isAudioMuted, isVideoMuted, isScreenSharing, isConnected, leave, toggleAudio, toggleVideo, toggleScreenShare } = useJitsi(roomName)
  const { participants } = useParticipants()
  const boardOpen = canWhiteboard && whiteboardOpen
  // تخته و اشتراک صفحه هر دو چیدمان «محتوا» را فعال می‌کنند.
  const hasActiveScreenShare = isScreenSharing || participants.some((participant) => participant.isScreenSharing)
  const classContentMode = classLayout && (boardOpen || hasActiveScreenShare)

  // ورود به کلاس در گوشی و شروع تخته/اشتراک صفحه: پنل‌ها بسته شروع شوند (نه بازشدن خودکار روی محتوا)
  useEffect(() => {
    if (compactClass) closeMeetingPanel()
  }, [compactClass, closeMeetingPanel])
  useEffect(() => {
    if (classLayout && classContentMode) closeMeetingPanel()
  }, [classLayout, classContentMode, closeMeetingPanel])

  // گوشی: با لمس تمام‌صفحه می‌شود. پنجره‌ی اجازه‌ی دوربین اولین لمس را می‌گیرد؛ پس تا وقتی موفق
  // نشده روی هر لمس دوباره تلاش می‌شود. دکمه‌ی «تمام‌صفحه» در منوی بیشتر هم همین کار را می‌کند.
  useEffect(() => {
    if (!compactClass || !canFullscreen() || isFullscreen()) return undefined
    const onTap = async () => { if (await enterFullscreen()) window.removeEventListener('pointerup', onTap) }
    window.addEventListener('pointerup', onTap)
    return () => window.removeEventListener('pointerup', onTap)
  }, [compactClass])

  const access = useClassAccess(roomName, { enabled: isConnected && (classLayout || moderated || handFeature || canWhiteboard) })
  const me = access.me
  const handRequests = useHandRequests(access.roster, classLayout && isHostRole)

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

  useEffect(() => {
    if (!access.whiteboardState) return
    setWhiteboardObjects(access.whiteboardState.objects || [])
    setWhiteboardOpen(Boolean(access.whiteboardState.is_open))
  }, [access.whiteboardState])

  const openWhiteboard = () => {
    setWhiteboardOpen(true)
    access.setWhiteboardOpen(true)
  }
  const closeWhiteboard = () => {
    setWhiteboardOpen(false)
    access.setWhiteboardOpen(false)
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

  // تخته (فقط وقتی باز است). همگام‌سازی و مجوز نوشتن مثل قبل از props می‌آید.
  const board = boardOpen ? (
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

  const viewportValue = useMemo(() => viewport, [viewport])

  if (isConnecting && !isReconnecting) return <div className="fixed inset-0 room-shell text-white"><MeetingLoading /></div>
  if (error && !isReconnecting) return <div className="fixed inset-0 room-shell text-white"><MeetingError error={error} onLeave={leave} /></div>

  const reconnectBanner = isReconnecting && (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 room-pop"><div className="flex items-center gap-2 rounded-full bg-[var(--room-surface)] border room-border px-4 py-2 text-xs shadow-xl"><span className="w-2 h-2 rounded-full bg-[var(--room-warning)] animate-pulse" /><span>اتصال ضعیف است؛ در حال برقراری مجدد...</span></div></div>
  )

  const controlProps = {
    isAudioMuted, isVideoMuted, isScreenSharing,
    onToggleAudio: toggleAudio, onToggleVideo: toggleVideo, onToggleScreenShare: handleToggleScreenShare, onLeave: leave,
    canChat, canParticipants, canScreenShare: canShowScreenShare || isScreenSharing,
    showHand: canHand, isHandRaised, onToggleHand: handleToggleHand,
    showMic, showCamera, showAttendance: canAttendance, onOpenAttendance: () => setAttendanceOpen(true),
    handCount: handRequests.pending.length,
  }

  const classStage = classLayout && (
    <>
      <ClassLayout board={board} contentMode={classContentMode} onStopShare={toggleScreenShare} />
      {isHostRole && (
        <HandRequestToasts
          notices={handRequests.notices}
          onDismiss={handRequests.dismiss}
          onDismissAll={handRequests.dismissAll}
          onReject={access.lowerHand}
        />
      )}
    </>
  )

  const shellClass = [
    'room-shell fixed inset-0 overflow-hidden flex flex-col text-white',
    classLayout ? 'is-class' : 'room-enter',
    compactClass ? 'is-compact' : '',
    classLayout && viewport.rotated ? 'is-rotated' : '',
  ].filter(Boolean).join(' ')

  return (
    <ClassViewportContext.Provider value={viewportValue}>
    <ClassAccessContext.Provider value={access}>
    <div dir="rtl" className={shellClass} style={classLayout ? viewport.shellStyle : undefined}>
      <RoomHeader showFullscreen={compactClass} canRecord={canRecord} slug={roomName} isConnected={isConnected} onCopyLink={handleCopyLink} isMeetingMuted={isMeetingMuted} onToggleMeetingMute={toggleMeetingMute} isRecording={isRecording} recordingSeconds={recordingSeconds} onToggleRecording={handleToggleRecording} isVoiceRecording={isVoiceRecording} voiceRecordingSeconds={voiceRecordingSeconds} onToggleVoiceRecording={handleToggleVoiceRecording} />

      <div className="flex-1 min-h-0 relative">
        {compactClass ? (
          // گوشیِ کلاس: ریل کنترل کنار صحنه؛ چت و شرکت‌کنندگان شیت پایین‌اند و روی ریل نمی‌افتند.
          <div className="absolute inset-0 cl-body">
            <MeetingControls {...controlProps} rail showSettings showBoard={canWhiteboard && isHostRole} boardOpen={boardOpen} onToggleBoard={boardOpen ? closeWhiteboard : openWhiteboard} />
            <main className="cl-main">
              {classStage}
              <ClassSheets canChat={canChat} canParticipants={canParticipants} canControl={canControlMedia} onOpenAttendance={canAttendance ? () => setAttendanceOpen(true) : undefined} />
              {reconnectBanner}
            </main>
          </div>
        ) : (
          <div className="absolute inset-0 p-2 sm:p-3 lg:p-4">
            <div className="h-full min-h-0 flex flex-row gap-2.5 lg:gap-3">
              <SidePanel canChat={canChat} canParticipants={canParticipants} canControl={canControlMedia} onOpenAttendance={canAttendance ? () => setAttendanceOpen(true) : undefined} />
              <main className="relative flex-1 min-w-0 min-h-0 room-surface overflow-hidden rounded-[20px] border room-border room-panel-shadow">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(77,125,255,.08),transparent_34%)]" />
                {classLayout ? classStage : <VideoGrid />}
                {classLayout && canWhiteboard && isHostRole && !boardOpen && <button type="button" onClick={openWhiteboard} className="absolute top-3 right-3 z-30 flex items-center gap-2 rounded-xl border room-border bg-[var(--room-surface)]/95 px-3 py-2 text-xs text-white shadow-lg transition hover:bg-[var(--room-elevated)]" aria-label="بازکردن تخته تعاملی"><PenTool size={16} /><span>تخته تعاملی</span></button>}
                {reconnectBanner}
                <MeetingControls {...controlProps} />
              </main>
            </div>
          </div>
        )}
        <SettingsModal />
        {canAttendance && <AttendanceModal slug={roomName} open={attendanceOpen} onClose={() => setAttendanceOpen(false)} />}
      </div>
    </div>
    </ClassAccessContext.Provider>
    </ClassViewportContext.Provider>
  )
}
