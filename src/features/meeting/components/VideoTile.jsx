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
    Pin,
    PinOff,
    ZoomIn,
    ZoomOut,
    MoreHorizontal,
    Maximize2,
    Minimize2,
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
        isPinned = false,
        isFocused = false,
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
        const [isVisible, setIsVisible] = useState(isLarge)
        const [zoom, setZoom] = useState(100)
        const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
        const [desktopActionsOpen, setDesktopActionsOpen] = useState(false)
        const togglePinnedParticipant = useMeetingStore((s) => s.togglePinnedParticipant)
        const toggleFocusedParticipant = useMeetingStore((s) => s.toggleFocusedParticipant)

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
            activeTrack?.streamingStatus === 'restoring'
                ? renegotiationTick
                : null,
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

        // دوربین کاربر باید مثل آینه نمایش داده شود؛ اشتراک صفحه هرگز mirror نمی‌شود.
        // این مقدار مستقل از کلاس CSS نگه داشته می‌شود تا بعد از attach شدن track توسط Jitsi
        // نیز حالت mirror حتماً روی خود عنصر video اعمال شود.
        const shouldMirrorVideo =
            Boolean(participant?.isLocal && !isScreenShare)

        useEffect(() => {
            const element = videoRef.current
            if (!element) return

            element.style.transform = shouldMirrorVideo
                ? `scaleX(-1) scale(${zoom / 100})`
                : `scale(${zoom / 100})`
            element.style.transformOrigin = 'center center'
        }, [shouldMirrorVideo, zoom, activeTrack?.jitsiTrack])

        return (
            <div
                ref={containerRef}
                className={`
                    group relative room-tile bg-[var(--room-bg)] rounded-[18px] overflow-visible flex items-center justify-center border border-white/[.06]

                    ${
                        isPinned
                            ? 'ring-2 ring-[var(--room-blue)] room-tile-pinned'
                            : participant.isActiveSpeaker && !participant.isAudioMuted
                                ? 'ring-1 ring-[var(--room-mint)]/70 room-tile-speaking'
                                : ''
                    }
                    ${isFocused ? 'room-tile-focused' : ''}

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

                {participant.isLocal && connectionLevel === 'weak' && (
                    <div className="absolute top-2 right-2 z-20 room-weak-network" role="status" aria-live="polite">
                        <div className="room-weak-wave" aria-hidden="true">
                            <i /><i /><i /><i /><i />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-semibold text-white leading-none">اینترنت ضعیف است</span>
                            <span className="block text-[9px] text-white/50 mt-1 leading-none">کیفیت اتصال در حال نوسان است</span>
                        </div>
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
                        className="w-full h-full object-contain bg-black !rounded-[18px] transition-transform duration-300 ease-out"
                        style={{
                            transform: shouldMirrorVideo
                                ? `scaleX(-1) scale(${zoom / 100})`
                                : `scale(${zoom / 100})`,
                            transformOrigin: 'center center',
                        }}
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
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--room-surface-3)]/85 rounded-lg px-2 py-1">
                        <MonitorUp className="w-3 h-3 text-white/70" />

                        <span className="text-xs text-white/70">
                            اشتراک صفحه
                        </span>
                    </div>
                )}

                {/* Desktop: one unobtrusive action trigger. The menu never covers the video controls permanently. */}
                <div className="hidden md:block absolute top-2 left-2 z-40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => setDesktopActionsOpen((value) => !value)}
                        className="room-control w-9 h-9 rounded-xl flex items-center justify-center bg-black/45 backdrop-blur-md border border-white/10 text-white/80 hover:text-white shadow-lg"
                        title="گزینه‌های تصویر"
                        aria-label="گزینه‌های تصویر"
                    >
                        <MoreHorizontal size={17} />
                    </button>

                    {desktopActionsOpen && (
                        <div className="absolute left-0 top-10 w-44 rounded-2xl border room-border bg-[var(--room-surface)]/98 backdrop-blur-2xl p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.45)] room-sheet">
                            <button type="button" onClick={() => { togglePinnedParticipant(participant.id); setDesktopActionsOpen(false) }} className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-xs text-white/80 hover:bg-white/[.06]">
                                {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                                <span>{isPinned ? 'برداشتن پین' : 'پین کردن'}</span>
                            </button>
                            <button type="button" onClick={() => { toggleFocusedParticipant(participant.id); setDesktopActionsOpen(false) }} className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-xs text-white/80 hover:bg-white/[.06]">
                                {isFocused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                <span>{isFocused ? 'خروج از Focus' : 'ورود به Focus'}</span>
                            </button>
                            <button type="button" onClick={() => setZoom((z) => Math.min(160, z + 10))} className="w-full h-10 px-3 rounded-xl flex items-center gap-2 text-xs text-white/80 hover:bg-white/[.06]">
                                <ZoomIn size={15} /><span>نمایش بزرگ‌تر</span>
                            </button>
                            {zoom !== 100 && (
                                <button type="button" onClick={() => setZoom(100)} className="w-full h-9 px-3 rounded-xl flex items-center gap-2 text-[11px] text-white/50 hover:bg-white/[.06]">
                                    <ZoomOut size={14} /><span>بازنشانی اندازه ({zoom}%)</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile: compact action trigger lives inside the tile footer, not above the frame. */}
                <button
                    type="button"
                    onClick={() => setMobileActionsOpen(true)}
                    className="md:hidden absolute bottom-2 left-2 z-40 w-8 h-8 rounded-lg flex items-center justify-center bg-black/55 backdrop-blur-md border border-white/10 text-white/80 shadow-lg active:scale-95 transition-transform"
                    title="گزینه‌های تصویر"
                    aria-label="گزینه‌های تصویر"
                >
                    <MoreHorizontal size={16} />
                </button>

                {mobileActionsOpen && (
                    <div className="md:hidden fixed inset-x-3 bottom-[calc(78px+env(safe-area-inset-bottom))] z-[90] rounded-[22px] border room-border bg-[var(--room-surface)]/98 backdrop-blur-2xl p-2 shadow-[0_24px_70px_rgba(0,0,0,.5)] room-sheet">
                        <div className="px-2 pt-1 pb-2 flex items-center justify-between">
                            <span className="text-xs text-white/55 truncate">گزینه‌های {participant.displayName}</span>
                            <button type="button" onClick={() => setMobileActionsOpen(false)} className="text-xs text-white/40 px-2 py-1">بستن</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => { togglePinnedParticipant(participant.id); setMobileActionsOpen(false) }} className={`h-12 rounded-2xl flex flex-col items-center justify-center gap-1 border ${isPinned ? 'bg-[var(--room-blue)] text-white border-[var(--room-blue)]/50' : 'bg-white/[.05] text-white/75 border-white/10'}`}>
                                {isPinned ? <PinOff size={17} /> : <Pin size={17} />}<span className="text-[10px]">{isPinned ? 'برداشتن پین' : 'پین کردن'}</span>
                            </button>
                            <button type="button" onClick={() => { toggleFocusedParticipant(participant.id); setMobileActionsOpen(false) }} className={`h-12 rounded-2xl flex flex-col items-center justify-center gap-1 border ${isFocused ? 'bg-[var(--room-blue)] text-white border-[var(--room-blue)]/50' : 'bg-white/[.05] text-white/75 border-white/10'}`}>
                                {isFocused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span className="text-[10px]">{isFocused ? 'خروج از Focus' : 'Focus'}</span>
                            </button>
                            <button type="button" onClick={() => { setZoom((z) => Math.min(160, z + 10)); setMobileActionsOpen(false) }} className="h-12 rounded-2xl flex flex-col items-center justify-center gap-1 bg-white/[.05] text-white/75 border border-white/10"><ZoomIn size={17} /><span className="text-[10px]">بزرگ‌تر</span></button>
                            <button type="button" onClick={() => { setZoom(100); setMobileActionsOpen(false) }} className="h-12 rounded-2xl flex flex-col items-center justify-center gap-1 bg-white/[.05] text-white/75 border border-white/10"><ZoomOut size={17} /><span className="text-[10px]">بازنشانی</span></button>
                        </div>
                    </div>
                )}

                {/* --------------------------------------------------------- */}
                {/* Bottom bar                                                  */}
                {/* --------------------------------------------------------- */}

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="min-w-0 flex items-center gap-2">
                        {participant.isActiveSpeaker && !isAudioMuted && (
                            <span className="room-speaking-wave" aria-label="در حال صحبت">
                                <i /><i /><i /><i /><i />
                            </span>
                        )}
                        <span className="text-white text-xs font-medium">
                        {participant.displayName}

                        {participant.isLocal &&
                            ' (شما)'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className={`room-status-signal ${connectionLevel}`} title={connectionLevel === 'strong' ? 'اتصال خوب' : connectionLevel === 'medium' ? 'اتصال متوسط' : 'اتصال ضعیف'} aria-label={connectionLevel === 'strong' ? 'اتصال خوب' : connectionLevel === 'medium' ? 'اتصال متوسط' : 'اتصال ضعیف'}>
                            <ConnectionIcon className={`w-[17px] h-[17px] ${connectionColor}`} />
                            <span className="room-signal-dot" />
                        </div>

                        {isAudioMuted ? (
                            <div className="room-mic-status muted" title="میکروفون بسته است" aria-label="میکروفون بسته است">
                                <MicOff className="w-3.5 h-3.5 text-white" />
                            </div>
                        ) : (
                            <div className="room-mic-status live" title="میکروفون باز است" aria-label="میکروفون باز است">
                                <Mic className="w-3.5 h-3.5 text-white" />
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
                    bg-[var(--room-surface-3)]
                    flex
                    items-center
                    justify-center
                    font-bold
                    text-white

                    ${
                        isLarge
                            ? 'w-24 h-24 text-4xl'
                            : 'w-14 h-14 text-2xl'
                    }
                `}
            >
                {initial}
            </div>

            <span className="text-white/45 text-sm">
                {name}
            </span>
        </div>
    )
}