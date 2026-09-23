import { useCallback, useRef } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import { sendMessage } from '../store/meeting-actions'
import {
  selectMessages,
  selectUnreadCount,
  selectIsChatOpen,
  selectIsChatAtBottom,
} from '../store/meeting-selectors'

export function useChat() {
  const messages = useMeetingStore(selectMessages)
  const unreadCount = useMeetingStore(selectUnreadCount)
  const isChatOpen = useMeetingStore(selectIsChatOpen)
  const isAtBottom = useMeetingStore(selectIsChatAtBottom)
  const bottomRef = useRef(null)
  const markAsRead = useMeetingStore((s) => s.markMessagesAsRead)
  const setChatAtBottom = useMeetingStore((s) => s.setChatAtBottom)

  const send = useCallback((text, replyTo) => {
    if (!text?.trim()) return
    sendMessage(text, replyTo)
  }, [])

  const openChat = useCallback(() => {
    useMeetingStore.getState().openChat()
  }, [])

  return {
    messages,
    unreadCount,
    isChatOpen,
    send,
    openChat,
    bottomRef,
    markAsRead,
    setChatAtBottom,
    isAtBottom,
  }
}
