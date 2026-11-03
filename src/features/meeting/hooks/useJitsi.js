import {
    useEffect,
    useRef,
    useCallback,
} from 'react'

import {useNavigate} from 'react-router-dom'

import {useAuthStore} from '../../../store/authStore'

import {useMeetingStore} from '../store/meeting-store'

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

import {MEETING_STATUS} from '../jitsi/jitsi-events'

export function useJitsi(roomName) {
    const navigate = useNavigate()

    const user = useAuthStore(
        (s) => s.user
    )

    const token = useAuthStore(
        (s) => s.token
    )

    const joinedRef = useRef(false)

    const status = useMeetingStore(
        selectStatus
    )

    const error = useMeetingStore(
        selectError
    )

    const isConnected = useMeetingStore(
        selectIsConnected
    )

    const isConnecting = useMeetingStore(
        selectIsConnecting
    )

    const isAudioMuted = useMeetingStore(
        selectIsAudioMuted
    )

    const isVideoMuted = useMeetingStore(
        selectIsVideoMuted
    )

    const isScreenSharing =
        useMeetingStore(
            selectIsScreenSharing
        )

    // -------------------------------------------------------------------------
    // Join
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (
            !roomName ||
            joinedRef.current
        ) {
            return
        }

        // کاربر لاگین‌شده ممکن است display_name خالی داشته باشد (فیلد blank=True است).
        // قبلاً در این حالت نام «خالی» حساب می‌شد و کاربر به /join برمی‌گشت؛
        // الان به username یا ایمیل برمی‌گردیم، مثل منطق بک‌اند.
        const userName =
            user?.display_name ||
            user?.displayName ||
            user?.full_name ||
            user?.username ||
            user?.email?.split('@')[0]

        // توکن هست ولی پروفایل هنوز نیامده؛ برگرداندن به /join اشتباه است.
        if (token && !user && !sessionStorage.getItem('guest_name')) {
            return
        }

        const displayName =
            userName ||
            sessionStorage.getItem(
                'guest_name'
            )

        if (!displayName) {
            navigate(
                `/join/${roomName}`,
                {
                    replace: true,
                }
            )

            return
        }

        joinedRef.current = true

        joinMeeting({
            roomName,

            displayName,

            email:
                user?.email || '',
        })

        return () => {
            joinedRef.current = false

            leaveMeeting()
        }
    }, [
        roomName,
        user?.display_name,
        user?.displayName,
        user?.full_name,
        user?.username,
        user?.email,
        token,
        navigate,
    ])

    // -------------------------------------------------------------------------
    // Leave only on REAL leave.
    //
    // RECONNECTING must NEVER navigate away.
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (
            status ===
            MEETING_STATUS.LEFT
        ) {
            navigate(
                '/',
                {
                    replace: true,
                }
            )
        }
    }, [
        status,
        navigate,
    ])

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    const handleLeave =
        useCallback(
            async () => {
                await leaveMeeting()

                navigate(
                    '/',
                    {
                        replace: true,
                    }
                )
            },
            [navigate]
        )

    const handleToggleAudio =
        useCallback(
            () =>
                toggleAudio(),
            []
        )

    const handleToggleVideo =
        useCallback(
            () =>
                toggleVideo(),
            []
        )

    const handleScreenShare =
        useCallback(
            () => {
                if (
                    isScreenSharing
                ) {
                    return stopScreenShare()
                }

                return startScreenShare()
            },
            [isScreenSharing]
        )

    const handleSendMessage =
        useCallback(
            (text) =>
                sendMessage(text),
            []
        )

    const handleMuteEveryone =
        useCallback(
            () =>
                muteEveryone(),
            []
        )

    return {
        // state
        status,

        error,

        isConnected,

        isConnecting,

        isReconnecting:
            status ===
            MEETING_STATUS.RECONNECTING,

        isAudioMuted,

        isVideoMuted,

        isScreenSharing,

        // actions
        leave:
            handleLeave,

        toggleAudio:
            handleToggleAudio,

        toggleVideo:
            handleToggleVideo,

        toggleScreenShare:
            handleScreenShare,

        sendMessage:
            handleSendMessage,

        muteEveryone:
            handleMuteEveryone,
    }
}