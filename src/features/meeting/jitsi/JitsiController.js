// import JitsiMeetJS from 'lib-jitsi-meet'
import {JITSI_EVENTS, MEETING_STATUS} from './jitsi-events.js'
import {CONNECTION_CONFIG, CONFERENCE_CONFIG, TRACK_CONFIG} from './jitsi-config.js'
import {mapParticipant, mapTrack, mapMessage} from './jitsi-mappers.js'
import {normalizeError, ERROR_CODES} from './jitsi-errors.js'

/**
 * JitsiController
 *
 * تنها نقطه تماس با lib-jitsi-meet.
 * هیچ کد دیگری نباید مستقیم با JitsiMeetJS کار کند.
 *
 * الگو: EventEmitter ساده — listener ها با on() ثبت و با off() حذف می‌شوند.
 */


// جایگزین — load از سرور
function getJitsiMeetJS() {
    return window.JitsiMeetJS
}

console.log(CONNECTION_CONFIG)
console.log(window.JitsiMeetJS)

const JitsiMeetJS = getJitsiMeetJS()

export class JitsiController {
    constructor() {
        this._connection = null
        this._conference = null
        this._localTracks = []
        this._listeners = new Map()
        this._status = MEETING_STATUS.IDLE
        this._displayName = ''
        this._roomName = ''

        this._initJitsiMeetJS()
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * اتصال به جلسه
     * @param {Object} params
     * @param {string} params.roomName
     * @param {string} params.displayName
     * @param {string} [params.email]
     */
    // async join({roomName, displayName, email = ''}) {
    //     if (this._status !== MEETING_STATUS.IDLE && this._status !== MEETING_STATUS.LEFT) {
    //         console.warn('[JitsiController] Already in a meeting or connecting')
    //         return
    //     }
    //
    //     this._roomName = roomName
    //     this._displayName = displayName
    //
    //     try {
    //         this._setStatus(MEETING_STATUS.INITIALIZING)
    //         await this._createLocalTracks()
    //
    //         this._setStatus(MEETING_STATUS.CONNECTING)
    //         await this._connect()
    //         await this._joinConference({displayName, email})
    //
    //         this._setStatus(MEETING_STATUS.CONNECTED)
    //     } catch (error) {
    //         const normalized = normalizeError(error, ERROR_CODES.ROOM_JOIN_FAILED)
    //         this._setStatus(MEETING_STATUS.FAILED)
    //         this._emit(JITSI_EVENTS.CONNECTION_FAILED, normalized)
    //     }
    // }
    async join({roomName, displayName, email = ''}) {
        if (this._status !== MEETING_STATUS.IDLE && this._status !== MEETING_STATUS.LEFT) {
            console.warn('[JitsiController] Already in a meeting or connecting')
            return
        }

        this._roomName = roomName
        this._displayName = displayName

        try {
            this._setStatus(MEETING_STATUS.CONNECTING)
            await this._connect()
            await this._joinConference({displayName, email})

            this._setStatus(MEETING_STATUS.CONNECTED)
        } catch (error) {
            const normalized = normalizeError(error, ERROR_CODES.ROOM_JOIN_FAILED)
            this._setStatus(MEETING_STATUS.FAILED)
            this._emit(JITSI_EVENTS.CONNECTION_FAILED, normalized)
        }
    }

    /**
     * خروج از جلسه
     */
    async leave() {
        if (this._status === MEETING_STATUS.LEAVING || this._status === MEETING_STATUS.LEFT) return

        this._setStatus(MEETING_STATUS.LEAVING)

        try {
            await this._disposeLocalTracks()
            if (this._conference) {
                await this._conference.leave()
                this._conference = null
            }
            if (this._connection) {
                await this._connection.disconnect()
                this._connection = null
            }
        } catch (error) {
            console.error('[JitsiController] Error during leave:', error)
        } finally {
            this._setStatus(MEETING_STATUS.LEFT)
            this._emit(JITSI_EVENTS.CONFERENCE_LEFT)
        }
    }

    /** Toggle میکروفون */
    // async toggleAudio() {
    //     const audioTrack = this._localTracks.find((t) => t.getType() === 'audio')
    //     if (!audioTrack) return
    //     audioTrack.isMuted() ? await audioTrack.unmute() : await audioTrack.mute()
    // }

    async toggleAudio() {
        const audioTrack = this._localTracks.find((t) => t.getType() === 'audio')

        if (!audioTrack) {
            try {
                const [newTrack] = await getJitsiMeetJS().createLocalTracks({devices: ['audio']})
                this._localTracks.push(newTrack)

                newTrack.addEventListener(getJitsiMeetJS().events.track.TRACK_MUTE_CHANGED, () => {
                    const mapped = mapTrack(newTrack)
                    this._emit(newTrack.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)
                })

                if (this._conference) {
                    await this._conference.addTrack(newTrack)
                }

                this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(newTrack))
                this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                    participantId: this._conference.myUserId(),
                    isAudioMuted: false,
                })
            } catch (error) {
                console.warn('[JitsiController] Could not get audio access:', error)
            }
            return
        }

        audioTrack.isMuted() ? await audioTrack.unmute() : await audioTrack.mute()
    }

    /** Toggle دوربین */
    // async toggleVideo() {
    //     const videoTrack = this._localTracks.find((t) => t.getType() === 'video')
    //     if (!videoTrack) return
    //     videoTrack.isMuted() ? await videoTrack.unmute() : await videoTrack.mute()
    // }
    async toggleVideo() {
        const videoTrack = this._localTracks.find((t) => t.getType() === 'video')

        if (!videoTrack) {
            try {
                const [newTrack] = await getJitsiMeetJS().createLocalTracks({devices: ['video']})
                this._localTracks.push(newTrack)

                newTrack.addEventListener(getJitsiMeetJS().events.track.TRACK_MUTE_CHANGED, () => {
                    const mapped = mapTrack(newTrack)
                    this._emit(newTrack.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)
                })

                if (this._conference) {
                    await this._conference.addTrack(newTrack)
                }

                this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(newTrack))
                this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                    participantId: this._conference.myUserId(),
                    isVideoMuted: false,
                })
            } catch (error) {
                console.warn('[JitsiController] Could not get video access:', error)
            }
            return
        }

        videoTrack.isMuted() ? await videoTrack.unmute() : await videoTrack.mute()
    }

    /** شروع اشتراک‌گذاری صفحه */
    async startScreenShare() {
        try {
            const [desktopTrack] = await getJitsiMeetJS().createLocalTracks({devices: ['desktop']})
            const videoTrack = this._localTracks.find((t) => t.getType() === 'video')

            if (videoTrack) {
                await this._conference.removeTrack(videoTrack)
                this._localTracks = this._localTracks.filter((t) => t !== videoTrack)
                await videoTrack.dispose()
            }

            await this._conference.addTrack(desktopTrack)
            this._localTracks.push(desktopTrack)

            desktopTrack.addEventListener(getJitsiMeetJS().events.track.LOCAL_TRACK_STOPPED, () => {
                this.stopScreenShare()
            })

            this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(desktopTrack))
            this._emit(JITSI_EVENTS.SCREEN_SHARE_STARTED, mapTrack(desktopTrack))
        } catch (error) {
            const normalized = normalizeError(error, ERROR_CODES.SCREEN_SHARE_FAILED)
            this._emit(JITSI_EVENTS.CONNECTION_FAILED, normalized)
        }
    }

    /** پایان اشتراک‌گذاری صفحه */
    async stopScreenShare() {
        const desktopTrack = this._localTracks.find((t) => t.getVideoType?.() === 'desktop')
        if (!desktopTrack) return

        try {
            await this._conference.removeTrack(desktopTrack)
            this._localTracks = this._localTracks.filter((t) => t !== desktopTrack)
            await desktopTrack.dispose()

            const [videoTrack] = await getJitsiMeetJS().createLocalTracks({devices: ['video']})
            await this._conference.addTrack(videoTrack)
            this._localTracks.push(videoTrack)

            this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(videoTrack))
            this._emit(JITSI_EVENTS.SCREEN_SHARE_STOPPED)
        } catch (error) {
            const normalized = normalizeError(error, ERROR_CODES.SCREEN_SHARE_FAILED)
            this._emit(JITSI_EVENTS.CONNECTION_FAILED, normalized)
        }
    }

    /** ارسال پیام چت */
    sendMessage(text) {
        if (!this._conference || !text?.trim()) return
        this._conference.sendTextMessage(text.trim())
    }

    /** Mute کردن همه شرکت‌کنندگان (فقط moderator) */
    muteEveryone() {
        this._conference?.muteEveryone('audio')
    }

    /** دسترسی به وضعیت فعلی */
    get status() {
        return this._status
    }

    /** ثبت listener */
    on(event, listener) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set())
        this._listeners.get(event).add(listener)
        return () => this.off(event, listener)
    }

    /** حذف listener */
    off(event, listener) {
        this._listeners.get(event)?.delete(listener)
    }

    /** آزادسازی کامل */
    async dispose() {
        await this.leave()
        this._listeners.clear()
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    _initJitsiMeetJS() {
        getJitsiMeetJS().init({
            disableAudioLevels: false,
            disableThirdPartyRequests: true,
        })
        getJitsiMeetJS().setLogLevel(getJitsiMeetJS().logLevels.WARN)
    }

    async _createLocalTracks() {
        try {
            this._localTracks = await getJitsiMeetJS().createLocalTracks(TRACK_CONFIG)
            this._localTracks.forEach((track) => {
                track.addEventListener(getJitsiMeetJS().events.track.TRACK_MUTE_CHANGED, () => {
                    const mapped = mapTrack(track)
                    this._emit(track.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)
                })
                this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(track))
            })
        } catch (error) {
            // اگه دسترسی به دوربین/میک رد شد، بدون track ادامه بده
            console.warn('[JitsiController] Could not get local tracks:', error)
            this._localTracks = []
        }
    }


    _connect() {
        return new Promise((resolve, reject) => {
            this._connection = new JitsiMeetJS.JitsiConnection(null, null, CONNECTION_CONFIG)

            this._connection.addEventListener(
                getJitsiMeetJS().events.connection.CONNECTION_ESTABLISHED,
                () => {
                    this._emit(JITSI_EVENTS.CONNECTION_ESTABLISHED)
                    resolve()
                }
            )
            this._connection.addEventListener(
                getJitsiMeetJS().events.connection.CONNECTION_FAILED,
                (error) => reject(new Error(error))
            )
            this._connection.addEventListener(
                getJitsiMeetJS().events.connection.CONNECTION_DISCONNECTED,
                () => this._emit(JITSI_EVENTS.CONNECTION_INTERRUPTED)
            )
            console.log(
                "SERVICE URL",
                CONNECTION_CONFIG.serviceUrl
            )

            this._connection.connect()
        })
    }

    _joinConference({displayName, email}) {
        return new Promise((resolve, reject) => {
            this._conference = this._connection.initJitsiConference(
                this._roomName.toLowerCase(),
                CONFERENCE_CONFIG
            )

            this._conference.setDisplayName(displayName)
            if (email) this._conference.setLocalParticipantProperty('email', email)

            // Conference events
            this._conference.on(getJitsiMeetJS().events.conference.CONFERENCE_JOINED, () => {
                const localId = this._conference.myUserId()
                this._emit(JITSI_EVENTS.CONFERENCE_JOINED, {participantId: localId, displayName})

                // اضافه کردن track های local به conference
                this._localTracks.forEach((track) => {
                    this._conference.addTrack(track).catch(console.error)
                })

                resolve()
            })

            this._conference.on(getJitsiMeetJS().events.conference.CONFERENCE_FAILED, (error) => {
                reject(new Error(error))
            })

            this._conference.on(getJitsiMeetJS().events.conference.USER_JOINED, (id, participant) => {
                this._emit(JITSI_EVENTS.PARTICIPANT_JOINED, mapParticipant(participant))
            })

            this._conference.on(getJitsiMeetJS().events.conference.USER_LEFT, (id) => {
                this._emit(JITSI_EVENTS.PARTICIPANT_LEFT, {participantId: id})
            })

            this._conference.on(getJitsiMeetJS().events.conference.DISPLAY_NAME_CHANGED, (id, name) => {
                this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {participantId: id, displayName: name})
            })

            this._conference.on(getJitsiMeetJS().events.conference.TRACK_ADDED, (track) => {
                if (track.isLocal()) return
                this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(track))
            })

            this._conference.on(getJitsiMeetJS().events.conference.TRACK_REMOVED, (track) => {
                this._emit(JITSI_EVENTS.TRACK_REMOVED, mapTrack(track))
            })

            // this._conference.on(getJitsiMeetJS().events.conference.TRACK_MUTE_CHANGED, (track) => {
            //     const mapped = mapTrack(track)
            //     this._emit(track.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)
            //     if (!track.isLocal()) {
            //         const participant = this._conference.getParticipantById(track.getParticipantId())
            //         if (participant) {
            //             this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, mapParticipant(participant))
            //         }
            //     }
            // })
            // this._conference.on(getJitsiMeetJS().events.conference.TRACK_MUTE_CHANGED, (track) => {
            //     const mapped = mapTrack(track)
            //     this._emit(track.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)
            //
            //     if (track.isLocal()) {
            //         // برای track لوکال، خودمون participant رو آپدیت کنیم
            //         const type = track.getType() // 'audio' | 'video'
            //         this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
            //             participantId: this._conference.myUserId(),
            //             ...(type === 'audio' ? {isAudioMuted: track.isMuted()} : {}),
            //             ...(type === 'video' ? {isVideoMuted: track.isMuted()} : {}),
            //         })
            //     } else {
            //         const participant = this._conference.getParticipantById(track.getParticipantId())
            //         if (participant) {
            //             this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, mapParticipant(participant))
            //         }
            //     }
            // })
            this._conference.on(getJitsiMeetJS().events.conference.TRACK_MUTE_CHANGED, (track) => {
                const mapped = mapTrack(track)
                this._emit(track.isMuted() ? JITSI_EVENTS.TRACK_MUTED : JITSI_EVENTS.TRACK_UNMUTED, mapped)

                const type = track.getType()
                const participantId = track.isLocal() ? this._conference.myUserId() : track.getParticipantId()

                this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                    participantId,
                    ...(type === 'audio' ? {isAudioMuted: track.isMuted()} : {}),
                    ...(type === 'video' ? {isVideoMuted: track.isMuted()} : {}),
                })
            })
            this._conference.on(getJitsiMeetJS().events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
                this._emit(JITSI_EVENTS.ACTIVE_SPEAKER_CHANGED, {participantId: id})
            })

            this._conference.on(getJitsiMeetJS().events.conference.MESSAGE_RECEIVED, (id, text) => {
                // console.log('[DEBUG] MESSAGE_RECEIVED fired', { id, text, myId: this._conference.myUserId() })
                const participant = this._conference.getParticipantById(id)
                const name = participant?.getDisplayName() || 'شرکت‌کننده'
                this._emit(JITSI_EVENTS.MESSAGE_RECEIVED, mapMessage(id, name, text))
            })

            this._conference.join()
        })
    }

    async _disposeLocalTracks() {
        await Promise.all(this._localTracks.map((t) => t.dispose()))
        this._localTracks = []
    }

    _setStatus(status) {
        this._status = status
        this._emit(JITSI_EVENTS.STATUS_CHANGED, status)
    }

    _emit(event, data) {
        this._listeners.get(event)?.forEach((listener) => {
            try {
                listener(data)
            } catch (error) {
                console.error(`[JitsiController] Error in listener for ${event}:`, error)
            }
        })
    }
}

/** Singleton instance — یک controller برای کل اپ */
export const jitsiController = new JitsiController()