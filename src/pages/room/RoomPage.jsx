import {useParams} from 'react-router-dom'

import {useJitsi} from '../../features/meeting/hooks/useJitsi'

import {VideoGrid} from '../../features/meeting/components/VideoGrid'
import {MeetingLoading} from '../../features/meeting/components/MeetingLoading'
import {MeetingError} from '../../features/meeting/components/MeetingError'
import {MeetingControls} from '../../features/meeting/components/MeetingControls'
import {SidePanel} from '../../features/meeting/components/SidePanel'
import {RoomHeader} from "../../components/shared/RoomHeader.jsx";

export default function RoomPage() {
    const {slug: roomName} = useParams()

    const {
        status,
        isConnected,
        error,
        isConnecting,

        isAudioMuted,
        isVideoMuted,
        isScreenSharing,

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
            />
            <div className="flex h-full">
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

                {/* Side Panel */}
                <SidePanel/>
            </div>
        </div>
    )
}