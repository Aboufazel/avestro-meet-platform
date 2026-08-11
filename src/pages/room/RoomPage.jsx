import {memo, useCallback, useEffect, useRef, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {
    Copy,
    MessageSquare,
    VolumeX,
    Volume2,
    Mic,
    MicOff,
    Send,
    Users,
    VideoOff,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react'
import {Avatar} from '../../components/ui/Avatar'
import {useAuthStore} from '../../store/authStore'
import toast from 'react-hot-toast'


const JITSI_DOMAIN = 'meet.avestro.ir'

const INITIAL_MESSAGES = [
    {
        id: '1',
        sender: 'علی رضایی',
        text: 'سلام به همه!',
        time: '۱۰:۰۲',
    },
    {
        id: '2',
        sender: 'سارا محمدی',
        text: 'سلام، آماده‌ام',
        time: '۱۰:۰۳',
    },
]

/**
 * Jitsi configuration optimized for normal laptop usage.
 *
 * Important:
 * These settings reduce unnecessary video/audio processing,
 * but the final CPU usage still depends heavily on:
 * - number of participants
 * - camera resolutions
 * - browser hardware acceleration
 * - codec selected by Jitsi
 */
const JITSI_CONFIG = {
    startWithAudioMuted: false,
    startWithVideoMuted: false,

    disableDeepLinking: true,

    prejoinPageEnabled: false,

    prejoinConfig: {
        enabled: false,
    },

    // Reduce unnecessary audio-level polling.
    disableAudioLevels: true,

    // Keep remote video receiving bounded.
    channelLastN: 6,

    // Reduce HD decoding when many participants are visible.
    maxFullResolutionParticipants: 4,

    // Don't request 1080p from every local camera.
    resolution: 720,

    constraints: {
        video: {
            height: {
                ideal: 720,
                max: 720,
                min: 240,
            },
        },
    },

    /*
     * Keep desktop sharing relatively light.
     * This is especially useful for laptops.
     */
    desktopSharingFrameRate: {
        min: 5,
        max: 10,
    },

    /*
     * Avoid unnecessary analytics/stats processing.
     */
    gatherStats: false,

    /*
     * Disable expensive/unused UI-side features.
     */
    faceLandmarks: {
        enableFaceCentering: false,
        enableFaceExpressionsDetection: false,
        enableDisplayFaceExpressions: false,
        enableRTCStats: false,
    },

    filmstrip: {
        disableResizable: true,
    },

    disableCameraTintForeground: true,

    /*
     * Keep Jitsi's normal adaptive video system.
     * We do NOT disable simulcast.
     */
    disableSimulcast: false,

    /*
     * Prefer efficient codecs.
     *
     * VP8 remains a safe baseline for browser compatibility.
     * VP9/AV1 can be more CPU-intensive on some machines.
     */
    videoQuality: {
        codecPreferenceOrder: ['VP8', 'H264', 'VP9', 'AV1'],
    },
}

const JITSI_INTERFACE_CONFIG = {
    // TOOLBAR_BUTTONS: [
    //     'microphone',
    //     'camera',
    //     'desktop',
    //     'fullscreen',
    //     'fodeviceselection',
    //     'hangup',
    //     'chat',
    //     'raisehand',
    //     'tileview',
    //     'participants-pane',
    // ],

    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    MOBILE_APP_PROMO: false,
    DISPLAY_WELCOME_FOOTER: false,

    /*
     * Prevent very large tile layouts.
     */
    TILE_VIEW_MAX_COLUMNS: 4,
}

/* -------------------------------------------------------------------------- */
/* Timer                                                                       */
/* -------------------------------------------------------------------------- */

const Timer = memo(function Timer() {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        const startedAt = Date.now()

        const update = () => {
            setSeconds(Math.floor((Date.now() - startedAt) / 1000))
        }

        const intervalId = window.setInterval(update, 1000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [])

    const hours = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, '0')

    const minutes = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, '0')

    const secs = (seconds % 60)
        .toString()
        .padStart(2, '0')

    return (
        <span className="text-olive-400 text-sm font-mono tabular-nums">
            {hours}:{minutes}:{secs}
        </span>
    )
})

/* -------------------------------------------------------------------------- */
/* Jitsi container                                                             */
/* -------------------------------------------------------------------------- */

