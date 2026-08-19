import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { useMeetingStore } from '../store/meeting-store'
import {
  joinMeeting,
  leaveMeeting,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  sendMessage,
  muteEveryone,
} from '../store/meeting-actions'
import {
  selectStatus,
  selectError,
  selectIsConnected,
  selectIsConnecting,
  selectIsAudioMuted,
  selectIsVideoMuted,
  selectIsScreenSharing,
} from '../store/meeting-selectors'
import { MEETING_STATUS } from '../jitsi/jitsi-events'

/**
 * useJitsi
 *
 * hook اصلی که RoomPage از آن استفاده می‌کند.
 * تمام lifecycle جلسه (join, leave, controls) را مدیریت می‌کند.
 *
 * @param {string} roomName
 */
export function useJitsi(roomName) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const joinedRef = useRef(false)

  const status = useMeetingStore(selectStatus)
  const error = useMeetingStore(selectError)
  const isConnected = useMeetingStore(selectIsConnected)
  const isConnecting = useMeetingStore(selectIsConnecting)
  const isAudioMuted = useMeetingStore(selectIsAudioMuted)
  const isVideoMuted = useMeetingStore(selectIsVideoMuted)
  const isScreenSharing = useMeetingStore(selectIsScreenSharing)

  // join on mount
  useEffect(() => {
    if (!roomName || joinedRef.current) return
    joinedRef.current = true

    const displayName =
      user?.display_name ||
      user?.displayName ||
      sessionStorage.getItem('guest_name') ||
      'مهمان'

    joinMeeting({
      roomName,
      displayName,
      email: user?.email || '',
    })

    return () => {
      leaveMeeting()
      joinedRef.current = false
    }
  }, [roomName])

  // navigate away on leave/failed
  useEffect(() => {
    if (status === MEETING_STATUS.LEFT) {
      navigate('/', { replace: true })
    }
  }, [status, navigate])

  const handleLeave = useCallback(async () => {
    await leaveMeeting()
    navigate('/', { replace: true })
  }, [navigate])

  const handleToggleAudio = useCallback(() => toggleAudio(), [])
  const handleToggleVideo = useCallback(() => toggleVideo(), [])

  const handleScreenShare = useCallback(() => {
    isScreenSharing ? stopScreenShare() : startScreenShare()
  }, [isScreenSharing])

  const handleSendMessage = useCallback((text) => sendMessage(text), [])
  const handleMuteEveryone = useCallback(() => muteEveryone(), [])

  return {
    // state
    status,
    error,
    isConnected,
    isConnecting,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,

    // actions
    leave: handleLeave,
    toggleAudio: handleToggleAudio,
    toggleVideo: handleToggleVideo,
    toggleScreenShare: handleScreenShare,
    sendMessage: handleSendMessage,
    muteEveryone: handleMuteEveryone,
  }
}