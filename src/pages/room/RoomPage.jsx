import {useParams} from 'react-router-dom'

import {useJitsi} from '../../features/meeting/hooks/useJitsi'

import {VideoGrid} from '../../features/meeting/components/VideoGrid'
import {MeetingLoading} from '../../features/meeting/components/MeetingLoading'
import {MeetingError} from '../../features/meeting/components/MeetingError'
import {MeetingControls} from '../../features/meeting/components/MeetingControls'
import {SidePanel} from '../../features/meeting/components/SidePanel'
import {RoomHeader} from '../../components/shared/RoomHeader.jsx'
import {SettingsModal} from '../../features/meeting/components/SettingsModal.jsx'

import {useMeetingStore} from '../../features/meeting/store/meeting-store'

import {
    selectIsMeetingMuted,
    selectIsRecording,
    selectRecordingSeconds,
    selectIsVoiceRecording,
    selectVoiceRecordingSeconds,
} from '../../features/meeting/store/meeting-selectors'

import {
    startRecording,
    stopRecording,
    startVoiceRec,
    stopVoiceRec,
} from '../../features/meeting/store/meeting-actions'

import toast from 'react-hot-toast'

export default function RoomPage() {
    const {
        slug: roomName,
    } = useParams()

    // -------------------------------------------------------------------------
    // Meeting UI state
    // -------------------------------------------------------------------------

    const isMeetingMuted =
        useMeetingStore(
            selectIsMeetingMuted
        )

    const toggleMeetingMute =
        useMeetingStore(
            (s) =>
                s.toggleMeetingMute
        )

    const isVoiceRecording =
        useMeetingStore(
            selectIsVoiceRecording
        )

    const voiceRecordingSeconds =
        useMeetingStore(
            selectVoiceRecordingSeconds
        )

    const isRecording =
        useMeetingStore(
            selectIsRecording
        )

    const recordingSeconds =
        useMeetingStore(
            selectRecordingSeconds
        )

    // -------------------------------------------------------------------------
    // Jitsi
    // -------------------------------------------------------------------------

    const {
        error,

        status,

        isConnecting,

        isReconnecting,

        isAudioMuted,

        isVideoMuted,

        isScreenSharing,

        isConnected,

        leave,

        toggleAudio,

        toggleVideo,

        toggleScreenShare,
    } = useJitsi(roomName)

    // -------------------------------------------------------------------------
    // Recording
    // -------------------------------------------------------------------------

    const handleToggleVoiceRecording =
        async () => {
            try {
                if (
                    isVoiceRecording
                ) {
                    await stopVoiceRec()
                } else {
                    await startVoiceRec()
                }
            } catch {
                toast.error(
                    'امکان شروع ضبط صدا وجود نداشت.'
                )
            }
        }

    const handleToggleRecording =
        async () => {
            try {
                if (isRecording) {
                    await stopRecording()
                } else {
                    await startRecording()
                }
            } catch {
                toast.error(
                    'امکان شروع ضبط وجود نداشت.'
                )
            }
        }

    // -------------------------------------------------------------------------
    // Copy link
    // -------------------------------------------------------------------------

    const handleCopyLink =
        async () => {
            const joinUrl =
                window.location.href.replace(
                    '/room/',
                    '/join/'
                )

            try {
                await navigator.clipboard.writeText(
                    joinUrl
                )

                toast.success(
                    'لینک جلسه کپی شد.'
                )
            } catch {
                toast.error(
                    'کپی لینک انجام نشد.'
                )
            }
        }

    // -------------------------------------------------------------------------
    // Initial connection
    // -------------------------------------------------------------------------

    if (
        isConnecting &&
        !isReconnecting
    ) {
        return (
            <div className="w-screen h-screen bg-olive-950">
                <MeetingLoading />
            </div>
        )
    }

    // -------------------------------------------------------------------------
    // REAL failure only
    // -------------------------------------------------------------------------

    if (
        error &&
        !isReconnecting
    ) {
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

                isVoiceRecording={
                    isVoiceRecording
                }

                voiceRecordingSeconds={
                    voiceRecordingSeconds
                }

                onToggleVoiceRecording={
                    handleToggleVoiceRecording
                }

                isConnected={
                    isConnected
                }

                onCopyLink={
                    handleCopyLink
                }

                isMeetingMuted={
                    isMeetingMuted
                }

                onToggleMeetingMute={
                    toggleMeetingMute
                }

                isRecording={
                    isRecording
                }

                recordingSeconds={
                    recordingSeconds
                }

                onToggleRecording={
                    handleToggleRecording
                }
            />

            <div className="flex flex-1 min-h-0 h-full">
                <SidePanel />

                <div className="flex-1 min-w-0 relative pb-24 md:pb-0">
                    <VideoGrid />

                    {/* ----------------------------------------------------- */}
                    {/* Temporary network interruption                        */}
                    {/* ----------------------------------------------------- */}

                    {isReconnecting && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
                            <div className="flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md px-4 py-2 text-white text-sm shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />

                                <span>
                                    اتصال ضعیف است؛
                                    در حال برقراری مجدد...
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 z-30">
                        <MeetingControls
                            isAudioMuted={
                                isAudioMuted
                            }

                            isVideoMuted={
                                isVideoMuted
                            }

                            isScreenSharing={
                                isScreenSharing
                            }

                            onToggleAudio={
                                toggleAudio
                            }

                            onToggleVideo={
                                toggleVideo
                            }

                            onToggleScreenShare={
                                toggleScreenShare
                            }

                            onLeave={
                                leave
                            }
                        />
                    </div>
                </div>

                <SettingsModal />
            </div>
        </div>
    )
}