const JitsiContainer = memo(function JitsiContainer({
                                                        slug,
                                                        user,
                                                        onConnected,
                                                        onDisconnected,
                                                        onParticipantsChange,
                                                        onMessage,
                                                        onAudioMuteChange,
                                                        onVideoMuteChange,
                                                        apiRef,
                                                    }) {
    const containerRef = useRef(null)
    const initializedRef = useRef(false)

    useEffect(() => {
        if (initializedRef.current) {
            return
        }

        if (!containerRef.current) {
            return
        }

        if (!window.JitsiMeetExternalAPI) {
            toast.error('خطا در بارگذاری موتور ویدیو')
            return
        }

        initializedRef.current = true

        const displayName =
            user?.display_name ||
            user?.displayName ||
            'مهمان'

        const email = user?.email || ''

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
            roomName: slug,

            parentNode: containerRef.current,

            width: '100%',
            height: '100%',

            // userInfo: {
            //     displayName,
            //     email,
            // },
            userInfo: {
                displayName: user?.display_name || user?.displayName || sessionStorage.getItem('guest_name') || 'مهمان',
                email: user?.email || '',
            },

            configOverwrite: JITSI_CONFIG,

            interfaceConfigOverwrite: JITSI_INTERFACE_CONFIG,
        })

        apiRef.current = api

        /* ------------------------------------------------------------------ */
        /* Event handlers                                                      */
        /* ------------------------------------------------------------------ */

        const handleJoined = (event) => {
            onConnected()

            onParticipantsChange([
                {
                    id: event.id,
                    name: displayName,
                    role: 'host',
                    mic: true,
                    cam: true,
                },
            ])

            toast.success('به جلسه متصل شدید')
        }

        const handleParticipantJoined = (participant) => {
            onParticipantsChange((previous) => {
                if (previous.some((item) => item.id === participant.id)) {
                    return previous
                }

                return [
                    ...previous,
                    {
                        id: participant.id,
                        name: participant.displayName || 'شرکت‌کننده',
                        role: 'participant',
                        mic: true,
                        cam: true,
                    },
                ]
            })
        }

        const handleParticipantLeft = (participant) => {
            onParticipantsChange((previous) =>
                previous.filter((item) => item.id !== participant.id)
            )
        }

        const handleAudioMute = ({muted}) => {
            onAudioMuteChange(muted)
        }

        const handleVideoMute = ({muted}) => {
            onVideoMuteChange(muted)
        }

        const handleIncomingMessage = ({from, message, nick}) => {
            const now = new Date().toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
            })

            onMessage({
                id: `${Date.now()}-${Math.random()}`,
                sender: nick || from || 'شرکت‌کننده',
                text: message,
                time: now,
            })
        }

        const handleLeft = () => {
            onDisconnected()
        }

        /* ------------------------------------------------------------------ */
        /* Register listeners                                                   */
        /* ------------------------------------------------------------------ */

        api.addListener('videoConferenceJoined', handleJoined)
        api.addListener('participantJoined', handleParticipantJoined)
        api.addListener('participantLeft', handleParticipantLeft)

        api.addListener(
            'audioMuteStatusChanged',
            handleAudioMute
        )

        api.addListener(
            'videoMuteStatusChanged',
            handleVideoMute
        )

        api.addListener(
            'incomingMessage',
            handleIncomingMessage
        )

        api.addListener(
            'videoConferenceLeft',
            handleLeft
        )

        /* ------------------------------------------------------------------ */
        /* Cleanup                                                              */
        /* ------------------------------------------------------------------ */

        return () => {
            initializedRef.current = false

            api.removeListener(
                'videoConferenceJoined',
                handleJoined
            )

            api.removeListener(
                'participantJoined',
                handleParticipantJoined
            )

            api.removeListener(
                'participantLeft',
                handleParticipantLeft
            )

            api.removeListener(
                'audioMuteStatusChanged',
                handleAudioMute
            )

            api.removeListener(
                'videoMuteStatusChanged',
                handleVideoMute
            )

            api.removeListener(
                'incomingMessage',
                handleIncomingMessage
            )

            api.removeListener(
                'videoConferenceLeft',
                handleLeft
            )

            api.dispose()

            apiRef.current = null
        }
    }, [
        slug,
        user,
        apiRef,
        onConnected,
        onDisconnected,
        onParticipantsChange,
        onMessage,
        onAudioMuteChange,
        onVideoMuteChange,
    ])

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
        />
    )
})

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

