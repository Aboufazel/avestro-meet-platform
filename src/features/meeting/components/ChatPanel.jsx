import { memo, useState } from 'react'
import { Send } from 'lucide-react'
import { useChat } from '../hooks/useChat'

export const ChatPanel = memo(function ChatPanel() {
  const {
    messages,
    send,
    bottomRef,
  } = useChat()

  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!text.trim()) return

    send(text)
    setText('')
  }

  return (
    <div className="flex flex-col h-full bg-olive-900">

      <div className="px-4 py-3 border-b border-olive-700 shrink-0">
        <h3 className="text-sm font-medium text-olive-100">
          گفتگوی جلسه
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-olive-500 mt-6">
            هنوز پیامی ارسال نشده است
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-olive-700 p-3 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیام بنویسید..."
          className="
            flex-1
            h-11
            rounded-xl
            bg-olive-800
            border
            border-olive-700
            px-3
            text-sm
            text-white
            outline-none
          "
        />

        <button
          type="submit"
          className="
            w-11
            h-11
            rounded-xl
            bg-olive-600
            flex
            items-center
            justify-center
          "
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
})

const MessageItem = memo(function MessageItem({
  message,
}) {
  return (
    <div
      className={`
        flex
        flex-col
        gap-1
        ${message.isLocal ? 'items-end' : 'items-start'}
      `}
    >
      <span className="text-xs text-olive-500">
        {message.displayName}
      </span>

      <div
        className={`
          max-w-[80%]
          rounded-xl
          px-3
          py-2
          text-sm
          ${
            message.isLocal
              ? 'bg-olive-600 text-white'
              : 'bg-olive-800 text-olive-100'
          }
        `}
      >
        {message.text}
      </div>
    </div>
  )
})