import { useParams } from 'react-router-dom'
import { useJitsi } from '../../features/meeting/hooks/useJitsi'
import { VideoGrid } from '../../features/meeting/components/VideoGrid'
import { MeetingLoading } from '../../features/meeting/components/MeetingLoading'
import { MeetingError } from '../../features/meeting/components/MeetingError'
import { MeetingControls } from '../../features/meeting/components/MeetingControls'
import { SidePanel } from '../../features/meeting/components/SidePanel'
import { RoomHeader } from '../../components/shared/RoomHeader.jsx'
import { SettingsModal } from '../../features/meeting/components/SettingsModal.jsx'
import { useMeetingStore } from '../../features/meeting/store/meeting-store'
import { selectIsMeetingMuted, selectIsRecording, selectRecordingSeconds, selectIsVoiceRecording, selectVoiceRecordingSeconds } from '../../features/meeting/store/meeting-selectors'
import { startRecording, stopRecording, startVoiceRec, stopVoiceRec } from '../../features/meeting/store/meeting-actions'
import toast from 'react-hot-toast'

export default function RoomPage() {
  const { slug: roomName } = useParams()
  const isMeetingMuted = useMeetingStore(selectIsMeetingMuted)
  const toggleMeetingMute = useMeetingStore((s) => s.toggleMeetingMute)
  const isVoiceRecording = useMeetingStore(selectIsVoiceRecording)
  const voiceRecordingSeconds = useMeetingStore(selectVoiceRecordingSeconds)
  const isRecording = useMeetingStore(selectIsRecording)
  const recordingSeconds = useMeetingStore(selectRecordingSeconds)

  const { error, isConnecting, isReconnecting, isAudioMuted, isVideoMuted, isScreenSharing, isConnected, leave, toggleAudio, toggleVideo, toggleScreenShare } = useJitsi(roomName)

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
    <div dir="rtl" className="room-shell w-screen h-screen overflow-hidden flex flex-col text-white room-enter">
      <RoomHeader slug={roomName} isConnected={isConnected} onCopyLink={handleCopyLink} isMeetingMuted={isMeetingMuted} onToggleMeetingMute={toggleMeetingMute} isRecording={isRecording} recordingSeconds={recordingSeconds} onToggleRecording={handleToggleRecording} isVoiceRecording={isVoiceRecording} voiceRecordingSeconds={voiceRecordingSeconds} onToggleVoiceRecording={handleToggleVoiceRecording} />

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 p-2 sm:p-3 lg:p-4">
          <div className="h-full min-h-0 flex flex-row gap-2.5 lg:gap-3">
            <SidePanel />
            <main className="relative flex-1 min-w-0 min-h-0 room-surface rounded-[20px] border room-border overflow-hidden room-panel-shadow">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(77,125,255,.08),transparent_34%)]" />
              <VideoGrid />
              {isReconnecting && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 room-pop"><div className="flex items-center gap-2 rounded-full bg-[var(--room-surface)]/95 backdrop-blur-xl border room-border px-4 py-2 text-xs shadow-xl"><span className="w-2 h-2 rounded-full bg-[var(--room-warning)] animate-pulse" /><span>اتصال ضعیف است؛ در حال برقراری مجدد...</span></div></div>}
              <MeetingControls isAudioMuted={isAudioMuted} isVideoMuted={isVideoMuted} isScreenSharing={isScreenSharing} onToggleAudio={toggleAudio} onToggleVideo={toggleVideo} onToggleScreenShare={toggleScreenShare} onLeave={leave} />
            </main>
          </div>
        </div>
        <SettingsModal />
      </div>
    </div>
  )
}