// const RoomHeader = memo(function RoomHeader({
//     slug,
//     isConnected,
//     onCopyLink,
// }) {
//     return (
//         <header className="h-14 bg-olive-900 border-b border-olive-800 flex items-center justify-between px-4 shrink-0">
//             <div className="flex items-center gap-2 min-w-0">
//                 <img
//                     src="/avestro-logo.png"
//                     alt="اَوسترو"
//                     className="w-7 h-7 shrink-0"
//                 />
//
//                 <span className="text-olive-100 font-medium text-sm hidden sm:block">
//                     اَوسترو میت
//                 </span>
//
//                 <span className="text-olive-600 text-sm hidden sm:block">
//                     ·
//                 </span>
//
//                 <span className="text-olive-500 text-sm truncate max-w-[120px] sm:max-w-none">
//                     {slug}
//                 </span>
//             </div>
//
//             <div className="flex items-center gap-2 sm:gap-4">
//                 <Timer />
//
//                 <div className="flex items-center gap-1">
//                     {isConnected ? (
//                         <Wifi className="w-4 h-4 text-olive-500" />
//                     ) : (
//                         <WifiOff className="w-4 h-4 text-olive-600 animate-pulse" />
//                     )}
//
//                     <span className="text-xs text-olive-500 hidden sm:block">
//                         {isConnected
//                             ? 'متصل'
//                             : 'در حال اتصال...'}
//                     </span>
//                 </div>
//
//                 <button
//                     type="button"
//                     onClick={onCopyLink}
//                     className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-300 transition-colors border border-olive-800 rounded-lg px-2.5 py-1.5"
//                 >
//                     <Copy className="w-3.5 h-3.5" />
//
//                     <span className="hidden sm:block">
//                         کپی لینک
//                     </span>
//                 </button>
//             </div>
//         </header>
//     )
// })


const RoomHeader = memo(function RoomHeader({
                                                slug,
                                                isConnected,
                                                onCopyLink,
                                                isMeetingMuted,
                                                onToggleMeetingMute,
                                            }) {
    return (
        <header className="h-14 bg-olive-900 border-b border-olive-800 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
                <img src="/avestro-logo.png" alt="اَوسترو" className="w-7 h-7 shrink-0"/>
                <span className="text-olive-100 font-medium text-sm hidden sm:block">اَوسترو میت</span>
                <span className="text-olive-600 text-sm hidden sm:block">·</span>
                <span className="text-olive-500 text-sm truncate max-w-[120px] sm:max-w-none">{slug}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <Timer/>

                <div className="flex items-center gap-1">
                    {isConnected ? (
                        <Wifi className="w-4 h-4 text-olive-500"/>
                    ) : (
                        <WifiOff className="w-4 h-4 text-olive-600 animate-pulse"/>
                    )}
                    <span className="text-xs text-olive-500 hidden sm:block">
                        {isConnected ? 'متصل' : 'در حال اتصال...'}
                    </span>
                </div>

                {/* دکمه قطع/وصل صدای جلسه */}
                <button
                    type="button"
                    onClick={onToggleMeetingMute}
                    title={isMeetingMuted ? 'روشن کردن صدای جلسه' : 'خاموش کردن صدای جلسه'}
                    className={`flex items-center gap-1.5 text-xs transition-colors border rounded-lg px-2.5 py-1.5
                        ${isMeetingMuted
                        ? 'text-red-400 border-red-500/40 hover:text-red-300 hover:border-red-400'
                        : 'text-olive-500 border-olive-800 hover:text-olive-300'
                    }`}
                >
                    {isMeetingMuted
                        ? <VolumeX className="w-3.5 h-3.5"/>
                        : <Volume2 className="w-3.5 h-3.5"/>
                    }
                    <span className="hidden sm:block">
                        {isMeetingMuted ? 'صدا خاموش' : 'صدای جلسه'}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={onCopyLink}
                    className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-300 transition-colors border border-olive-800 rounded-lg px-2.5 py-1.5"
                >
                    <Copy className="w-3.5 h-3.5"/>
                    <span className="hidden sm:block">کپی لینک</span>
                </button>
            </div>
        </header>
    )
})
/* -------------------------------------------------------------------------- */
/* Participants                                                                */
/* -------------------------------------------------------------------------- */

