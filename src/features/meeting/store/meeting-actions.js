import { jitsiController } from '../jitsi/JitsiController.js'
import { JITSI_EVENTS } from '../jitsi/jitsi-events.js'
import { useMeetingStore } from './meeting-store.js'

/**
 * meeting-actions.js
 *
 * تنها لایه ارتباطی بین JitsiController و Zustand Store.
 *
 * UI نباید مستقیماً با JitsiController صحبت کند.
 */

let _unsubscribers = []

let _joinGeneration = 0

/**
 * شروع جلسه
 */
export async function joinMeeting({ roomName, displayName, email = '' }) {
    const store = useMeetingStore.getState()

    // اگر listener های قبلی باقی مانده‌اند، پاک شوند
    _unbindAll()

    // برای جلوگیری از event های session قبلی
    const generation = ++_joinGeneration

    store.resetMeeting()

    /**
     * ─────────────────────────────────────────────────────────────
     * STATUS
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.STATUS_CHANGED,
            (status) => {
                if (generation !== _joinGeneration) return

                useMeetingStore.getState()._setStatus(status)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * CONNECTION ERROR
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.CONNECTION_FAILED,
            (error) => {
                if (generation !== _joinGeneration) return

                useMeetingStore.getState()._setError(error)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * LOCAL PARTICIPANT
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.CONFERENCE_JOINED,
            ({ participantId, displayName }) => {
                if (generation !== _joinGeneration) return

                const store = useMeetingStore.getState()

                store._setLocalParticipantId(participantId)

                store._addParticipant({
                    id: participantId,
                    displayName: displayName || 'شما',

                    isLocal: true,

                    // مقدار اولیه
                    // بعد از TRACK_ADDED / TRACK_MUTE_CHANGED
                    // فوراً sync می‌شود.
                    isAudioMuted: true,
                    isVideoMuted: true,

                    isScreenSharing: false,
                    isModerator: false,
                    isActiveSpeaker: false,
                })
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * CONFERENCE LEFT
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.CONFERENCE_LEFT,
            () => {
                if (generation !== _joinGeneration) return

                _unbindAll()
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * REMOTE PARTICIPANT JOIN
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.PARTICIPANT_JOINED,
            (participant) => {
                if (generation !== _joinGeneration) return
                if (!participant?.id) return

                useMeetingStore
                    .getState()
                    ._addParticipant(participant)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * PARTICIPANT LEFT
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.PARTICIPANT_LEFT,
            ({ participantId }) => {
                if (generation !== _joinGeneration) return
                if (!participantId) return

                useMeetingStore
                    .getState()
                    ._removeParticipant(participantId)
            }
        )
    )




    /**
     * ─────────────────────────────────────────────────────────────
     * PARTICIPANT UPDATE
     *
     * این event برای:
     * - display name
     * - moderator
     * - mute state
     * - video state
     * و سایر تغییرات participant استفاده می‌شود.
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.PARTICIPANT_UPDATED,
            ({ participantId, ...updates }) => {
                if (generation !== _joinGeneration) return
                if (!participantId) return

                useMeetingStore
                    .getState()
                    ._updateParticipant(participantId, updates)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * ACTIVE SPEAKER
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.ACTIVE_SPEAKER_CHANGED,
            ({ participantId }) => {
                if (generation !== _joinGeneration) return

                useMeetingStore
                    .getState()
                    ._setActiveSpeaker(participantId || null)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * TRACK ADDED
     *
     * مهم:
     * وضعیت mute همان لحظه از track گرفته می‌شود.
     */

    // _unsubscribers.push(
    //     jitsiController.on(
    //         JITSI_EVENTS.TRACK_ADDED,
    //         (track) => {
    //             if (generation !== _joinGeneration) return
    //             if (!track) return
    //
    //             useMeetingStore
    //                 .getState()
    //                 ._addTrack(track)
    //         }
    //     )
    // )

    _unsubscribers.push(
    jitsiController.on(
        JITSI_EVENTS.TRACK_ADDED,
        (track) => {
            if (generation !== _joinGeneration) return
            if (!track) return

            useMeetingStore
                .getState()
                ._addTrack(track)

            useMeetingStore
                .getState()
                ._bumpRenegotiationTick()
        }
    )
)

    /**
     * ─────────────────────────────────────────────────────────────
     * TRACK REMOVED
     */

    // _unsubscribers.push(
    //     jitsiController.on(
    //         JITSI_EVENTS.TRACK_REMOVED,
    //         (track) => {
    //             if (generation !== _joinGeneration) return
    //             if (!track) return
    //
    //             useMeetingStore
    //                 .getState()
    //                 ._removeTrack(track)
    //         }
    //     )
    // )

    _unsubscribers.push(
    jitsiController.on(
        JITSI_EVENTS.TRACK_REMOVED,
        (track) => {
            if (generation !== _joinGeneration) return
            if (!track) return

            useMeetingStore
                .getState()
                ._removeTrack(track)

            useMeetingStore
                .getState()
                ._bumpRenegotiationTick()
        }
    )
)

    /**
     * ─────────────────────────────────────────────────────────────
     * TRACK MUTED
     *
     * این یکی از مهم‌ترین event های Real-time است.
     *
     * وقتی remote user:
     * - mic را mute کند
     * - camera را خاموش کند
     *
     * Jitsi track تغییر می‌کند و این event باید UI را sync کند.
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.TRACK_MUTED,
            (track) => {
                if (generation !== _joinGeneration) return
                if (!track) return

                useMeetingStore
                    .getState()
                    ._updateTrackMute({
                        ...track,
                        isMuted: true,
                    })
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * TRACK UNMUTED
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.TRACK_UNMUTED,
            (track) => {
                if (generation !== _joinGeneration) return
                if (!track) return

                useMeetingStore
                    .getState()
                    ._updateTrackMute({
                        ...track,
                        isMuted: false,
                    })
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * CHAT
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.MESSAGE_RECEIVED,
            (message) => {
                if (generation !== _joinGeneration) return
                if (!message) return

                useMeetingStore
                    .getState()
                    ._addMessage(message)
            }
        )
    )

    /**
     * ─────────────────────────────────────────────────────────────
     * SCREEN SHARE
     * ─────────────────────────────────────────────────────────────
     */

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.SCREEN_SHARE_STARTED,
            (track) => {
                if (generation !== _joinGeneration) return

                useMeetingStore
                    .getState()
                    ._setScreenSharing(true, track)
            }
        )
    )

    _unsubscribers.push(
        jitsiController.on(
            JITSI_EVENTS.SCREEN_SHARE_STOPPED,
            () => {
                if (generation !== _joinGeneration) return

                useMeetingStore
                    .getState()
                    ._setScreenSharing(false)
            }
        )
    )

    /**
     * شروع واقعی Jitsi
     */
    try {
        await jitsiController.join({
            roomName,
            displayName,
            email,
        })
    } catch (error) {
        if (generation !== _joinGeneration) return

        useMeetingStore
            .getState()
            ._setError(error)
    }
}

