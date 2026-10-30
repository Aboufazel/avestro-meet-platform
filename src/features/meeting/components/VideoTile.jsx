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

import {TileActionsMenu} from './TileActionsMenu'

import {useParticipant} from '../hooks/useParticipants'

import {useParticipantTracks} from '../hooks/useTracks'

import {useMeetingStore} from '../store/meeting-store'

import {
    selectIsMeetingMuted,
} from '../store/meeting-selectors'

/**
 * VideoTile — تنها کامپوننت نمایش تصویر یک شرکت‌کننده.
 *
 * دو variant دارد:
 *  - 'overlay' (پیش‌فرض): ساختار قبلی سمینار؛ نوار نام روی تصویر است. دست‌نخورده باقی می‌ماند
 *    تا رفتار اتاق‌های سمیناری تغییر نکند.
 *  - 'card': ساختار استاندارد کلاس؛ تصویر و نوار اطلاعات دو بخش «مستقل» هستند:
 *      ▸ vt-media : فضای تصویر با نسبت درست و object-fit متناسب با نوع محتوا
 *      ▸ vt-info  : نام + وضعیت میکروفون + کیفیت اتصال در یک ردیف زیر تصویر
 *    در این حالت هیچ آیکون یا نوار کنترلی روی تصویر قرار نمی‌گیرد.
 */