const ParticipantsPanel = memo(function ParticipantsPanel({
                                                              participants,
                                                          }) {
    return (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 overscroll-contain">
            {participants.length === 0 ? (
                <p className="text-olive-600 text-sm text-center mt-8">
                    منتظر شرکت‌کنندگان...
                </p>
            ) : (
                participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-olive-800 transition-colors"
                    >
                        <Avatar
                            name={participant.name}
                            size="sm"
                        />

                        <div className="flex-1 min-w-0">
                            <p className="text-olive-100 text-sm truncate">
                                {participant.name}
                            </p>

                            <p className="text-olive-600 text-xs">
                                {participant.role === 'host'
                                    ? 'میزبان'
                                    : 'شرکت‌کننده'}
                            </p>
                        </div>

                        <div className="flex gap-1">
                            {!participant.mic && (
                                <MicOff className="w-3.5 h-3.5 text-red-500"/>
                            )}

                            {!participant.cam && (
                                <VideoOff className="w-3.5 h-3.5 text-red-500"/>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
})

/* -------------------------------------------------------------------------- */
/* Chat                                                                        */
/* -------------------------------------------------------------------------- */

const ChatPanel = memo(function ChatPanel({
                                              messages,
                                              chatInput,
                                              onChange,
                                              onSend,
                                          }) {
    return (
        <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 overscroll-contain">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex flex-col gap-1 ${
                            message.isMine
                                ? 'items-start'
                                : 'items-end'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-olive-500 text-xs font-medium">
                                {message.sender}
                            </span>

                            <span className="text-olive-700 text-xs">
                                {message.time}
                            </span>
                        </div>

                        <p className="text-olive-100 text-sm bg-olive-800 rounded-xl px-3 py-2 max-w-[85%] break-words">
                            {message.text}
                        </p>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-olive-800 flex gap-2 shrink-0">
                <input
                    value={chatInput}
                    onChange={onChange}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            onSend()
                        }
                    }}
                    placeholder="پیامی بنویسید..."
                    className="flex-1 bg-olive-800 border border-olive-700 rounded-xl px-3 py-2 text-olive-100 text-sm placeholder:text-olive-600 outline-none focus:border-olive-500 transition-colors"
                />

                <button
                    type="button"
                    onClick={onSend}
                    className="w-9 h-9 bg-olive-500 hover:bg-olive-400 rounded-xl flex items-center justify-center text-olive-950 transition-colors shrink-0"
                >
                    <Send className="w-4 h-4"/>
                </button>
            </div>
        </>
    )
})

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

const RoomSidebar = memo(function RoomSidebar({
                                                  activePanel,
                                                  participants,
                                                  messages,
                                                  chatInput,
                                                  onPanelChange,
                                                  onChatInputChange,
                                                  onSendMessage,
                                                  onClose,
                                              }) {
    if (!activePanel) {
        return null
    }

    return (
        <>
            <div
                className="sm:hidden absolute inset-0 bg-black/50 z-20"
                onClick={onClose}
            />

            <aside className="
                absolute left-0 top-0 bottom-0
                w-72 z-30
                sm:relative sm:z-auto
                bg-olive-900
                border-r border-olive-800
                flex flex-col
            ">
                <div className="flex border-b border-olive-800 shrink-0">
                    <button
                        type="button"
                        onClick={() =>
                            onPanelChange('participants')
                        }
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm transition-colors ${
                            activePanel === 'participants'
                                ? 'text-olive-300 border-b-2 border-olive-500'
                                : 'text-olive-600 hover:text-olive-400'
                        }`}
                    >
                        <Users className="w-4 h-4"/>

                        شرکت‌کنندگان ({participants.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => onPanelChange('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm transition-colors ${
                            activePanel === 'chat'
                                ? 'text-olive-300 border-b-2 border-olive-500'
                                : 'text-olive-600 hover:text-olive-400'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4"/>

                        گفتگو
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="sm:hidden px-3 text-olive-600 hover:text-olive-400"
                    >
                        <X className="w-4 h-4"/>
                    </button>
                </div>

                {activePanel === 'participants' && (
                    <ParticipantsPanel
                        participants={participants}
                    />
                )}

                {activePanel === 'chat' && (
                    <ChatPanel
                        messages={messages}
                        chatInput={chatInput}
                        onChange={onChatInputChange}
                        onSend={onSendMessage}
                    />
                )}
            </aside>
        </>
    )
})

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */

/* -------------------------------------------------------------------------- */

function ControlBtn({
                        active,
                        onClick,
                        icon: Icon,
                        tooltip,
                        className = '',
                    }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={tooltip}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                active
                    ? 'bg-olive-800 hover:bg-olive-700 text-olive-300 border border-olive-700'
                    : 'bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-600/30'
            } ${className}`}
        >
            <Icon className="w-4 h-4"/>
        </button>
    )
}

/* -------------------------------------------------------------------------- */
/* Room page                                                                   */
/* -------------------------------------------------------------------------- */

export default function RoomPage() {
    const {slug} = useParams()
    const navigate = useNavigate()

    const user = useAuthStore((state) => state.user)

    const apiRef = useRef(null)


    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [isMeetingMuted, setIsMeetingMuted] = useState(false)

    const [activePanel, setActivePanel] = useState(null)

    const [participants, setParticipants] = useState([])

    const [messages, setMessages] = useState(
        INITIAL_MESSAGES
    )

    const toggleMeetingMute = useCallback(() => {
        if (isMeetingMuted) {
            apiRef.current?.executeCommand('setNoiseSuppressionEnabled', true)
        } else {
            apiRef.current?.executeCommand('muteEveryone', 'audio')
        }
        setIsMeetingMuted((prev) => !prev)
    }, [isMeetingMuted])

    const [chatInput, setChatInput] = useState('')

    /* ---------------------------------------------------------------------- */
    /* Stable callbacks                                                        */
    /* ---------------------------------------------------------------------- */

    const handleConnected = useCallback(() => {
        setIsConnected(true)
    }, [])

    const handleDisconnected = useCallback(() => {
        setIsConnected(false)
        navigate('/')
    }, [navigate])

    const handleParticipantsChange = useCallback(
        (update) => {
            setParticipants(update)
        },
        []
    )

    const handleMessage = useCallback((message) => {
        setMessages((previous) => [
            ...previous,
            message,
        ])
    }, [])

    const handleAudioMuteChange = useCallback((muted) => {
        setIsMuted(muted)
    }, [])

    const handleVideoMuteChange = useCallback((muted) => {
        setIsVideoOff(muted)
    }, [])

    /* ---------------------------------------------------------------------- */
    /* Jitsi commands                                                          */
    /* ---------------------------------------------------------------------- */

    const toggleMute = useCallback(() => {
        apiRef.current?.executeCommand(
            'toggleAudio'
        )
    }, [])

    const toggleVideo = useCallback(() => {
        apiRef.current?.executeCommand(
            'toggleVideo'
        )
    }, [])

    const toggleShareScreen = useCallback(() => {
        apiRef.current?.executeCommand(
            'toggleShareScreen'
        )
    }, [])

    const raiseHand = useCallback(() => {
        apiRef.current?.executeCommand(
            'toggleRaiseHand'
        )

        toast('دست بلند شد ✋')
    }, [])

    const handleLeave = useCallback(() => {
        apiRef.current?.executeCommand(
            'hangup'
        )

        navigate('/')
    }, [navigate])

    /* ---------------------------------------------------------------------- */
    /* Chat                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleChatInputChange = useCallback((event) => {
        setChatInput(event.target.value)
    }, [])

    const sendMessage = useCallback(() => {
        const message = chatInput.trim()

        if (!message) {
            return
        }

        apiRef.current?.executeCommand(
            'sendChatMessage',
            message
        )

        const now = new Date().toLocaleTimeString(
            'fa-IR',
            {
                hour: '2-digit',
                minute: '2-digit',
            }
        )

        setMessages((previous) => [
            ...previous,
            {
                id: `${Date.now()}-mine`,
                sender:
                    user?.display_name ||
                    user?.displayName ||
                    'شما',
                text: message,
                time: now,
                isMine: true,
            },
        ])

        setChatInput('')
    }, [chatInput, user])

    /* ---------------------------------------------------------------------- */
    /* Panel                                                                   */
    /* ---------------------------------------------------------------------- */

    const togglePanel = useCallback((panel) => {
        setActivePanel((previous) =>
            previous === panel
                ? null
                : panel
        )
    }, [])

    const closePanel = useCallback(() => {
        setActivePanel(null)
    }, [])

    /* ---------------------------------------------------------------------- */
    /* Copy link                                                               */
    /* ---------------------------------------------------------------------- */

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}/join/${slug}`
            )

            toast.success('لینک کپی شد')
        } catch {
            toast.error('کپی لینک انجام نشد')
        }
    }, [slug])

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <div
            className="
                h-screen
                bg-olive-950
                flex
                flex-col
                overflow-hidden
                overscroll-none
            "
        >
            {/*<RoomHeader*/}
            {/*    slug={slug}*/}
            {/*    isConnected={isConnected}*/}
            {/*    onCopyLink={copyLink}*/}
            {/*/>*/}

            <RoomHeader
                slug={slug}
                isConnected={isConnected}
                onCopyLink={copyLink}
                isMeetingMuted={isMeetingMuted}
                onToggleMeetingMute={toggleMeetingMute}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* ---------------------------------------------------------- */}
                {/* Jitsi                                                       */}
                {/* ---------------------------------------------------------- */}

                <div className="flex-1 bg-black relative overflow-hidden min-w-0">
                    <JitsiContainer
                        slug={slug}
                        user={user}
                        apiRef={apiRef}
                        onConnected={handleConnected}
                        onDisconnected={handleDisconnected}
                        onParticipantsChange={
                            handleParticipantsChange
                        }
                        onMessage={handleMessage}
                        onAudioMuteChange={
                            handleAudioMuteChange
                        }
                        onVideoMuteChange={
                            handleVideoMuteChange
                        }
                    />

                    {!isConnected && (
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-olive-950 z-10 pointer-events-none">
                            <div
                                className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin"/>

                            <p className="text-olive-400 text-sm">
                                در حال اتصال به جلسه...
                            </p>
                        </div>
                    )}
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Sidebar                                                     */}
                {/* ---------------------------------------------------------- */}

                <RoomSidebar
                    activePanel={activePanel}
                    participants={participants}
                    messages={messages}
                    chatInput={chatInput}
                    onPanelChange={togglePanel}
                    onChatInputChange={
                        handleChatInputChange
                    }
                    onSendMessage={sendMessage}
                    onClose={closePanel}
                />
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Optional custom controls                                       */}
            {/* -------------------------------------------------------------- */}

            {/*
            <div className="
                h-16
                bg-olive-900
                border-t
                border-olive-800
                flex
                items-center
                justify-between
                px-4
                sm:px-6
                shrink-0
            ">
                <div className="flex gap-1.5 sm:gap-2">
                    <ControlBtn
                        active={!isMuted}
                        onClick={toggleMute}
                        icon={isMuted ? MicOff : Mic}
                        tooltip={
                            isMuted
                                ? 'روشن کردن میکروفون'
                                : 'خاموش کردن میکروفون'
                        }
                    />

                    <ControlBtn
                        active={!isVideoOff}
                        onClick={toggleVideo}
                        icon={
                            isVideoOff
                                ? VideoOff
                                : Video
                        }
                        tooltip={
                            isVideoOff
                                ? 'روشن کردن دوربین'
                                : 'خاموش کردن دوربین'
                        }
                    />

                    <ControlBtn
                        active={false}
                        onClick={toggleShareScreen}
                        icon={Monitor}
                        tooltip="اشتراک‌گذاری صفحه"
                        className="hidden sm:flex"
                    />

                    <ControlBtn
                        active={false}
                        onClick={raiseHand}
                        icon={Hand}
                        tooltip="دست بلند کردن"
                        className="hidden sm:flex"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleLeave}
                    className="
                        flex
                        items-center
                        gap-2
                        px-4
                        sm:px-5
                        py-2
                        bg-red-600
                        hover:bg-red-700
                        text-white
                        rounded-xl
                        text-sm
                        font-medium
                        transition-all
                        active:scale-95
                    "
                >
                    <PhoneOff className="w-4 h-4" />

                    <span className="hidden sm:block">
                        خروج
                    </span>
                </button>

                <div className="flex gap-1.5 sm:gap-2">
                    <ControlBtn
                        active={
                            activePanel ===
                            'participants'
                        }
                        onClick={() =>
                            togglePanel(
                                'participants'
                            )
                        }
                        icon={Users}
                        tooltip="شرکت‌کنندگان"
                    />

                    <ControlBtn
                        active={
                            activePanel === 'chat'
                        }
                        onClick={() =>
                            togglePanel('chat')
                        }
                        icon={MessageSquare}
                        tooltip="گفتگو"
                    />
                </div>
            </div>
            */}
        </div>
    )
}