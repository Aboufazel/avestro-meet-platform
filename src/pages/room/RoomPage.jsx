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
import { startRecording, stopRecording, startVoiceRec, stopVoiceRec, raiseHand, markAsTeacher, setScreenShareStatePublisher, applyAuthoritativeScreenShareState } from '../../features/meeting/store/meeting-actions'
import toast from 'react-hot-toast'
import { useRoomFeatures } from '../../hooks/useRoomFeatures'
import { useClassAccess } from '../../hooks/useClassAccess'
import { useMediaQuery } from '../../features/meeting/hooks/useMediaQuery'
import { ClassLayout } from '../../features/meeting/components/ClassLayout'
import { VideoTile } from '../../features/meeting/components/VideoTile'
import { useParticipants } from '../../features/meeting/hooks/useParticipants'
import { ClassAccessContext } from '../../features/meeting/ClassAccessContext'
import { PenTool, Maximize2, Minimize2, Video } from 'lucide-react'
import './classroom-stage.css'
import WhiteboardPanel from '../../features/whiteboard/WhiteboardPanel'

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
  const canWhiteboard = has('whiteboard')

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
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [whiteboardObjects, setWhiteboardObjects] = useState([])
  const [teacherVideoExpanded, setTeacherVideoExpanded] = useState(false)
  const storeHand = useMeetingStore((s) => !!s.participants.get(s.localParticipantId)?.isHandRaised)

  const { error, isConnecting, isReconnecting, isAudioMuted, isVideoMuted, isScreenSharing, isConnected, leave, toggleAudio, toggleVideo, toggleScreenShare } = useJitsi(roomName)
  const { participants } = useParticipants()
  const teacherParticipant = participants.find((participant) => participant.isTeacher) || null

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
              {classLayout ? <ClassLayout showChat={canChat} onStopShare={toggleScreenShare} suppressVideo={whiteboardOpen} /> : <VideoGrid />}
              {canWhiteboard && isHostRole && !whiteboardOpen && <button type="button" onClick={openWhiteboard} className="absolute top-3 right-3 z-30 flex items-center gap-2 rounded-xl border room-border bg-[var(--room-surface)]/95 px-3 py-2 text-xs text-white shadow-lg transition hover:bg-[var(--room-elevated)]" aria-label="بازکردن تخته تعاملی"><PenTool size={16} /><span>تخته تعاملی</span></button>}
              {canWhiteboard && whiteboardOpen && (
                <div className={`classroom-whiteboard-layout ${teacherVideoExpanded ? 'teacher-video-expanded' : ''}`}>
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
                  {teacherParticipant && (
                    <aside className="classroom-teacher-panel" aria-label="تصویر زنده مدرس">
                      <div className="classroom-teacher-heading">
                        <span className="classroom-teacher-live-dot" />
                        <span>مدرس</span>
                        <button
                          type="button"
                          className="classroom-teacher-expand"
                          onClick={() => setTeacherVideoExpanded((expanded) => !expanded)}
                          aria-label={teacherVideoExpanded ? 'کوچک‌کردن تصویر مدرس' : 'بزرگ‌کردن تصویر مدرس'}
                          title={teacherVideoExpanded ? 'کوچک‌کردن تصویر مدرس' : 'بزرگ‌کردن تصویر مدرس'}
                        >
                          {teacherVideoExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                      </div>
                      <div className="classroom-teacher-video">
                        <VideoTile participantId={teacherParticipant.id} preferCamera isLarge videoEnabled playAudio={false} />
                      </div>
                      <div className="classroom-teacher-caption">
                        <Video size={14} />
                        <span>{teacherParticipant.hasVideo ? 'تصویر زنده مدرس' : 'دوربین مدرس خاموش است'}</span>
                      </div>
                    </aside>
                  )}
                </div>
              )}
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
