import {jitsiController} from '../jitsi/JitsiController.js'
import {JITSI_EVENTS} from '../jitsi/jitsi-events.js'
import {useMeetingStore} from './meeting-store.js'

/**
 * meeting-actions.js
 *
 * تنها جایی که JitsiController و meeting-store با هم صحبت می‌کنند.
 * UI فقط این توابع را صدا می‌زند — نه JitsiController را مستقیم.
 */

let _unsubscribers = []

/**
 * شروع جلسه و bind کردن event های controller به store
 */
export async function joinMeeting({roomName, displayName, email}) {
    const store = useMeetingStore.getState()
    store.resetMeeting()

    // bind events
    _unsubscribers = [
        jitsiController.on(JITSI_EVENTS.STATUS_CHANGED, (status) => {
            useMeetingStore.getState()._setStatus(status)
        }),

        jitsiController.on(JITSI_EVENTS.CONNECTION_FAILED, (error) => {
            useMeetingStore.getState()._setError(error)
        }),

        jitsiController.on(JITSI_EVENTS.CONFERENCE_JOINED, ({participantId, displayName}) => {
            const store = useMeetingStore.getState()
            store._setLocalParticipantId(participantId)
            store._addParticipant({
                id: participantId,
                displayName,
                isAudioMuted: true,
                isVideoMuted: true,
            })
        }),

        jitsiController.on(JITSI_EVENTS.CONFERENCE_LEFT, () => {
            _unbindAll()
        }),

        jitsiController.on(JITSI_EVENTS.PARTICIPANT_JOINED, (participant) => {
            useMeetingStore.getState()._addParticipant(participant)
        }),

        jitsiController.on(JITSI_EVENTS.PARTICIPANT_LEFT, ({participantId}) => {
            useMeetingStore.getState()._removeParticipant(participantId)
        }),

        jitsiController.on(JITSI_EVENTS.PARTICIPANT_UPDATED, ({participantId, ...updates}) => {
            useMeetingStore.getState()._updateParticipant(participantId, updates)
        }),

        jitsiController.on(JITSI_EVENTS.ACTIVE_SPEAKER_CHANGED, ({participantId}) => {
            useMeetingStore.getState()._setActiveSpeaker(participantId)
        }),

        jitsiController.on(JITSI_EVENTS.TRACK_ADDED, (track) => {
            useMeetingStore.getState()._addTrack(track)
        }),

        jitsiController.on(JITSI_EVENTS.TRACK_REMOVED, (track) => {
            useMeetingStore.getState()._removeTrack(track)
        }),

        jitsiController.on(JITSI_EVENTS.TRACK_MUTED, (track) => {
            useMeetingStore.getState()._updateTrackMute({...track, isMuted: true})
        }),

        jitsiController.on(JITSI_EVENTS.TRACK_UNMUTED, (track) => {
            useMeetingStore.getState()._updateTrackMute({...track, isMuted: false})
        }),

        jitsiController.on(JITSI_EVENTS.MESSAGE_RECEIVED, (message) => {
            useMeetingStore.getState()._addMessage(message)
        }),

        jitsiController.on(JITSI_EVENTS.SCREEN_SHARE_STARTED, () => {
            useMeetingStore.setState({isScreenSharing: true})
        }),

        jitsiController.on(JITSI_EVENTS.SCREEN_SHARE_STOPPED, () => {
            useMeetingStore.setState({isScreenSharing: false})
        }),
    ]

    await jitsiController.join({roomName, displayName, email})
}

/** خروج از جلسه */
export async function leaveMeeting() {
    await jitsiController.leave()
    _unbindAll()
    useMeetingStore.getState().resetMeeting()
}

/** Toggle میکروفون */
export function toggleAudio() {
    jitsiController.toggleAudio()
}

/** Toggle دوربین */
export function toggleVideo() {
    jitsiController.toggleVideo()
}

/** شروع screen share */
export function startScreenShare() {
    jitsiController.startScreenShare()
}

/** پایان screen share */
export function stopScreenShare() {
    jitsiController.stopScreenShare()
}

/** ارسال پیام */
export function sendMessage(text) {
    if (!text?.trim()) return
    jitsiController.sendMessage(text)

    // // پیام خودمان را هم به store اضافه کن
    // const {localParticipantId} = useMeetingStore.getState()
    // useMeetingStore.getState()._addMessage({
    //     id: `local-${Date.now()}`,
    //     participantId: localParticipantId || 'local',
    //     displayName: 'شما',
    //     text: text.trim(),
    //     timestamp: Date.now(),
    //     isLocal: true,
    // })
}

/** Mute همه */
export function muteEveryone() {
    jitsiController.muteEveryone()
}

function _unbindAll() {
    _unsubscribers.forEach((unsub) => unsub())
    _unsubscribers = []
}