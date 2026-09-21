import {
    useEffect,
    useRef,
    useState,
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

        const containerRef =
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
        // Visibility (lazy attach)
        //
        // چرا این بخش اضافه شد:
        // قبلاً هر VideoTile به محض mount شدن، ویدیوی participant را
        // attach می‌کرد — حتی تایل‌های کوچکی که در نوار افقی پایین
        // (overflow-x-auto) هستند و عملاً دیده نمی‌شوند. یعنی مرورگر
        // مجبور بود ویدیوهایی که کسی نگاهشان نمی‌کند را هم decode کند.
        // این روی موبایل مصرف CPU/باتری را به‌شدت بالا می‌برد.
        //
        // با IntersectionObserver، تایل فقط وقتی واقعاً در viewport
        // (یا نزدیک آن) است attach می‌شود؛ وقتی از دید خارج شود،
        // خودش را detach می‌کند.
        //
        // تایل بزرگ (isLarge) همیشه به‌عنوان visible در نظر گرفته
        // می‌شود چون معمولاً از ابتدا در دید است.
        // ---------------------------------------------------------------------
        const [isVisible, setIsVisible] =
            useState(isLarge)

        // isFrozen حذف شد — heuristic فریم‌شمار بیش‌ازحد حساس بود و با
        // کوچیک‌ترین لگ چند فریمی (طبیعی روی نت موبایل) قفل می‌شد روی
        // "ناپایدار" و دیگر true نمی‌شد false. حالا overlay فقط به سیگنال
        // واقعی خود Jitsi (participant.isConnectionInterrupted) تکیه
        // می‌کند که مبتنی بر وضعیت واقعی اتصال (PARTICIPANT_CONN_STATUS)
        // است، نه گمانه‌زنی روی رندر فریم.

        useEffect(() => {
            if (isLarge) {
                setIsVisible(true)
                return
            }

            const node = containerRef.current
            if (!node || typeof IntersectionObserver === 'undefined') {
                setIsVisible(true)
                return
            }

            const observer = new IntersectionObserver(
                ([entry]) => {
                    setIsVisible(entry.isIntersecting)
                },
                {
                    root: null,
                    rootMargin: '50px',
                    threshold: 0.15,
                }
            )

            observer.observe(node)

            return () => observer.disconnect()
        }, [isLarge])

        // ---------------------------------------------------------------------
        // Audio
        //
        // صدا همیشه attach می‌ماند (حتی اگر ویدیو دیده نشود) چون صدا
        // سبک است و شرکت‌کننده باید همیشه شنیده شود.
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
        // Video (lazy — فقط وقتی isVisible است)
        // ---------------------------------------------------------------------

        const activeTrack =
            desktopTrack ||
            videoTrack

        useEffect(() => {
            if (
                !videoRef.current ||
                !activeTrack?.jitsiTrack ||
                !isVisible
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
            isVisible,

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
            quality,
            packetLoss
        ) {
            // پکت‌لاس بالای ۱۰٪ یعنی مشکل واقعی —
            // مستقل از اینکه quality (که با adaptive bitrate
            // خودش را جمع‌وجور می‌کند) چه می‌گوید.
            if (
                packetLoss != null &&
                packetLoss > 10
            ) {
                return 'weak'
            }

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
                participant.connectionQuality,
                participant.packetLoss
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
            activeTrack.isMuted ||
            !isVisible

        const isAudioMuted =
            participant.isAudioMuted

        const isScreenShare =
            !!desktopTrack

        return (
            <div
                ref={containerRef}
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
                {/* هشدار نت ضعیف خودِ کاربر (لوکال)                            */}
                {/*                                                             */}
                {/* برخلاف overlay بالا (که برای فریز شدن تصویر طرف مقابل        */}
                {/* است)، این یک بنر غیرمسدودکننده است: تصویر خودش را کامل      */}
                {/* می‌بیند، فقط باخبر می‌شود که آپلودش ضعیف است و ممکن است      */}
                {/* بقیه او را بد ببینند.                                        */}
                {/* --------------------------------------------------------- */}

                {participant.isLocal &&
                    connectionLevel === 'weak' && (
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-1.5 bg-red-500/90 py-1.5 px-2">
                            <SignalLow className="w-3.5 h-3.5 text-white shrink-0" />
                            <span className="text-white text-xs font-medium">
                                اینترنت شما ضعیف است
                            </span>
                        </div>
                    )}

                {/* --------------------------------------------------------- */}
                {/* Temporary connection interruption                         */}
                {/*                                                             */}
                {/* فقط به participant.isConnectionInterrupted (سیگنال واقعی   */}
                {/* Jitsi، از PARTICIPANT_CONN_STATUS_CHANGED) تکیه می‌کند —    */}
                {/* یعنی وقتی هم صدا هم تصویر واقعاً از این شرکت‌کننده متوقف     */}
                {/* شده، نه با هر لگ کوچک چند فریمی.                            */}
                {/* --------------------------------------------------------- */}

                {participant.isConnectionInterrupted &&
                    !isVideoOff && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-md">
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