export const VideoTile = memo(
    function VideoTile({
        participantId,
        isLarge = false,
        isPinned = false,
        isFocused = false,
        // false = بیرون از بودجه‌ی ویدیو: آواتار نشان بده و decode نکن
        videoEnabled = true,
        // کلاس: همیشه تصویر «دوربین» را نشان بده (نه اشتراک صفحه) — برای کادر کوچک معلم
        preferCamera = false,
        // false = صدا را از این تایل پخش نکن (وقتی همان فرد در تایل دیگری پخش می‌شود)
        playAudio = true,
        // در حالت تخته، صدای شرکت‌کننده باید بماند ولی ویدئوی زیر لایه دوباره رندر نشود.
        forceVideoOff = false,
        // 'overlay' | 'card'
        variant = 'overlay',
        // برچسب نقش (مثلاً «مدرس») که در نوار اطلاعات کارت نمایش داده می‌شود
        badge = null,
    }) {
        const isCard = variant === 'card'

        const participant =
            useParticipant(
                participantId
            )

        // tick مخصوص همین participant؛ قبلاً یک tick سراسری بود و با هر
        // تغییر track یک نفر، ویدیوی «همه»ی تایل‌ها (روی iOS/Safari) دوباره
        // detach/attach می‌شد.
        const renegotiationTick =
            useMeetingStore(
                (s) => s.renegotiationTicks?.[participantId] ?? 0
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
        // تایل فقط وقتی واقعاً در viewport (یا نزدیک آن) است attach می‌شود؛
        // وقتی از دید خارج شود، خودش را detach می‌کند تا CPU/باتری هدر نرود.
        // تایل بزرگ (isLarge) همیشه به‌عنوان visible در نظر گرفته می‌شود.
        // ---------------------------------------------------------------------
        const [isVisible, setIsVisible] = useState(isLarge)
        const [zoom, setZoom] = useState(100)
        const togglePinnedParticipant = useMeetingStore((s) => s.togglePinnedParticipant)
        const toggleFocusedParticipant = useMeetingStore((s) => s.toggleFocusedParticipant)

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
                !playAudio ||
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
                } catch { /* detach ناموفق نباید رندر را بشکند */ }
            }
        }, [
            audioTrack?.jitsiTrack,
            participant?.isLocal,
            playAudio,
        ])

        // ---------------------------------------------------------------------
        // Video (lazy — فقط وقتی isVisible است)
        // ---------------------------------------------------------------------

        const activeTrack =
            preferCamera
                ? videoTrack
                : desktopTrack ||
                  videoTrack

        useEffect(() => {
            if (
                !videoRef.current ||
                !activeTrack?.jitsiTrack ||
                !isVisible ||
                !videoEnabled ||
                forceVideoOff
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
                } catch { /* detach ناموفق نباید رندر را بشکند */ }
            }
        }, [
            activeTrack?.jitsiTrack,
            activeTrack?.isMuted,
            activeTrack?.streamingStatus === 'restoring'
                ? renegotiationTick
                : null,
            isVisible,
            videoEnabled,
            forceVideoOff,

            ...(isSafariOrIOS
                ? [renegotiationTick]
                : []),
        ])

        // ---------------------------------------------------------------------
        // فقط تصویر دوربین خودمان (روی صفحه‌ی خودمان) مثل آینه نمایش داده می‌شود؛
        // چیزی که برای بقیه ارسال می‌شود تغییری نمی‌کند. اشتراک صفحه و ویدیوی
        // دیگران هرگز mirror نمی‌شود.
        //
        // توجه: این effect و محاسباتش «قبل از» early-return زیر هستند تا ترتیب
        // هوک‌ها هرگز (حتی وقتی participant موقتاً وجود ندارد) عوض نشود.
        // ---------------------------------------------------------------------

        const isScreenShareBeforeMount =
            !preferCamera && !!desktopTrack

        const shouldMirrorVideo =
            Boolean(participant?.isLocal && !isScreenShareBeforeMount)

        useEffect(() => {
            const element = videoRef.current
            if (!element) return

            element.style.transform =
                shouldMirrorVideo || zoom !== 100
                    ? `${shouldMirrorVideo ? 'scaleX(-1) ' : ''}scale(${zoom / 100})`
                    : ''
            element.style.transformOrigin = 'center center'
        }, [shouldMirrorVideo, zoom, activeTrack?.jitsiTrack])

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
            forceVideoOff ||
            !activeTrack ||
            activeTrack.isMuted ||
            !isVisible ||
            (!videoEnabled && !participant.isLocal)

        const isAudioMuted =
            participant.isAudioMuted

        const isScreenShare =
            isScreenShareBeforeMount

        // ---------------------------------------------------------------------
        // اشتراک صفحه در variant «card» فقط در نوار اطلاعات اعلام می‌شود؛
        // هیچ چیزی روی تصویر قرار نمی‌گیرد.
        // ---------------------------------------------------------------------
        const videoFitClass = isCard
            ? (isScreenShare ? 'vt-video is-contain' : 'vt-video is-cover')
            : 'w-full h-full object-contain bg-black !rounded-[18px]'

        return (
            <div
                ref={containerRef}
                className={`
                    ${isCard ? 'vt vt-card' : 'group relative room-tile bg-[var(--room-bg)] rounded-[18px] overflow-visible flex items-center justify-center border border-white/[.06]'}

                    ${
                        isPinned
                            ? 'ring-2 ring-[var(--room-blue)] room-tile-pinned'
                            : participant.isActiveSpeaker && !participant.isAudioMuted
                                ? 'ring-1 ring-[var(--room-mint)]/70 room-tile-speaking'
                                : ''
                    }
                    ${isFocused ? 'room-tile-focused' : ''}
                    ${isCard && isLarge ? 'vt-large' : ''}
                `}
            >
                {/* --------------------------------------------------------- */}
                {/* هشدار نت ضعیف خودِ کاربر — فقط در variant علاوه‌بر نوار     */}
                {/* اطلاعات (card) که سیگنال قرمز همان‌جا دیده می‌شود، بنر     */}
                {/* مستقل دارد.                                                */}
                {/* --------------------------------------------------------- */}

                {!isCard && participant.isLocal && connectionLevel === 'weak' && (
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
                {/* --------------------------------------------------------- */}

                {participant.isConnectionInterrupted &&
                    !isVideoOff && (
                        <div className={`${isCard ? 'vt-media-note' : 'absolute inset-0 z-20 flex items-center justify-center bg-black/70'}`}>
                            <div className="flex flex-col items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />

                                <span className="text-white text-sm">
                                    اتصال ناپایدار...
                                </span>
                            </div>
                        </div>
                    )}

                {/* --------------------------------------------------------- */}
                {/* Video + Audio (بخش تصویری کارت)                            */}
                {/* --------------------------------------------------------- */}

                <div className={isCard ? 'vt-media' : 'contents'}>
                    {!isVideoOff ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            // عنصر ویدئو همیشه muted است: صدا از عنصر <audio> جداگانه پخش
                            // می‌شود. این کار سیاست autoplay مرورگرها را هم روی ویدئوی
                            // دوربین دیگران قفل نمی‌کند (تایل سیاه نمی‌ماند).
                            muted
                            className={videoFitClass}
                            style={{
                                // transform فقط وقت لزوم (mirror خودم/zoom)؛ transform دائمی یک
                                // لایه‌ی GPU جدا برای هر ویدیو می‌سازد.
                                transform:
                                    shouldMirrorVideo || zoom !== 100
                                        ? `${shouldMirrorVideo ? 'scaleX(-1) ' : ''}scale(${zoom / 100})`
                                        : undefined,
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
                            compact={isCard}
                        />
                    )}

                    <audio
                        ref={audioRef}
                        autoPlay
                    />
                </div>

                {/* --------------------------------------------------------- */}
                {/* Screen share chip (فقط variant قدیمی/سمینار)               */}
                {/* --------------------------------------------------------- */}

                {!isCard && isScreenShare && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--room-surface-3)]/85 rounded-lg px-2 py-1">
                        <MonitorUp className="w-3 h-3 text-white/70" />

                        <span className="text-xs text-white/70">
                            اشتراک صفحه
                        </span>
                    </div>
                )}

                {!isCard && (
                    <TileActionsMenu
                        name={participant.displayName}
                        isPinned={isPinned}
                        isFocused={isFocused}
                        zoom={zoom}
                        onTogglePin={() => togglePinnedParticipant(participant.id)}
                        onToggleFocus={() => toggleFocusedParticipant(participant.id)}
                        onZoomIn={() => setZoom((z) => Math.min(160, z + 10))}
                        onZoomReset={() => setZoom(100)}
                    />
                )}

                {/* --------------------------------------------------------- */}
                {/* Bottom bar                                                 */}
                {/* --------------------------------------------------------- */}

                {!isCard ? (
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
                ) : (
                    /* نوار اطلاعات — بخش دومِ مستقل کارت؛ هرگز روی تصویر نیست */
                    <div className="vt-info">
                        <div className="vt-info-main">
                            {participant.isActiveSpeaker && !isAudioMuted && (
                                <span className="room-speaking-wave vt-speaking" aria-label="در حال صحبت">
                                    <i /><i /><i /><i /><i />
                                </span>
                            )}
                            {badge && <span className="vt-badge">{badge}</span>}
                            <span className="vt-name" title={participant.displayName}>
                                {participant.displayName}
                                {participant.isLocal ? ' (شما)' : ''}
                            </span>
                        </div>

                        <div className="vt-info-status">
                            {participant.isLocal && connectionLevel === 'weak' && (
                                <span className="vt-weak-tag">نت ضعیف</span>
                            )}
                            {isScreenShare && <MonitorUp size={12} className="vt-share-icon" aria-label="اشتراک صفحه" />}
                            <span className={`vt-signal ${connectionLevel}`} title={connectionLevel === 'strong' ? 'اتصال خوب' : connectionLevel === 'medium' ? 'اتصال متوسط' : 'اتصال ضعیف'}>
                                <ConnectionIcon size={13} />
                            </span>
                            <span className={`vt-mic ${isAudioMuted ? 'is-muted' : 'is-live'}`} title={isAudioMuted ? 'میکروفون بسته است' : 'میکروفون باز است'}>
                                {isAudioMuted ? <MicOff size={12} /> : <Mic size={12} />}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        )
    }
)

function VideoPlaceholder({
    name,
    isLarge,
    compact = false,
}) {
    const initial =
        name?.[0]?.toUpperCase() ||
        '?'

    // در variant «card» نام در نوار اطلاعات پایین کارت است؛
    // پس جای‌نگه‌دار فقط یک آواتار متناسب و وسط‌چین است.
    if (compact) {
        return (
            <div className="vt-media-empty">
                <div className="vt-avatar">{initial}</div>
            </div>
        )
    }

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
