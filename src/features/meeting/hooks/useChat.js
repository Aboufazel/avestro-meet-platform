import { useCallback, useRef, useEffect } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import { sendMessage } from '../store/meeting-actions'
import {
  selectMessages,
  selectUnreadCount,
  selectIsChatOpen,
} from '../store/meeting-selectors'

/**
 * مدیریت چت جلسه
 */
export function useChat() {
  const messages = useMeetingStore(selectMessages)
  const unreadCount = useMeetingStore(selectUnreadCount)
  const isChatOpen = useMeetingStore(selectIsChatOpen)
  const bottomRef = useRef(null)

  // اسکرول به پایین با هر پیام جدید
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = useCallback((text) => {
    if (!text?.trim()) return
    sendMessage(text)
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
  }
}