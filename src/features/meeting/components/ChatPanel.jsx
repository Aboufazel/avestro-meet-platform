import { memo, useState } from 'react'
import { Send, Reply, X } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useMeetingStore } from '../store/meeting-store'
import { selectReplyingTo } from '../store/meeting-selectors'

export const ChatPanel = memo(function ChatPanel() {
    const { messages, send, bottomRef } = useChat()
    const replyingTo = useMeetingStore(selectReplyingTo)
    const setReplyingTo = useMeetingStore((s) => s.setReplyingTo)
    const clearReplyingTo = useMeetingStore((s) => s.clearReplyingTo)

    const [text, setText] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!text.trim()) return
        send(text, replyingTo)
        setText('')
    }

    return (
        <div className="flex flex-col h-full bg-neutral-950">
            <div className="px-4 py-3 border-b border-neutral-800 shrink-0">
                <h3 className="text-sm font-medium text-neutral-100">گفتگوی جلسه</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-sm text-neutral-500 mt-6">
                        هنوز پیامی ارسال نشده است
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageItem
                            key={message.id}
                            message={message}
                            onReply={() => setReplyingTo(message)}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* پیش‌نمایش ریپلای، بالای فیلد ارسال */}
            {replyingTo && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-neutral-800 border-r-2 border-primary-500 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-xs text-primary-400 font-medium block">
                            پاسخ به {replyingTo.displayName}
                        </span>
                        <span className="text-xs text-neutral-400 truncate block">
                            {replyingTo.text}
                        </span>
                    </div>
                    <button
                        onClick={clearReplyingTo}
                        className="shrink-0 text-neutral-500 hover:text-neutral-200"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="border-t border-neutral-800 p-3 flex gap-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="پیام بنویسید..."
                    className="flex-1 h-11 rounded-xl bg-neutral-800 border border-neutral-700 px-3 text-sm text-white outline-none"
                />
                <button
                    type="submit"
                    className="w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 flex items-center justify-center transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    )
})

const MessageItem = memo(function MessageItem({ message, onReply }) {
    return (
        <div className={`group flex flex-col gap-1 ${message.isLocal ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-neutral-500">{message.displayName}</span>

            <div className="flex items-center gap-1.5 max-w-[85%]">
                {message.isLocal && (
                    <ReplyButton onClick={onReply} />
                )}

                <div
                    className={`
                        rounded-xl px-3 py-2 text-sm
                        ${message.isLocal ? 'bg-primary-600 text-white' : 'bg-neutral-800 text-neutral-100'}
                    `}
                >
                    {message.replyTo && (
                        <div className={`
                            mb-1.5 px-2 py-1 rounded-md text-xs border-r-2
                            ${message.isLocal
                                ? 'bg-primary-700/50 border-neutral-50/40'
                                : 'bg-neutral-900/50 border-primary-500'
                            }
                        `}>
                            <span className="font-medium block opacity-90">
                                {message.replyTo.displayName}
                            </span>
                            <span className="opacity-70 truncate block">
                                {message.replyTo.text}
                            </span>
                        </div>
                    )}
                    {message.text}
                </div>

                {!message.isLocal && (
                    <ReplyButton onClick={onReply} />
                )}
            </div>
        </div>
    )
})

function ReplyButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="
                shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                bg-neutral-800/80 text-neutral-400
                hover:bg-primary-600 hover:text-white
                active:bg-primary-600 active:text-white
                transition-colors
            "
            title="پاسخ"
        >
            <Reply size={14} />
        </button>
    )
}