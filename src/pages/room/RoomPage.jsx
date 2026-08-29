import {useParams} from 'react-router-dom'

import {useJitsi} from '../../features/meeting/hooks/useJitsi'

import {VideoGrid} from '../../features/meeting/components/VideoGrid'
import {MeetingLoading} from '../../features/meeting/components/MeetingLoading'
import {MeetingError} from '../../features/meeting/components/MeetingError'
import {MeetingControls} from '../../features/meeting/components/MeetingControls'
import {SidePanel} from '../../features/meeting/components/SidePanel'
import {RoomHeader} from "../../components/shared/RoomHeader.jsx";
import {SettingsModal} from "../../features/meeting/components/SettingsModal.jsx";
import {useMeetingStore} from '../../features/meeting/store/meeting-store'
import {selectIsMeetingMuted} from '../../features/meeting/store/meeting-selectors'
import {selectIsRecording, selectRecordingSeconds} from '../../features/meeting/store/meeting-selectors'
import {startRecording, stopRecording} from '../../features/meeting/store/meeting-actions'
import toast from "react-hot-toast";

export default function RoomPage() {
    const {slug: roomName} = useParams()

    const isMeetingMuted = useMeetingStore(selectIsMeetingMuted)
    const toggleMeetingMute = useMeetingStore((s) => s.toggleMeetingMute)


    const isRecording = useMeetingStore(selectIsRecording)
    const recordingSeconds = useMeetingStore(selectRecordingSeconds)

    const handleToggleRecording = async () => {
        try {
            if (isRecording) {
                await stopRecording()
            } else {
                await startRecording()
            }
        } catch {
            toast.error('امکان شروع ضبط وجود نداشت.')
        }
    }
    const {
        error,
        status,
        isConnecting,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        isConnected,
        leave,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
    } = useJitsi(roomName)

    const handleCopyLink = () => {
        const joinUrl = window.location.href.replace('/room/', '/join/')
        navigator.clipboard.writeText(joinUrl)
    }


    if (isConnecting) {
        return (
            <div className="w-screen h-screen bg-olive-950">
                <MeetingLoading/>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-screen h-screen bg-olive-950">
                <MeetingError
                    error={error}
                    onLeave={leave}
                />
            </div>
        )
    }

    return (
        <div className="w-screen h-screen bg-olive-950 overflow-hidden flex flex-col">
            <RoomHeader
                slug={roomName}
                isConnected={isConnected}
                onCopyLink={handleCopyLink}
                isMeetingMuted={isMeetingMuted}
                onToggleMeetingMute={toggleMeetingMute}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onToggleRecording={handleToggleRecording}
            />
            <div className="flex flex-1 min-h-0 h-full">
                {/* Side Panel */}
                <SidePanel/>
                {/* Video Area */}
                <div className="flex-1 min-w-0 relative pb-24 md:pb-0">
                    <VideoGrid/>
                    <div className="absolute bottom-0 left-0 right-0 z-30">
                        <MeetingControls
                            isAudioMuted={isAudioMuted}
                            isVideoMuted={isVideoMuted}
                            isScreenSharing={isScreenSharing}
                            onToggleAudio={toggleAudio}
                            onToggleVideo={toggleVideo}
                            onToggleScreenShare={toggleScreenShare}
                            onLeave={leave}
                        />
                    </div>
                </div>
                <SettingsModal/>
            </div>
        </div>
    )
}