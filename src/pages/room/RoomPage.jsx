import { useEffect, useState } from 'react'
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
import { startRecording, stopRecording, startVoiceRec, stopVoiceRec, raiseHand, markAsTeacher } from '../../features/meeting/store/meeting-actions'
import toast from 'react-hot-toast'
import { useRoomFeatures } from '../../hooks/useRoomFeatures'
import { useClassAccess } from '../../hooks/useClassAccess'
import { useMediaQuery } from '../../features/meeting/hooks/useMediaQuery'
import { ClassLayout } from '../../features/meeting/components/ClassLayout'
import { ClassAccessContext } from '../../features/meeting/ClassAccessContext'

export default function RoomPage() {
  const { slug: roomName } = useParams()
  const isMeetingMuted = useMeetingStore(selectIsMeetingMuted)
  const toggleMeetingMute = useMeetingStore((s) => s.toggleMeetingMute)
  const isVoiceRecording = useMeetingStore(selectIsVoiceRecording)
  const voiceRecordingSeconds = useMeetingStore(selectVoiceRecordingSeconds)
  const isRecording = useMeetingStore(selectIsRecording)
  const recordingSeconds = useMeetingStore(selectRecordingSeconds)

  const { can, has, settings, role, kind } = useRoomFeatures(roomName)
  const canChat = can('chat')
  const canParticipants = can('participants_list')
  const canScreenShare = can('screen_share')
  const canRecord = can('recording')

  // ───── کنترل صحبت/تصویر (لحظه‌ای از طریق WebSocket) ─────
  // بر اساس فعال‌بودن ماژول است، نه نوع رویداد؛ پس هر امکان برای سمینار هم قابل روشن‌کردن است.
  const isHostRole = role === 'host'
  const moderated = has('speak_permission')
  const handFeature = has('raise_hand')
  const canControlMedia = isHostRole && has('speak_permission', 'control')
  const canAttendance = isHostRole && has('attendance', 'control')
  const classLayout = kind === 'class'
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const inlineChat = classLayout && !isDesktop // موبایلِ کلاس: گفتگو همیشه زیر صحنه است
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const storeHand = useMeetingStore((s) => !!s.participants.get(s.localParticipantId)?.isHandRaised)

  const { error, isConnecting, isReconnecting, isAudioMuted, isVideoMuted, isScreenSharing, isConnected, leave, toggleAudio, toggleVideo, toggleScreenShare } = useJitsi(roomName)

  const access = useClassAccess(roomName, { enabled: isConnected && (moderated || handFeature) })
  const me = access.me

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
    if (!isScreenSharing && !canScreenShare) {
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

  if (isConnecting && !isReconnecting) return <div className="w-screen h-screen room-shell text-white"><MeetingLoading /></div>
  if (error && !isReconnecting) return <div className="w-screen h-screen room-shell text-white"><MeetingError error={error} onLeave={leave} /></div>

  return (
    <ClassAccessContext.Provider value={access}>
    <div dir="rtl" className="room-shell w-screen h-screen overflow-hidden flex flex-col text-white room-enter">
      <RoomHeader canRecord={canRecord} slug={roomName} isConnected={isConnected} onCopyLink={handleCopyLink} isMeetingMuted={isMeetingMuted} onToggleMeetingMute={toggleMeetingMute} isRecording={isRecording} recordingSeconds={recordingSeconds} onToggleRecording={handleToggleRecording} isVoiceRecording={isVoiceRecording} voiceRecordingSeconds={voiceRecordingSeconds} onToggleVoiceRecording={handleToggleVoiceRecording} />

      <div className="flex-1 min-h-0 relative">
        <div className={`absolute inset-0 ${inlineChat ? 'p-0' : 'p-2 sm:p-3 lg:p-4'}`}>
          <div className="h-full min-h-0 flex flex-row gap-2.5 lg:gap-3">
            <SidePanel canChat={canChat && !inlineChat} canParticipants={canParticipants} canControl={canControlMedia} onOpenAttendance={canAttendance ? () => setAttendanceOpen(true) : undefined} />
            <main className={`relative flex-1 min-w-0 min-h-0 room-surface overflow-hidden ${inlineChat ? '' : 'rounded-[20px] border room-border room-panel-shadow'}`}>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(77,125,255,.08),transparent_34%)]" />
              {classLayout ? <ClassLayout showChat={canChat} onStopShare={toggleScreenShare} /> : <VideoGrid />}
              {isReconnecting && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 room-pop"><div className="flex items-center gap-2 rounded-full bg-[var(--room-surface)] border room-border px-4 py-2 text-xs shadow-xl"><span className="w-2 h-2 rounded-full bg-[var(--room-warning)] animate-pulse" /><span>اتصال ضعیف است؛ در حال برقراری مجدد...</span></div></div>}
              <MeetingControls isAudioMuted={isAudioMuted} isVideoMuted={isVideoMuted} isScreenSharing={isScreenSharing} onToggleAudio={toggleAudio} onToggleVideo={toggleVideo} onToggleScreenShare={handleToggleScreenShare} onLeave={leave} canChat={canChat && !inlineChat} canParticipants={canParticipants && (!inlineChat || isHostRole)} canScreenShare={canScreenShare || isScreenSharing} showHand={canHand} isHandRaised={isHandRaised} onToggleHand={handleToggleHand} showMic={showMic} showCamera={showCamera} showAttendance={canAttendance} onOpenAttendance={() => setAttendanceOpen(true)} docked={inlineChat} showSettings={!inlineChat || isHostRole} />
            </main>
          </div>
        </div>
        <SettingsModal />
        {canAttendance && <AttendanceModal slug={roomName} open={attendanceOpen} onClose={() => setAttendanceOpen(false)} />}
      </div>
    </div>
    </ClassAccessContext.Provider>
  )
}
