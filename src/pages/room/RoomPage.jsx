import {useState, useEffect, useRef} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {
    Mic, MicOff, Video, VideoOff, Monitor,
    Users, MessageSquare, PhoneOff, Hand,
    Copy, Wifi, WifiOff, Send, X,
} from 'lucide-react'
import {Avatar} from '../../components/ui/Avatar'
import {useAuthStore} from '../../store/authStore'
import toast from 'react-hot-toast'

const mockMessages = [
    {id: '1', sender: 'علی رضایی', text: 'سلام به همه!', time: '۱۰:۰۲'},
    {id: '2', sender: 'سارا محمدی', text: 'سلام، آماده‌ام', time: '۱۰:۰۳'},
]

function Timer() {
    const [s, setS] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setS((v) => v + 1), 1000)
        return () => clearInterval(id)
    }, [])
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return <span className="text-olive-400 text-sm font-mono">{h}:{m}:{sec}</span>
}

export default function RoomPage() {
    const {slug} = useParams()
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)

    const jitsiContainerRef = useRef(null)
    const apiRef = useRef(null)

    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [activePanel, setActivePanel] = useState(null)
    const [participants, setParticipants] = useState([])
    const [messages, setMessages] = useState(mockMessages)
    const [chatInput, setChatInput] = useState('')

    useEffect(() => {
        if (!jitsiContainerRef.current) return
        if (!window.JitsiMeetExternalAPI) {
            toast.error('خطا در بارگذاری موتور ویدیو')
            return
        }

        const api = new window.JitsiMeetExternalAPI('meet.avestro.ir', {
            roomName: slug,
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            userInfo: {
                displayName: user?.display_name || user?.displayName || 'مهمان',
                email: user?.email || '',
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                prejoinPageEnabled: false,  // ← این باید false باشه
                prejoinConfig: {
                    enabled: false,
                },
            },
            // interfaceConfigOverwrite: {
            //     TOOLBAR_BUTTONS: [],
            //     SHOW_JITSI_WATERMARK: false,
            //     SHOW_WATERMARK_FOR_GUESTS: false,
            //     MOBILE_APP_PROMO: false,
            //     DISPLAY_WELCOME_FOOTER: false,
            //     FILM_STRIP_MAX_HEIGHT: 0,
            // },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'chat', 'raisehand',
                    'tileview', 'participants-pane',
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                MOBILE_APP_PROMO: false,
                DISPLAY_WELCOME_FOOTER: false,
            },
        })

        apiRef.current = api

        // وقتی وارد جلسه شد
        api.addListener('videoConferenceJoined', (e) => {
            setIsConnected(true)
            toast.success('به جلسه متصل شدید')
            // اضافه کردن خود کاربر به لیست
            setParticipants([{id: e.id, name: user?.display_name || 'شما', role: 'host', mic: true, cam: true}])
        })

        api.addListener('participantJoined', (p) => {
            setParticipants((prev) => [
                ...prev,
                {id: p.id, name: p.displayName || 'شرکت‌کننده', role: 'participant', mic: true, cam: true},
            ])
        })

        api.addListener('participantLeft', (p) => {
            setParticipants((prev) => prev.filter((x) => x.id !== p.id))
        })

        api.addListener('audioMuteStatusChanged', ({muted}) => setIsMuted(muted))
        api.addListener('videoMuteStatusChanged', ({muted}) => setIsVideoOff(muted))

        api.addListener('incomingMessage', ({from, message, nick}) => {
            const now = new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})
            setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                sender: nick || from,
                text: message,
                time: now
            }])
        })

        api.addListener('videoConferenceLeft', () => navigate('/'))

        return () => api.dispose()
    }, [slug])

    function toggleMute() {
        apiRef.current?.executeCommand('toggleAudio')
    }

    function toggleVideo() {
        apiRef.current?.executeCommand('toggleVideo')
    }

    function toggleShareScreen() {
        apiRef.current?.executeCommand('toggleShareScreen')
    }

    function raiseHand() {
        apiRef.current?.executeCommand('toggleRaiseHand');
        toast('دست بلند شد ✋')
    }

    function handleLeave() {
        apiRef.current?.executeCommand('hangup');
        navigate('/')
    }

    function copyLink() {
        navigator.clipboard.writeText(`${window.location.origin}/join/${slug}`)
        toast.success('لینک کپی شد')
    }

    function sendMessage() {
        if (!chatInput.trim()) return
        apiRef.current?.executeCommand('sendChatMessage', chatInput)
        const now = new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})
        setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            sender: user?.display_name || 'شما',
            text: chatInput,
            time: now,
            isMine: true,
        }])
        setChatInput('')
    }

    function togglePanel(panel) {
        setActivePanel((prev) => (prev === panel ? null : panel))
    }

    const panelOpen = activePanel !== null

    return (
        <div className="h-screen bg-olive-950 flex flex-col overflow-hidden">

            {/* Header */}
            <div
                className="h-14 bg-olive-900 border-b border-olive-800 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <img src="/avestro-logo.png" alt="اَوسترو" className="w-7 h-7 shrink-0"/>
                    <span className="text-olive-100 font-medium text-sm hidden sm:block">اَوسترو میت</span>
                    <span className="text-olive-600 text-sm hidden sm:block">·</span>
                    <span className="text-olive-500 text-sm truncate max-w-[120px] sm:max-w-none">{slug}</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <Timer/>
                    <div className="flex items-center gap-1">
                        {isConnected
                            ? <Wifi className="w-4 h-4 text-olive-500"/>
                            : <WifiOff className="w-4 h-4 text-olive-600 animate-pulse"/>
                        }
                        <span className="text-xs text-olive-500 hidden sm:block">
              {isConnected ? 'متصل' : 'در حال اتصال...'}
            </span>
                    </div>
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-1.5 text-xs text-olive-500 hover:text-olive-300 transition-colors border border-olive-800 rounded-lg px-2.5 py-1.5"
                    >
                        <Copy className="w-3.5 h-3.5"/>
                        <span className="hidden sm:block">کپی لینک</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Jitsi Video */}
                <div className="flex-1 bg-black relative overflow-hidden">
                    <div
                        ref={jitsiContainerRef}
                        style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
                    />
                    {!isConnected && (
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-olive-950 z-10">
                            <div
                                className="w-10 h-10 border-2 border-olive-500 border-t-transparent rounded-full animate-spin"/>
                            <p className="text-olive-400 text-sm">در حال اتصال به جلسه...</p>
                        </div>
                    )}
                </div>

                {/* Side Panel — desktop: fixed right, mobile: overlay */}
                {panelOpen && (
                    <>
                        {/* Mobile overlay backdrop */}
                        <div
                            className="sm:hidden absolute inset-0 bg-black/50 z-20"
                            onClick={() => setActivePanel(null)}
                        />
                        <div className="
              absolute left-0 top-0 bottom-0 w-72 z-30
              sm:relative sm:z-auto
              bg-olive-900 border-r border-olive-800 flex flex-col
            ">
                            {/* Panel Tabs */}
                            <div className="flex border-b border-olive-800 shrink-0">
                                <button
                                    onClick={() => setActivePanel('participants')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm transition-colors
                    ${activePanel === 'participants'
                                        ? 'text-olive-300 border-b-2 border-olive-500'
                                        : 'text-olive-600 hover:text-olive-400'}`}
                                >
                                    <Users className="w-4 h-4"/>
                                    شرکت‌کنندگان ({participants.length})
                                </button>
                                <button
                                    onClick={() => setActivePanel('chat')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm transition-colors
                    ${activePanel === 'chat'
                                        ? 'text-olive-300 border-b-2 border-olive-500'
                                        : 'text-olive-600 hover:text-olive-400'}`}
                                >
                                    <MessageSquare className="w-4 h-4"/>
                                    گفتگو
                                </button>
                                {/* Close on mobile */}
                                <button
                                    onClick={() => setActivePanel(null)}
                                    className="sm:hidden px-3 text-olive-600 hover:text-olive-400"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>

                            {/* Participants */}
                            {activePanel === 'participants' && (
                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                    {participants.length === 0 ? (
                                        <p className="text-olive-600 text-sm text-center mt-8">منتظر شرکت‌کنندگان...</p>
                                    ) : (
                                        participants.map((p) => (
                                            <div key={p.id}
                                                 className="flex items-center gap-3 p-3 rounded-xl hover:bg-olive-800 transition-colors">
                                                <Avatar name={p.name} size="sm"/>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-olive-100 text-sm truncate">{p.name}</p>
                                                    <p className="text-olive-600 text-xs">{p.role === 'host' ? 'میزبان' : 'شرکت‌کننده'}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {!p.mic && <MicOff className="w-3.5 h-3.5 text-red-500"/>}
                                                    {!p.cam && <VideoOff className="w-3.5 h-3.5 text-red-500"/>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Chat */}
                            {activePanel === 'chat' && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                                        {messages.map((msg) => (
                                            <div key={msg.id}
                                                 className={`flex flex-col gap-1 ${msg.isMine ? 'items-start' : 'items-end'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-olive-500 text-xs font-medium">{msg.sender}</span>
                                                    <span className="text-olive-700 text-xs">{msg.time}</span>
                                                </div>
                                                <p className="text-olive-100 text-sm bg-olive-800 rounded-xl px-3 py-2 max-w-[85%]">
                                                    {msg.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-olive-800 flex gap-2 shrink-0">
                                        <input
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="پیامی بنویسید..."
                                            className="flex-1 bg-olive-800 border border-olive-700 rounded-xl px-3 py-2 text-olive-100 text-sm placeholder:text-olive-600 outline-none focus:border-olive-500 transition-colors"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            className="w-9 h-9 bg-olive-500 hover:bg-olive-400 rounded-xl flex items-center justify-center text-olive-950 transition-colors shrink-0"
                                        >
                                            <Send className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Controls */}
            {/*<div*/}
            {/*    className="h-16 bg-olive-900 border-t border-olive-800 flex items-center justify-between px-4 sm:px-6 shrink-0">*/}

            {/*    /!* Right Controls *!/*/}
            {/*    <div className="flex gap-1.5 sm:gap-2">*/}
            {/*        <ControlBtn active={!isMuted} onClick={toggleMute} icon={isMuted ? MicOff : Mic}*/}
            {/*                    tooltip={isMuted ? 'روشن کردن میکروفون' : 'خاموش کردن میکروفون'}/>*/}
            {/*        <ControlBtn active={!isVideoOff} onClick={toggleVideo} icon={isVideoOff ? VideoOff : Video}*/}
            {/*                    tooltip={isVideoOff ? 'روشن کردن دوربین' : 'خاموش کردن دوربین'}/>*/}
            {/*        <ControlBtn active={false} onClick={toggleShareScreen} icon={Monitor} tooltip="اشتراک‌گذاری صفحه"*/}
            {/*                    className="hidden sm:flex"/>*/}
            {/*        <ControlBtn active={false} onClick={raiseHand} icon={Hand} tooltip="دست بلند کردن"*/}
            {/*                    className="hidden sm:flex"/>*/}
            {/*    </div>*/}

            {/*    /!* Center *!/*/}
            {/*    <button*/}
            {/*        onClick={handleLeave}*/}
            {/*        className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all active:scale-95"*/}
            {/*    >*/}
            {/*        <PhoneOff className="w-4 h-4"/>*/}
            {/*        <span className="hidden sm:block">خروج</span>*/}
            {/*    </button>*/}

            {/*    /!* Left Controls *!/*/}
            {/*    <div className="flex gap-1.5 sm:gap-2">*/}
            {/*        <ControlBtn active={activePanel === 'participants'} onClick={() => togglePanel('participants')}*/}
            {/*                    icon={Users} tooltip="شرکت‌کنندگان"/>*/}
            {/*        <ControlBtn active={activePanel === 'chat'} onClick={() => togglePanel('chat')} icon={MessageSquare}*/}
            {/*                    tooltip="گفتگو"/>*/}
            {/*    </div>*/}

            {/*</div>*/}
        </div>
    )
}

function ControlBtn({active, onClick, icon: Icon, tooltip, className = ''}) {
    return (
        <button
            onClick={onClick}
            title={tooltip}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95
        ${active
                ? 'bg-olive-800 hover:bg-olive-700 text-olive-300 border border-olive-700'
                : 'bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-600/30'
            } ${className}`}
        >
            <Icon className="w-4 h-4"/>
        </button>
    )
}