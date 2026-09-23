import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
    ArrowDown,
    MessageCircle,
    Reply,
    Search,
    Send,
    X,
} from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useMeetingStore } from '../store/meeting-store'
import { selectLocalParticipantId, selectReplyingTo } from '../store/meeting-selectors'
import { useParticipants } from '../hooks/useParticipants'

export const ChatPanel = memo(function ChatPanel() {
    const {
        messages,
        send,
        bottomRef,
        markAsRead,
        setChatAtBottom,
    } = useChat()
    const replyingTo = useMeetingStore(selectReplyingTo)
    const localParticipantId = useMeetingStore(selectLocalParticipantId)
    const setReplyingTo = useMeetingStore((s) => s.setReplyingTo)
    const clearReplyingTo = useMeetingStore((s) => s.clearReplyingTo)
    const { count } = useParticipants()

    const [text, setText] = useState('')
    const [searchOpen, setSearchOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [showNewMessageButton, setShowNewMessageButton] = useState(false)
    const scrollRef = useRef(null)

    const filteredMessages = useMemo(() => {
        const query = search.trim().toLocaleLowerCase()
        if (!query) return messages

        return messages.filter((message) =>
            `${message.displayName || ''} ${message.text || ''}`
                .toLocaleLowerCase()
                .includes(query)
        )
    }, [messages, search, localParticipantId])

    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        const handleScroll = () => {
            const distanceFromBottom =
                element.scrollHeight - element.scrollTop - element.clientHeight
            const atBottom = distanceFromBottom < 40
            setShowNewMessageButton(distanceFromBottom > 180)
            setChatAtBottom(atBottom)
            if (atBottom) markAsRead()
        }

        handleScroll()
        element.addEventListener('scroll', handleScroll, { passive: true })
        return () => element.removeEventListener('scroll', handleScroll)
    }, [markAsRead, setChatAtBottom])

    useEffect(() => {
        if (!messages.length) return
        const element = scrollRef.current
        if (!element) return

        const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight

        if (distanceFromBottom < 40) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            markAsRead()
        }
    }, [messages.length, bottomRef, markAsRead])

    const handleSubmit = (e) => {
        e.preventDefault()
        const value = text.trim()
        if (!value) return

        send(value, replyingTo)
        setText('')
        clearReplyingTo()
    }

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        setShowNewMessageButton(false)
        setChatAtBottom(true)
        markAsRead()
    }

    return (
        <div dir="rtl" className="flex flex-col h-full min-h-0 bg-olive-950 text-olive-100 text-right">
            {/* Header */}
            <div className="px-4 py-3 border-b border-olive-800/80 shrink-0 bg-olive-900/60">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-olive-800 border border-olive-700 flex items-center justify-center text-olive-300">
                        <MessageCircle size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-olive-100">گفت‌وگو</h3>
                            {count > 0 && (
                                <span className="text-[10px] text-olive-500 bg-olive-800/80 px-1.5 py-0.5 rounded-full">
                                    {count} نفر
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-olive-500 mt-0.5">
                            پیام‌های جلسه
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setSearchOpen((value) => !value)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${searchOpen ? 'bg-olive-700 text-olive-100' : 'text-olive-500 hover:bg-olive-800 hover:text-olive-200'}`}
                        title="جست‌وجوی پیام‌ها"
                    >
                        <Search size={15} />
                    </button>
                </div>

                {searchOpen && (
                    <div className="mt-3 relative">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-olive-500" />
                        <input
                            autoFocus
                            value={search.trim()}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="جست‌وجوی پیام..."
                            className="w-full h-9 rounded-lg bg-olive-950 border border-olive-800 pr-9 pl-8 text-xs text-olive-100 placeholder:text-olive-600 outline-none focus:border-olive-600"
                        />
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setSearchOpen(false) }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-olive-600 hover:text-olive-300"
                            aria-label="بستن جست‌وجو"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3">
                {filteredMessages.length === 0 ? (
                    <EmptyChat hasSearch={Boolean(search.trim())} />
                ) : (
                    filteredMessages.map((message, index) => {
                        const previous = filteredMessages[index - 1]
                        const grouped = previous?.participantId === message.participantId

                        return (
                            <MessageItem
                                key={message.id}
                                message={{ ...message, isLocal: message.participantId === localParticipantId }}
                                grouped={grouped}
                                onReply={() => setReplyingTo(message)}
                            />
                        )
                    })
                )}

                <div ref={bottomRef} />

                {showNewMessageButton && (
                    <button
                        type="button"
                        onClick={scrollToBottom}
                        className="sticky bottom-2 mx-auto flex items-center gap-1.5 rounded-full bg-olive-700/95 border border-olive-600 px-3 py-1.5 text-[11px] text-olive-100 shadow-lg backdrop-blur-md hover:bg-olive-600 transition-colors"
                    >
                        <ArrowDown size={13} />
                        پیام‌های جدید
                    </button>
                )}
            </div>

            {/* Reply preview */}
            {replyingTo && (
                <div className="mx-3 mb-2 rounded-xl border border-olive-700 bg-olive-900/90 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-r-2 border-olive-400">
                        <Reply size={14} className="text-olive-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-olive-300 font-medium block">
                                پاسخ به {replyingTo.displayName}
                            </span>
                            <span className="text-[11px] text-olive-500 truncate block mt-0.5">
                                {replyingTo.text}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={clearReplyingTo}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-olive-600 hover:bg-olive-800 hover:text-olive-200"
                            aria-label="لغو پاسخ"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Composer */}
            <form dir="rtl" onSubmit={handleSubmit} className="shrink-0 px-3 pb-3 pt-2 border-t border-olive-800/80 bg-olive-900/70">
                <div className="flex items-end gap-2 rounded-2xl border border-olive-700/80 bg-olive-950/80 p-1.5 focus-within:border-olive-600 transition-colors">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmit(e)
                            }
                        }}
                        rows={1}
                        placeholder="پیام بنویسید..."
                        className="flex-1 min-h-9 max-h-24 resize-none bg-transparent px-2 py-2 text-sm text-olive-100 placeholder:text-olive-600 outline-none"
                    />

                    <button
                        type="submit"
                        disabled={!text.trim()}
                        className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-olive-600 text-white transition-all disabled:bg-olive-800 disabled:text-olive-600 disabled:cursor-not-allowed hover:bg-olive-500"
                        title="ارسال پیام"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-olive-600">
                    <span>Enter برای ارسال · Shift + Enter برای خط جدید</span>
                    {search.trim() && <span>{filteredMessages.length} نتیجه</span>}
                </div>
            </form>
        </div>
    )
})

const EmptyChat = memo(function EmptyChat({ hasSearch }) {
    return (
        <div className="h-full min-h-[180px] flex items-center justify-center">
            <div className="text-center max-w-[220px]">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-olive-900 border border-olive-800 flex items-center justify-center text-olive-500 mb-3">
                    {hasSearch ? <Search size={20} /> : <MessageCircle size={20} />}
                </div>
                <p className="text-sm text-olive-300">
                    {hasSearch ? 'پیامی با این عبارت پیدا نشد' : 'هنوز پیامی ارسال نشده است'}
                </p>
                <p className="text-[11px] text-olive-600 mt-1.5 leading-5">
                    {hasSearch ? 'عبارت دیگری را امتحان کنید.' : 'گفت‌وگوی جلسه را از همین‌جا شروع کنید.'}
                </p>
            </div>
        </div>
    )
})

const MessageItem = memo(function MessageItem({ message, grouped, onReply }) {
    const time = formatMessageTime(message.timestamp)
    const [showReplyPreview, setShowReplyPreview] = useState(false)

    return (
        <div className={`group flex flex-col ${message.isLocal ? 'items-end' : 'items-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
            {!grouped && (
                <div className={`flex items-center gap-2 mb-1.5 px-1 ${message.isLocal ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-olive-700 border border-olive-600 flex items-center justify-center text-[10px] text-olive-100 font-semibold">
                        {(message.displayName?.trim()?.[0] || '?').toUpperCase()}
                    </div>
                    <span className="text-[11px] text-olive-400 max-w-[150px] truncate">
                        {message.isLocal ? 'شما' : message.displayName}
                    </span>
                    <span className="text-[10px] text-olive-600 tabular-nums">{time}</span>
                </div>
            )}

            <div className={`flex items-end gap-1.5 max-w-[88%] ${message.isLocal ? 'flex-row-reverse' : ''}`}>
                <div
                    className={`relative min-w-0 rounded-2xl px-3 py-2 text-sm leading-6 border ${message.isLocal
                        ? 'bg-olive-700/90 border-olive-600 text-white rounded-br-md'
                        : 'bg-olive-900 border-olive-800 text-olive-100 rounded-bl-md'
                    }`}
                >
                    {message.replyTo && (
                        <div className="mb-1.5">
                            <button
                                type="button"
                                onClick={() => setShowReplyPreview((value) => !value)}
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-black/15 border border-white/10 text-[10px] text-white/65 hover:text-white hover:bg-black/20 transition-colors"
                                aria-expanded={showReplyPreview}
                                title="نمایش پیام مورد پاسخ"
                            >
                                <Reply size={12} />
                                <span>پاسخ</span>
                            </button>

                            {showReplyPreview && (
                                <div className="mt-1.5 max-w-[240px] rounded-lg border border-white/10 bg-black/15 px-2.5 py-1.5 text-[10px] text-white/55 leading-5">
                                    <span className="font-medium text-white/70">
                                        {message.replyTo.displayName}
                                    </span>
                                    <span className="block truncate">
                                        {message.replyTo.text}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    <span className="whitespace-pre-wrap break-words">{message.text}</span>
                </div>

                <button
                    type="button"
                    onClick={onReply}
                    className="shrink-0 min-w-8 h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 text-olive-300 bg-olive-900/85 border border-olive-700/80 shadow-sm hover:text-white hover:bg-olive-800 hover:border-olive-600 active:scale-95 transition-all"
                    title="پاسخ"
                    aria-label="پاسخ به پیام"
                >
                    <Reply size={13} />
                    <span className="text-[10px] font-medium">پاسخ</span>
                </button>
            </div>
        </div>
    )
})

function formatMessageTime(timestamp) {
    if (!timestamp) return ''

    try {
        return new Intl.DateTimeFormat('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(timestamp)
    } catch {
        return ''
    }
}
