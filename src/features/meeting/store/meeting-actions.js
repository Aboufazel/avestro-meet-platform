import { jitsiController } from '../jitsi/JitsiController.js'
import { JITSI_EVENTS } from '../jitsi/jitsi-events.js'
import { useMeetingStore } from './meeting-store.js'
import { startLocalRecording, stopLocalRecording, downloadRecording } from '../jitsi/recordingService.js'
import {useAuthStore} from "../../../store/authStore.js";
import { startVoiceRecording, stopVoiceRecording } from '../jitsi/recordingService.js'

/**
 * meeting-actions.js
 *
 * تنها لایه ارتباطی بین JitsiController و Zustand Store.
 *
 * UI نباید مستقیماً با JitsiController صحبت کند.
 */




let _voiceRecordingInterval = null

export async function startVoiceRec() {
    try {
        await startVoiceRecording()
        useMeetingStore.getState()._setVoiceRecording(true)
        _voiceRecordingInterval = setInterval(() => {
            useMeetingStore.getState()._incrementVoiceRecordingSeconds()
        }, 1000)
    } catch (error) {
        console.warn('[meeting-actions] Failed to start voice recording:', error)
        throw error
    }
}

export async function stopVoiceRec() {
    clearInterval(_voiceRecordingInterval)
    const blob = await stopVoiceRecording()
    useMeetingStore.getState()._setVoiceRecording(false)
    if (blob) {
        downloadRecording(blob, `صدای-جلسه-${new Date().toISOString().slice(0, 19)}.webm`)
    }
}
let _unsubscribers = []
let _joinGeneration = 0

let _currentRoomName = null
let _currentExternalId = null

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.avestro.ir'


let _recordingInterval = null

export async function startRecording() {
    try {
        await startLocalRecording()
        useMeetingStore.getState()._setRecording(true)
        _recordingInterval = setInterval(() => {
            useMeetingStore.getState()._incrementRecordingSeconds()
        }, 1000)
    } catch (error) {
        console.warn('[meeting-actions] Failed to start recording:', error)
        throw error
    }
}

export async function stopRecording() {
    clearInterval(_recordingInterval)
    const blob = await stopLocalRecording()
    useMeetingStore.getState()._setRecording(false)
    if (blob) {
        downloadRecording(blob, `جلسه-${new Date().toISOString().slice(0, 19)}.webm`)
    }
}

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
    _currentRoomName = roomName

    // شناسه‌ی ثابت این تلاش join — از اول تا آخر (چک ظرفیت، leave، beforeunload) همین می‌ماند
    const externalId = crypto.randomUUID()
    _currentExternalId = externalId

    // قبل از اتصال واقعی به Jitsi، از بک‌اند اجازه بگیر (چک ظرفیت بر اساس پلن میزبان)
    store._setStatus('connecting')
    const allowed = await _checkRoomCapacity(roomName, externalId, displayName)
    if (!allowed) {
        store._setError({ message: 'ظرفیت این جلسه بر اساس پلن میزبان تکمیل شده است.' })
        return
    }

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

                // توجه: به بک‌اند خبر نمی‌دیم اینجا — چون قبل از join شدن،
                // توی _checkRoomCapacity قبلاً رکورد ساخته شده با همون externalId ثابت.
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

    const roomName = _currentRoomName
    const externalId = _currentExternalId

    try {
        await jitsiController.leave()
    } finally {
        _unbindAll()
        useMeetingStore.getState().resetMeeting()
        _notifyBackendLeave(roomName, externalId)
        _currentRoomName = null
        _currentExternalId = null
    }
}

function _authHeaders() {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * چک ظرفیت روم و ثبت اولیه‌ی حضور — قبل از اتصال واقعی به Jitsi صدا زده می‌شود
 */
// async function _checkRoomCapacity(roomName, externalId) {
//     try {
//         const res = await fetch(`${API_BASE_URL}/rooms/${roomName}/join/`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ external_participant_id: externalId }),
//         })
//         return res.ok
//     } catch (error) {
//         console.warn('[meeting-actions] Failed to check room capacity:', error)
//         return true // اگه بک‌اند در دسترس نبود، اجازه بده وارد بشه (fail-open)
//     }
// }

async function _checkRoomCapacity(roomName, externalId, displayName) {
    try {
        const res = await fetch(`${API_BASE_URL}/rooms/${roomName}/join/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ..._authHeaders(),
            },
            body: JSON.stringify({
                external_participant_id: externalId,
                guest_name: displayName || '',
            }),
        })
        return res.ok
    } catch (error) {
        console.warn('[meeting-actions] Failed to check room capacity:', error)
        return true
    }
}

/**
 * خبر دادن به بک‌اند برای بستن رکورد حضور، موقع خروج
 */
// async function _notifyBackendLeave(roomName, externalId) {
//     if (!roomName || !externalId) return
//     try {
//         await fetch(`${API_BASE_URL}/rooms/${roomName}/leave/`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ external_participant_id: externalId }),
//         })
//     } catch (error) {
//         console.warn('[meeting-actions] Failed to notify backend of leave:', error)
//     }
// }

async function _notifyBackendLeave(roomName, externalId) {
    if (!roomName || !externalId) return
    try {
        await fetch(`${API_BASE_URL}/rooms/${roomName}/leave/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ..._authHeaders(),
            },
            body: JSON.stringify({ external_participant_id: externalId }),
        })
    } catch (error) {
        console.warn('[meeting-actions] Failed to notify backend of leave:', error)
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
// export function sendMessage(text) {
//     if (!text?.trim()) return
//
//     jitsiController.sendMessage(text.trim())
// }

export function sendMessage(text, replyTo = null) {
    if (!text?.trim()) return
    jitsiController.sendMessage(text.trim(), replyTo)
    useMeetingStore.getState().clearReplyingTo()
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

// ─── Browser lifecycle safety net ──────────────────────────────
// اگر کاربر بدون leave صریح (بستن تب/رفرش) خارج بشه، این تضمین می‌کنه
// رکورد حضورش توی بک‌اند بسته بشه. سطح ماژول است، فقط یک‌بار ثبت می‌شود.
if (typeof window !== 'undefined') {
    const sendLeaveBeacon = () => {
        if (_currentRoomName && _currentExternalId) {
            navigator.sendBeacon(
                `${API_BASE_URL}/rooms/${_currentRoomName}/leave/`,
                new Blob(
                    [JSON.stringify({ external_participant_id: _currentExternalId })],
                    { type: 'application/json' }
                )
            )
        }
    }

    window.addEventListener('beforeunload', sendLeaveBeacon)
    window.addEventListener('pagehide', sendLeaveBeacon)
}