/**
 * خروج از جلسه
 */
export async function leaveMeeting() {
    // session قبلی دیگر اجازه تغییر state ندارد
    _joinGeneration++

    try {
        await jitsiController.leave()
    } finally {
        _unbindAll()
        useMeetingStore.getState().resetMeeting()
    }
}

/**
 * Toggle میکروفون
 */
export async function toggleAudio() {
    return jitsiController.toggleAudio()
}

/**
 * Toggle دوربین
 */
export async function toggleVideo() {
    return jitsiController.toggleVideo()
}

/**
 * دریافت device ها
 */
export async function getDevices() {
    return jitsiController.getDevices()
}

/**
 * تغییر microphone
 */
export async function setAudioInputDevice(deviceId) {
    await jitsiController.setAudioInputDevice(deviceId)
}



/**
 * تغییر camera
 */
export async function setVideoInputDevice(deviceId) {
    await jitsiController.setVideoInputDevice(deviceId)
}

/**
 * تغییر audio output
 */
export async function setAudioOutputDevice(deviceId) {
    const success =
        await jitsiController.setAudioOutputDevice(deviceId)

    if (success) {
        useMeetingStore
            .getState()
            .setSelectedAudioOutputId(deviceId)
    }

    return success
}

/**
 * تغییر کیفیت ویدیو
 */
export async function setVideoQuality(height) {
    await jitsiController.setVideoQuality(height)
}

/**
 * شروع screen share
 */
export async function startScreenShare() {
    return jitsiController.startScreenShare()
}

/**
 * پایان screen share
 */
export async function stopScreenShare() {
    return jitsiController.stopScreenShare()
}

/**
 * ارسال پیام
 */
export function sendMessage(text) {
    if (!text?.trim()) return

    jitsiController.sendMessage(text.trim())
}

/**
 * Mute همه
 */
export async function muteEveryone() {
    return jitsiController.muteEveryone()
}

/**
 * حذف تمام listener ها
 */
function _unbindAll() {
    for (const unsubscribe of _unsubscribers) {
        try {
            unsubscribe?.()
        } catch (error) {
            console.warn(
                '[meeting-actions] Failed to unsubscribe:',
                error
            )
        }
    }

    _unsubscribers = []
}