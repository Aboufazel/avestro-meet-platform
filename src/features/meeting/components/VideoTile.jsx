import {useEffect, useRef, memo} from 'react'
import {Mic, MicOff, MonitorUp} from 'lucide-react'
import {useParticipant} from '../hooks/useParticipants'
import {useParticipantTracks} from '../hooks/useTracks'
import {useMeetingStore} from '../store/meeting-store'
import {selectIsMeetingMuted} from '../store/meeting-selectors'
import {selectRenegotiationTick} from '../store/meeting-selectors'
import {SignalHigh, SignalMedium, SignalLow} from 'lucide-react'

/**
 * VideoTile
 * نمایش ویدیو + اطلاعات یک شرکت‌کننده
 *
 * @param {{ participantId: string, isLarge?: boolean }} props
 */
export const VideoTile = memo(function VideoTile({participantId, isLarge = false}) {
    const participant = useParticipant(participantId)
    const renegotiationTick = useMeetingStore(selectRenegotiationTick)
    const {videoTrack, desktopTrack, audioTrack} = useParticipantTracks(participantId)
    const audioRef = useRef(null)
    const isMeetingMuted = useMeetingStore(selectIsMeetingMuted)
    const isSafariOrIOS = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent)


    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMeetingMuted
        }
    }, [isMeetingMuted])

    useEffect(() => {
        if (!audioRef.current || !audioTrack?.jitsiTrack || participant?.isLocal) return
        audioTrack.jitsiTrack.attach(audioRef.current)
        return () => {
            audioTrack.jitsiTrack.detach(audioRef.current)
        }
    }, [audioTrack?.jitsiTrack, participant?.isLocal])
    const videoRef = useRef(null)

    const activeTrack = desktopTrack || videoTrack

    // // attach/detach track به video element
    // useEffect(() => {
    //     if (!videoRef.current || !activeTrack?.jitsiTrack) return
    //     activeTrack.jitsiTrack.attach(videoRef.current)
    //     return () => {
    //         activeTrack.jitsiTrack.detach(videoRef.current)
    //     }
    // }, [activeTrack?.jitsiTrack, activeTrack?.isMuted])


    useEffect(() => {
        if (!videoRef.current || !activeTrack?.jitsiTrack) return
        activeTrack.jitsiTrack.attach(videoRef.current)
        return () => {
            activeTrack.jitsiTrack.detach(videoRef.current)
        }
    }, [activeTrack?.jitsiTrack, activeTrack?.isMuted, ...(isSafariOrIOS ? [renegotiationTick] : [])])

    function getConnectionLevel(quality) {
        if (quality == null) return 'strong'
        if (quality >= 60) return 'strong'
        if (quality >= 30) return 'medium'
        return 'weak'
    }

    if (!participant) return null


    const isVideoOff = !activeTrack || activeTrack.isMuted
    const isAudioMuted = participant.isAudioMuted
    const isScreenShare = !!desktopTrack
    const connectionLevel = getConnectionLevel(participant.connectionQuality)

    const ConnectionIcon = {
        strong: SignalHigh,
        medium: SignalMedium,
        weak: SignalLow,
    }[connectionLevel]

    const connectionColor = {
        strong: 'text-green-400',
        medium: 'text-yellow-400',
        weak: 'text-red-400',
    }[connectionLevel]

    return (
        <div
            className={`
        relative bg-olive-900 rounded-xl overflow-hidden flex items-center justify-center
        ${participant.isActiveSpeaker ? 'ring-2 ring-olive-400' : ''}
        ${isLarge ? 'w-full h-full' : 'w-full aspect-video'}
      `}
        >
            {!isVideoOff && participant.isConnectionInterrupted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <span className="text-white text-sm">در حال اتصال مجدد...</span>
                </div>
            )}
            {/* Video */}
            {!isVideoOff ? (
                // <video
                //     ref={videoRef}
                //     autoPlay
                //     playsInline
                //     muted={participant.isLocal}
                //     className={`w-full h-full object-cover ${participant.isLocal && !isScreenShare ? 'scale-x-[-1]' : ''}`}
                // />
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className={`w-full h-full object-contain bg-black
                     !rounded-[18px]
                     ${participant.isLocal && !isScreenShare ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <VideoPlaceholder name={participant.displayName} isLarge={isLarge}/>
            )}
            <audio ref={audioRef} autoPlay/>
            {/* Screen share indicator */}
            {isScreenShare && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-olive-800/80 rounded-lg px-2 py-1">
                    <MonitorUp className="w-3 h-3 text-olive-300"/>
                    <span className="text-xs text-olive-300">اشتراک صفحه</span>
                </div>
            )}

            {/* Bottom bar */}
            <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-white text-xs font-medium truncate max-w-[80%]">
          {participant.displayName}
            {participant.isLocal && ' (شما)'}
        </span>
                <div className="flex items-center gap-1.5">
                    <div className={'flex flex-row items-center justify-center w-10 h-10'}>
                        <ConnectionIcon className={`w-8 h-8 ${connectionColor}`} />
                    </div>
                    {isAudioMuted ? (
                        <div className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center">
                            <MicOff className="w-3 h-3 text-white"/>
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-olive-600/80 flex items-center justify-center">
                            <Mic className="w-3 h-3 text-white"/>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})

/**
 * placeholder وقتی ویدیو خاموشه
 */
function VideoPlaceholder({name, isLarge}) {
    const initial = name?.[0]?.toUpperCase() || '?'
    return (
        <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
            <div className={`
        rounded-full bg-olive-700 flex items-center justify-center font-bold text-olive-100
        ${isLarge ? 'w-24 h-24 text-4xl' : 'w-14 h-14 text-2xl'}
      `}>
                {initial}
            </div>
            <span className="text-olive-400 text-sm">{name}</span>
        </div>
    )
}