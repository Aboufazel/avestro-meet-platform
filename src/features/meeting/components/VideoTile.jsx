import {
    useEffect,
    useRef,
    memo,
} from 'react'

import {
    Mic,
    MicOff,
    MonitorUp,
    SignalHigh,
    SignalMedium,
    SignalLow,
} from 'lucide-react'

import {useParticipant} from '../hooks/useParticipants'

import {useParticipantTracks} from '../hooks/useTracks'

import {useMeetingStore} from '../store/meeting-store'

import {
    selectIsMeetingMuted,
    selectRenegotiationTick,
} from '../store/meeting-selectors'

export const VideoTile = memo(
    function VideoTile({
        participantId,
        isLarge = false,
    }) {
        const participant =
            useParticipant(
                participantId
            )

        const renegotiationTick =
            useMeetingStore(
                selectRenegotiationTick
            )

        const {
            videoTrack,
            desktopTrack,
            audioTrack,
        } =
            useParticipantTracks(
                participantId
            )

        const audioRef =
            useRef(null)

        const videoRef =
            useRef(null)

        const isMeetingMuted =
            useMeetingStore(
                selectIsMeetingMuted
            )

        const isSafariOrIOS =
            /^((?!chrome|android).)*safari/i.test(
                navigator.userAgent
            ) ||
            /iPad|iPhone|iPod/.test(
                navigator.userAgent
            )

        // ---------------------------------------------------------------------
        // Audio
        // ---------------------------------------------------------------------

        useEffect(() => {
            if (
                !audioRef.current
            ) {
                return
            }

            audioRef.current.muted =
                isMeetingMuted
        }, [
            isMeetingMuted,
        ])

        useEffect(() => {
            if (
                !audioRef.current ||
                !audioTrack?.jitsiTrack ||
                participant?.isLocal
            ) {
                return
            }

            const element =
                audioRef.current

            try {
                audioTrack.jitsiTrack.attach(
                    element
                )
            } catch (error) {
                console.warn(
                    '[VideoTile] Audio attach failed:',
                    error
                )
            }

            return () => {
                try {
                    audioTrack.jitsiTrack.detach(
                        element
                    )
                } catch {}
            }
        }, [
            audioTrack?.jitsiTrack,
            participant?.isLocal,
        ])

        // ---------------------------------------------------------------------
        // Video
        // ---------------------------------------------------------------------

        const activeTrack =
            desktopTrack ||
            videoTrack

        useEffect(() => {
            if (
                !videoRef.current ||
                !activeTrack?.jitsiTrack
            ) {
                return
            }

            const element =
                videoRef.current

            try {
                activeTrack.jitsiTrack.attach(
                    element
                )
            } catch (error) {
                console.warn(
                    '[VideoTile] Video attach failed:',
                    error
                )
            }

            return () => {
                try {
                    activeTrack.jitsiTrack.detach(
                        element
                    )
                } catch {}
            }
        }, [
            activeTrack?.jitsiTrack,
            activeTrack?.isMuted,

            ...(isSafariOrIOS
                ? [renegotiationTick]
                : []),
        ])

        if (!participant) {
            return null
        }

        // ---------------------------------------------------------------------
        // Connection
        // ---------------------------------------------------------------------

        function getConnectionLevel(
            quality
        ) {
            if (
                quality == null
            ) {
                return 'strong'
            }

            if (
                quality >= 60
            ) {
                return 'strong'
            }

            if (
                quality >= 30
            ) {
                return 'medium'
            }

            return 'weak'
        }

        const connectionLevel =
            getConnectionLevel(
                participant.connectionQuality
            )

        const ConnectionIcon =
            {
                strong:
                    SignalHigh,

                medium:
                    SignalMedium,

                weak:
                    SignalLow,
            }[
                connectionLevel
            ]

        const connectionColor =
            {
                strong:
                    'text-green-400',

                medium:
                    'text-yellow-400',

                weak:
                    'text-red-400',
            }[
                connectionLevel
            ]

        const isVideoOff =
            !activeTrack ||
            activeTrack.isMuted

        const isAudioMuted =
            participant.isAudioMuted

        const isScreenShare =
            !!desktopTrack

        return (
            <div
                className={`
                    relative
                    bg-olive-900
                    rounded-xl
                    overflow-hidden
                    flex
                    items-center
                    justify-center

                    ${
                        participant.isActiveSpeaker
                            ? 'ring-2 ring-olive-400'
                            : ''
                    }

                    ${
                        isLarge
                            ? 'w-full h-full'
                            : 'w-full aspect-video'
                    }
                `}
            >
                {/* --------------------------------------------------------- */}
                {/* Temporary connection interruption                         */}
                {/* --------------------------------------------------------- */}

                {participant.isConnectionInterrupted &&
                    !isVideoOff && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                            <div className="flex flex-col items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />

                                <span className="text-white text-sm">
                                    اتصال ناپایدار...
                                </span>
                            </div>
                        </div>
                    )}

                {/* --------------------------------------------------------- */}
                {/* Video                                                       */}
                {/* --------------------------------------------------------- */}

                {!isVideoOff ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={
                            participant.isLocal
                        }
                        className={`
                            w-full
                            h-full
                            object-contain
                            bg-black
                            !rounded-[18px]

                            ${
                                participant.isLocal &&
                                !isScreenShare
                                    ? 'scale-x-[-1]'
                                    : ''
                            }
                        `}
                    />
                ) : (
                    <VideoPlaceholder
                        name={
                            participant.displayName
                        }
                        isLarge={
                            isLarge
                        }
                    />
                )}

                {/* --------------------------------------------------------- */}
                {/* Audio                                                       */}
                {/* --------------------------------------------------------- */}

                <audio
                    ref={audioRef}
                    autoPlay
                />

                {/* --------------------------------------------------------- */}
                {/* Screen share                                                */}
                {/* --------------------------------------------------------- */}

                {isScreenShare && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-olive-800/80 rounded-lg px-2 py-1">
                        <MonitorUp className="w-3 h-3 text-olive-300" />

                        <span className="text-xs text-olive-300">
                            اشتراک صفحه
                        </span>
                    </div>
                )}

                {/* --------------------------------------------------------- */}
                {/* Bottom bar                                                  */}
                {/* --------------------------------------------------------- */}

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="text-white text-xs font-medium truncate max-w-[70%]">
                        {participant.displayName}

                        {participant.isLocal &&
                            ' (شما)'}
                    </span>

                    <div className="flex items-center gap-1.5">
                        <div className="flex flex-row items-center justify-center w-8 h-8">
                            <ConnectionIcon
                                className={`
                                    w-6 h-6
                                    ${connectionColor}
                                `}
                            />
                        </div>

                        {isAudioMuted ? (
                            <div className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center">
                                <MicOff className="w-3 h-3 text-white" />
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-olive-600/80 flex items-center justify-center">
                                <Mic className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
)

function VideoPlaceholder({
    name,
    isLarge,
}) {
    const initial =
        name?.[0]?.toUpperCase() ||
        '?'

    return (
        <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
            <div
                className={`
                    rounded-full
                    bg-olive-700
                    flex
                    items-center
                    justify-center
                    font-bold
                    text-olive-100

                    ${
                        isLarge
                            ? 'w-24 h-24 text-4xl'
                            : 'w-14 h-14 text-2xl'
                    }
                `}
            >
                {initial}
            </div>

            <span className="text-olive-400 text-sm">
                {name}
            </span>
        </div>
    )
}