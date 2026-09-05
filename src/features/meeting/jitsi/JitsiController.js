import {JITSI_EVENTS, MEETING_STATUS} from './jitsi-events.js'
import {
    CONNECTION_CONFIG,
    CONFERENCE_CONFIG,
} from './jitsi-config.js'
import {
    mapParticipant,
    mapTrack,
    mapMessage,
} from './jitsi-mappers.js'
import {
    normalizeError,
    ERROR_CODES,
} from './jitsi-errors.js'

/**
 * JitsiController
 *
 * Single abstraction layer over lib-jitsi-meet.
 *
 * IMPORTANT MEDIA POLICY
 *
 * 1. Joining a room NEVER creates microphone/camera tracks.
 * 2. Joining a room NEVER requests microphone/camera permission.
 * 3. Microphone permission is requested only after toggleAudio()
 *    or an explicit audio-device change.
 * 4. Camera permission is requested only after toggleVideo()
 *    or an explicit video-device change.
 * 5. Screen-share permission is requested only after startScreenShare().
 * 6. Remote participants/tracks are available after conference join.
 * 7. Local media tracks are created lazily.
 * 8. Camera <-> screen-share uses replaceTrack when possible.
 * 9. Async operations are protected against race conditions.
 * 10. Local tracks are disposed safely.
 * 11. Echo mitigation is delegated to WebRTC/Jitsi audio processing.
 * 12. Local microphone tracks are NEVER played back locally.
 */

function getJitsiMeetJS() {
    if (typeof window === 'undefined') {
        throw new Error(
            'JitsiMeetJS is only available in the browser'
        )
    }

    if (!window.JitsiMeetJS) {
        throw new Error(
            'JitsiMeetJS has not been loaded'
        )
    }

    return window.JitsiMeetJS
}

let jitsiInitialized = false

function ensureJitsiInitialized() {
    const JitsiMeetJS = getJitsiMeetJS()

    if (jitsiInitialized) {
        return JitsiMeetJS
    }

    JitsiMeetJS.init({
        /**
         * Keep audio levels enabled because connection quality
         * and audio-level related functionality may depend on it.
         *
         * IMPORTANT:
         * JitsiMeetJS.init() itself does not create local
         * microphone/camera tracks.
         */
        disableAudioLevels: false,

        disableThirdPartyRequests: true,
    })

    JitsiMeetJS.setLogLevel(
        JitsiMeetJS.logLevels.WARN
    )

    jitsiInitialized = true

    return JitsiMeetJS
}

export class JitsiController {
    constructor() {
        // =====================================================================
        // Jitsi objects
        // =====================================================================

        this._connection = null
        this._conference = null

        // =====================================================================
        // Local media
        // =====================================================================

        this._localTracks = []

        // =====================================================================
        // Application listeners
        // =====================================================================

        this._listeners = new Map()

        // =====================================================================
        // Meeting state
        // =====================================================================

        this._status = MEETING_STATUS.IDLE

        this._displayName = ''
        this._email = ''
        this._roomName = ''

        // =====================================================================
        // Quality cache
        // =====================================================================

        this._qualityCache = new Map()

        // =====================================================================
        // Screen sharing
        // =====================================================================

        this._screenShare = {
            active: false,
            desktopTrack: null,

            /**
             * Camera track that existed before screen sharing.
             *
             * null means there was no camera enabled before
             * screen sharing started.
             */
            replacedTrack: null,
        }

        // =====================================================================
        // Lifecycle / async operation protection
        // =====================================================================

        this._operationId = 0

        this._conferenceListeners = []
        this._connectionListeners = []

        this._isLeaving = false
        this._isDisposed = false

        // =====================================================================
        // Media creation locks
        // =====================================================================

        this._audioTrackCreating = false
        this._videoTrackCreating = false
        this._screenShareTransitioning = false

        // =====================================================================
        // Initialize Jitsi core.
        //
        // IMPORTANT:
        // This does NOT request microphone/camera permission.
        // =====================================================================

        ensureJitsiInitialized()
    }

    // =========================================================================
    // Public API
    // =========================================================================

    get status() {
        return this._status
    }

    get roomName() {
        return this._roomName
    }

    get localTracks() {
        return [...this._localTracks]
    }

    // =========================================================================
    // Join
    // =========================================================================

    /**
     * Join room.
     *
     * IMPORTANT:
     *
     * This method intentionally DOES NOT call createLocalTracks().
     *
     * Flow:
     *
     * join()
     *   ↓
     * Connection
     *   ↓
     * Conference
     *   ↓
     * Participants
     *
     * No microphone permission.
     * No camera permission.
     * No local media track.
     */
    async join({
                   roomName,
                   displayName,
                   email = '',
               }) {
        if (this._isDisposed) {
            throw new Error(
                'JitsiController has been disposed'
            )
        }

        if (!roomName?.trim()) {
            throw new Error(
                'roomName is required'
            )
        }

        if (!displayName?.trim()) {
            throw new Error(
                'displayName is required'
            )
        }

        if (
            this._status !== MEETING_STATUS.IDLE &&
            this._status !== MEETING_STATUS.LEFT &&
            this._status !== MEETING_STATUS.FAILED
        ) {
            console.warn(
                '[JitsiController] join() ignored because controller is busy'
            )

            return false
        }

        const operationId =
            ++this._operationId

        this._roomName =
            roomName.trim()

        this._displayName =
            displayName.trim()

        this._email =
            email?.trim() || ''

        this._isLeaving = false

        try {
            this._setStatus(
                MEETING_STATUS.CONNECTING
            )

            // -----------------------------------------------------------------
            // 1. Connect signalling
            // -----------------------------------------------------------------

            await this._connect()

            this._assertOperationActive(
                operationId
            )

            // -----------------------------------------------------------------
            // 2. Join conference
            // -----------------------------------------------------------------

            await this._joinConference({
                displayName:
                this._displayName,
                email: this._email,
            })

            this._assertOperationActive(
                operationId
            )

            // -----------------------------------------------------------------
            // IMPORTANT:
            //
            // DO NOT create local tracks here.
            //
            // There is deliberately NO:
            //
            // await JitsiMeetJS.createLocalTracks(...)
            //
            // This guarantees that entering the room does not request
            // microphone/camera permission.
            // -----------------------------------------------------------------

            this._setStatus(
                MEETING_STATUS.CONNECTED
            )

            return true
        } catch (error) {
            /**
             * If the operation was cancelled because another lifecycle
             * operation started, don't report it as a room failure.
             */
            const wasCancelled =
                this._isLeaving ||
                this._isDisposed ||
                operationId !==
                this._operationId

            if (!wasCancelled) {
                const normalized =
                    normalizeError(
                        error,
                        ERROR_CODES.ROOM_JOIN_FAILED
                    )

                console.error(
                    '[JitsiController] Join failed:',
                    normalized
                )

                await this._cleanupConnection()

                this._setStatus(
                    MEETING_STATUS.FAILED
                )

                this._emit(
                    JITSI_EVENTS.CONNECTION_FAILED,
                    normalized
                )
            }

            return false
        }
    }

    // =========================================================================
    // Leave
    // =========================================================================

    async leave() {
        if (
            this._status ===
            MEETING_STATUS.LEFT ||
            this._status ===
            MEETING_STATUS.LEAVING
        ) {
            return
        }

        ++this._operationId

        this._isLeaving = true

        this._setStatus(
            MEETING_STATUS.LEAVING
        )

        try {
            await this._leaveConference()
        } catch (error) {
            console.error(
                '[JitsiController] Conference leave failed:',
                error
            )
        }

        try {
            await this._disposeLocalTracks()
        } catch (error) {
            console.error(
                '[JitsiController] Local track cleanup failed:',
                error
            )
        }

        try {
            await this._disconnect()
        } catch (error) {
            console.error(
                '[JitsiController] Connection disconnect failed:',
                error
            )
        }

        this._cleanupInternalState()

        this._setStatus(
            MEETING_STATUS.LEFT
        )

        this._emit(
            JITSI_EVENTS.CONFERENCE_LEFT
        )
    }

    // =========================================================================
    // Audio
    // =========================================================================

    /**
     * Toggle microphone.
     *
     * If no microphone track exists, this is the point where
     * microphone permission may be requested by the browser.
     */
    async toggleAudio() {
        if (!this._conference) {
            return false
        }

        if (this._screenShareTransitioning) {
            return false
        }

        const audioTrack =
            this._findLocalTrack(
                'audio'
            )

        // ---------------------------------------------------------------------
        // First microphone activation.
        //
        // This is an explicit user action.
        // ---------------------------------------------------------------------

        if (!audioTrack) {
            return this._createAndAddLocalTrack(
                'audio'
            )
        }

        try {
            if (audioTrack.isMuted()) {
                await audioTrack.unmute()
            } else {
                await audioTrack.mute()
            }

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Audio toggle failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Video
    // =========================================================================

    /**
     * Toggle camera.
     *
     * Camera permission is requested only here when a camera
     * track does not already exist.
     */
    async toggleVideo() {
        if (!this._conference) {
            return false
        }

        if (this._screenShareTransitioning) {
            return false
        }

        const videoTrack =
            this._findCameraTrack()

        // ---------------------------------------------------------------------
        // First camera activation.
        // ---------------------------------------------------------------------

        if (!videoTrack) {
            /**
             * Screen share is a video track too, but must never
             * be treated as a camera.
             */
            if (this._screenShare.active) {
                return false
            }

            return this._createAndAddLocalTrack(
                'video'
            )
        }

        try {
            if (videoTrack.isMuted()) {
                await videoTrack.unmute()
            } else {
                await videoTrack.mute()
            }

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Video toggle failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Devices
    // =========================================================================

    /**
     * Enumerate available media devices.
     *
     * IMPORTANT:
     *
     * enumerateDevices() itself does not intentionally request
     * microphone/camera permission.
     *
     * Browser behavior may hide device labels until permission
     * has been granted.
     */
    async getDevices() {
        const JitsiMeetJS =
            ensureJitsiInitialized()

        return new Promise(
            (resolve, reject) => {
                try {
                    JitsiMeetJS.mediaDevices.enumerateDevices(
                        (devices) => {
                            resolve({
                                audioInput:
                                    devices.filter(
                                        (device) =>
                                            device.kind ===
                                            'audioinput'
                                    ),

                                audioOutput:
                                    devices.filter(
                                        (device) =>
                                            device.kind ===
                                            'audiooutput'
                                    ),

                                videoInput:
                                    devices.filter(
                                        (device) =>
                                            device.kind ===
                                            'videoinput'
                                    ),
                            })
                        }
                    )
                } catch (error) {
                    reject(error)
                }
            }
        )
    }

    // =========================================================================
    // Audio Input
    // =========================================================================

    /**
     * Change microphone device.
     *
     * This is an explicit media action and can request
     * microphone permission if required.
     */
    async setAudioInputDevice(
        deviceId
    ) {
        if (!deviceId) {
            return false
        }

        if (!this._conference) {
            return false
        }

        if (this._audioTrackCreating) {
            return false
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        let newTrack = null

        const oldTrack =
            this._findLocalTrack(
                'audio'
            )

        try {
            const tracks =
                await JitsiMeetJS.createLocalTracks(
                    {
                        devices: [
                            'audio',
                        ],

                        micDeviceId:
                        deviceId,
                    }
                )

            newTrack =
                tracks?.[0]

            if (!newTrack) {
                throw new Error(
                    'Could not create audio track'
                )
            }

            this._bindLocalTrackEvents(
                newTrack
            )

            if (oldTrack) {
                await this._conference.replaceTrack(
                    oldTrack,
                    newTrack
                )
            } else {
                await this._conference.addTrack(
                    newTrack
                )
            }

            this._replaceLocalTrack(
                oldTrack,
                newTrack
            )

            if (oldTrack) {
                await this._safeDisposeTrack(
                    oldTrack
                )
            }

            this._emit(
                JITSI_EVENTS.TRACK_ADDED,
                mapTrack(newTrack)
            )

            return true
        } catch (error) {
            if (newTrack) {
                await this._safeDisposeTrack(
                    newTrack
                )
            }

            console.warn(
                '[JitsiController] Audio device switch failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Video Input
    // =========================================================================

    /**
     * Change camera device.
     *
     * Screen sharing is intentionally protected from camera switching.
     */
    async setVideoInputDevice(
        deviceId
    ) {
        if (!deviceId) {
            return false
        }

        if (!this._conference) {
            return false
        }

        if (
            this._screenShare.active ||
            this._screenShareTransitioning
        ) {
            return false
        }

        if (this._videoTrackCreating) {
            return false
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        let newTrack = null

        const oldTrack =
            this._findCameraTrack()

        try {
            const tracks =
                await JitsiMeetJS.createLocalTracks(
                    {
                        devices: [
                            'video',
                        ],

                        cameraDeviceId:
                        deviceId,
                    }
                )

            newTrack =
                tracks?.[0]

            if (!newTrack) {
                throw new Error(
                    'Could not create video track'
                )
            }

            this._bindLocalTrackEvents(
                newTrack
            )

            if (oldTrack) {
                await this._conference.replaceTrack(
                    oldTrack,
                    newTrack
                )
            } else {
                await this._conference.addTrack(
                    newTrack
                )
            }

            this._replaceLocalTrack(
                oldTrack,
                newTrack
            )

            if (oldTrack) {
                await this._safeDisposeTrack(
                    oldTrack
                )
            }

            this._emit(
                JITSI_EVENTS.TRACK_ADDED,
                mapTrack(newTrack)
            )

            return true
        } catch (error) {
            if (newTrack) {
                await this._safeDisposeTrack(
                    newTrack
                )
            }

            console.warn(
                '[JitsiController] Video device switch failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Audio Output
    // =========================================================================

    /**
     * Change remote audio output device.
     *
     * NOTE:
     * This changes output routing only.
     * It does not create microphone/camera tracks.
     */
    async setAudioOutputDevice(
        deviceId
    ) {
        if (!deviceId) {
            return false
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        try {
            await JitsiMeetJS.mediaDevices.setAudioOutputDevice(
                deviceId
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Audio output switch failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Video Quality
    // =========================================================================

    async setVideoQuality(
        height
    ) {
        if (!this._conference) {
            return false
        }

        const normalizedHeight =
            Number(height)

        if (
            !Number.isFinite(
                normalizedHeight
            ) ||
            normalizedHeight <= 0
        ) {
            return false
        }

        try {
            await this._conference.setSenderVideoConstraint(
                normalizedHeight
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Video quality change failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Screen Share
    // =========================================================================

    /**
     * Start screen sharing.
     *
     * This is the ONLY place where desktop capture is requested.
     */
    async startScreenShare() {
        if (
            !this._conference ||
            this._screenShare.active ||
            this._screenShareTransitioning
        ) {
            return false
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        this._screenShareTransitioning =
            true

        let desktopTrack = null

        try {
            // -----------------------------------------------------------------
            // Explicit user action -> browser screen capture permission.
            // -----------------------------------------------------------------

            const tracks =
                await JitsiMeetJS.createLocalTracks(
                    {
                        devices: [
                            'desktop',
                        ],
                    }
                )

            desktopTrack =
                tracks?.[0]

            if (!desktopTrack) {
                throw new Error(
                    'Could not create desktop track'
                )
            }

            const cameraTrack =
                this._findCameraTrack()

            this._bindLocalTrackEvents(
                desktopTrack
            )

            // -----------------------------------------------------------------
            // Camera -> Desktop
            // -----------------------------------------------------------------

            if (cameraTrack) {
                await this._conference.replaceTrack(
                    cameraTrack,
                    desktopTrack
                )

                this._replaceLocalTrack(
                    cameraTrack,
                    desktopTrack
                )

                this._screenShare.replacedTrack =
                    cameraTrack
            } else {
                // -----------------------------------------------------------------
                // No camera was enabled before screen share.
                //
                // Add desktop as a new local video track.
                // When sharing stops, camera remains OFF.
                // -----------------------------------------------------------------

                await this._conference.addTrack(
                    desktopTrack
                )

                this._localTracks.push(
                    desktopTrack
                )

                this._screenShare.replacedTrack =
                    null
            }

            this._screenShare.active =
                true

            this._screenShare.desktopTrack =
                desktopTrack

            // -----------------------------------------------------------------
            // Browser/user can stop screen sharing from the browser UI.
            // -----------------------------------------------------------------

            const stoppedHandler =
                this._handleDesktopTrackStopped

            desktopTrack.addEventListener(
                JitsiMeetJS.events.track
                    .LOCAL_TRACK_STOPPED,
                stoppedHandler
            )

            /**
             * Store the handler on the track so it can be removed
             * during normal cleanup.
             */
            desktopTrack.__jitsiControllerScreenStoppedHandler =
                stoppedHandler

            this._emit(
                JITSI_EVENTS.TRACK_ADDED,
                mapTrack(desktopTrack)
            )

            this._emit(
                JITSI_EVENTS.SCREEN_SHARE_STARTED,
                mapTrack(desktopTrack)
            )

            return true
        } catch (error) {
            if (desktopTrack) {
                await this._safeDisposeTrack(
                    desktopTrack
                )
            }

            const normalized =
                normalizeError(
                    error,
                    ERROR_CODES.SCREEN_SHARE_FAILED
                )

            this._emit(
                JITSI_EVENTS.CONNECTION_FAILED,
                normalized
            )

            return false
        } finally {
            this._screenShareTransitioning =
                false
        }
    }

    /**
     * Stop screen sharing.
     */
    async stopScreenShare() {
        if (
            !this._conference ||
            !this._screenShare.active ||
            this._screenShareTransitioning
        ) {
            return false
        }

        this._screenShareTransitioning =
            true

        const desktopTrack =
            this._screenShare.desktopTrack

        const previousCamera =
            this._screenShare.replacedTrack

        try {
            if (!desktopTrack) {
                this._screenShare = {
                    active: false,
                    desktopTrack: null,
                    replacedTrack: null,
                }

                return false
            }

            // -----------------------------------------------------------------
            // Restore previous camera.
            // -----------------------------------------------------------------

            if (previousCamera) {
                await this._conference.replaceTrack(
                    desktopTrack,
                    previousCamera
                )

                this._replaceLocalTrack(
                    desktopTrack,
                    previousCamera
                )

                await this._safeDisposeTrack(
                    desktopTrack
                )
            } else {
                // -----------------------------------------------------------------
                // There was no camera before screen sharing.
                //
                // Remove desktop track.
                // DO NOT create a camera.
                // -----------------------------------------------------------------

                await this._conference.removeTrack(
                    desktopTrack
                )

                this._removeLocalTrack(
                    desktopTrack
                )

                await this._safeDisposeTrack(
                    desktopTrack
                )
            }

            this._screenShare = {
                active: false,
                desktopTrack: null,
                replacedTrack: null,
            }

            this._emit(
                JITSI_EVENTS.SCREEN_SHARE_STOPPED
            )

            return true
        } catch (error) {
            const normalized =
                normalizeError(
                    error,
                    ERROR_CODES.SCREEN_SHARE_FAILED
                )

            this._emit(
                JITSI_EVENTS.CONNECTION_FAILED,
                normalized
            )

            return false
        } finally {
            this._screenShareTransitioning =
                false
        }
    }

    // =========================================================================
    // Chat
    // =========================================================================

    sendMessage(
        text,
        replyTo = null
    ) {
        if (
            !this._conference ||
            !text?.trim()
        ) {
            return false
        }

        const payload = {
            text: text.trim(),

            replyTo: replyTo
                ? {
                    id: replyTo.id,
                    displayName:
                    replyTo.displayName,
                    text: replyTo.text,
                }
                : null,
        }

        try {
            this._conference.sendTextMessage(
                JSON.stringify(payload)
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Message send failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
// Moderation
// =========================================================================

    /**
     * Mute a specific participant's microphone.
     *
     * IMPORTANT:
     *
     * This is a real moderator mute.
     * It is NOT a local playback mute.
     *
     * The participant's audio source is muted for the conference,
     * so other participants will also stop receiving their audio.
     *
     * This operation requires sufficient Jitsi moderator permissions.
     */
    async muteParticipantAudio(participantId) {
        if (!this._conference) {
            return false
        }

        if (!participantId) {
            return false
        }

        const localParticipantId =
            this._conference.myUserId()

        // Never try to mute ourselves through remote moderation.
        if (participantId === localParticipantId) {
            return false
        }

        try {
            const participant =
                this._conference.getParticipantById(
                    participantId
                )

            if (!participant) {
                console.warn(
                    '[JitsiController] Participant not found:',
                    participantId
                )

                return false
            }

            /**
             * lib-jitsi-meet:
             *
             * muteParticipant(
             *     participantId,
             *     'audio'
             * )
             */
            this._conference.muteParticipant(
                participantId,
                'audio'
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Failed to mute participant:',
                participantId,
                error
            )

            return false
        }
    }

    /**
     * Mute or unmute a specific participant.
     *
     * This is useful when the UI has a single toggle button.
     *
     * IMPORTANT:
     *
     * Jitsi's public API exposes muteParticipant() directly.
     * The actual unmute permission depends on the conference's
     * moderation configuration/permissions.
     */
    async toggleParticipantAudio(participantId) {
        if (!this._conference) {
            return false
        }

        if (!participantId) {
            return false
        }

        const localParticipantId =
            this._conference.myUserId()

        if (participantId === localParticipantId) {
            return false
        }

        const participant =
            this._conference.getParticipantById(
                participantId
            )

        if (!participant) {
            return false
        }

        try {
            const tracks =
                typeof participant.getTracks === 'function'
                    ? participant.getTracks()
                    : []

            const audioTrack =
                tracks.find(
                    (track) =>
                        track?.getType?.() === 'audio'
                )

            /**
             * If the participant is currently unmuted,
             * request moderator mute.
             */
            if (!audioTrack || !audioTrack.isMuted()) {
                this._conference.muteParticipant(
                    participantId,
                    'audio'
                )

                return true
            }

            /**
             * Do NOT blindly call participant.unmute().
             *
             * Remote participant unmute is governed by Jitsi's
             * moderation permissions and should normally be initiated
             * by the participant themselves.
             */
            console.warn(
                '[JitsiController] Participant is already muted:',
                participantId
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] Failed to toggle participant audio:',
                participantId,
                error
            )

            return false
        }
    }

    /**
     * Mute everybody's microphone.
     */
    muteEveryone() {
        if (!this._conference) {
            return false
        }

        try {
            this._conference.muteEveryone(
                'audio'
            )

            return true
        } catch (error) {
            console.warn(
                '[JitsiController] muteEveryone failed:',
                error
            )

            return false
        }
    }

    // =========================================================================
    // Application Events
    // =========================================================================

    on(
        event,
        listener
    ) {
        if (
            typeof listener !==
            'function'
        ) {
            throw new TypeError(
                'listener must be a function'
            )
        }

        if (
            !this._listeners.has(event)
        ) {
            this._listeners.set(
                event,
                new Set()
            )
        }

        const listeners =
            this._listeners.get(event)

        listeners.add(listener)

        return () => {
            this.off(
                event,
                listener
            )
        }
    }

    off(
        event,
        listener
    ) {
        const listeners =
            this._listeners.get(event)

        if (!listeners) {
            return
        }

        listeners.delete(
            listener
        )

        if (listeners.size === 0) {
            this._listeners.delete(
                event
            )
        }
    }

    // =========================================================================
    // Dispose
    // =========================================================================

    async dispose() {
        if (this._isDisposed) {
            return
        }

        /**
         * Do leave first.
         *
         * Setting _isDisposed before leave() would make the lifecycle
         * harder to reason about because leave is still responsible for
         * disposing tracks and disconnecting the conference.
         */
        try {
            await this.leave()
        } finally {
            this._isDisposed = true

            ++this._operationId

            this._removeAllJitsiListeners()

            this._listeners.clear()

            this._qualityCache.clear()

            this._connection = null
            this._conference = null
            this._localTracks = []
        }
    }

    // =========================================================================
    // Connection
    // =========================================================================

    _connect() {
        const JitsiMeetJS =
            ensureJitsiInitialized()

        return new Promise(
            (resolve, reject) => {
                let settled = false

                const connection =
                    new JitsiMeetJS.JitsiConnection(
                        null,
                        null,
                        CONNECTION_CONFIG
                    )

                this._connection =
                    connection

                const resolveOnce =
                    () => {
                        if (settled) {
                            return
                        }

                        settled = true

                        this._emit(
                            JITSI_EVENTS.CONNECTION_ESTABLISHED
                        )

                        resolve()
                    }

                const rejectOnce =
                    (error) => {
                        if (settled) {
                            return
                        }

                        settled = true

                        reject(
                            error
                        )
                    }

                const onEstablished =
                    resolveOnce

                const onFailed =
                    (error) => {
                        rejectOnce(
                            error instanceof
                            Error
                                ? error
                                : new Error(
                                    String(
                                        error
                                    )
                                )
                        )
                    }

                const onDisconnected =
                    () => {
                        this._emit(
                            JITSI_EVENTS.CONNECTION_INTERRUPTED
                        )

                        /**
                         * Intentional leave should never be treated
                         * as an unexpected connection failure.
                         */
                        if (
                            !this._isLeaving &&
                            this._status ===
                            MEETING_STATUS.CONNECTED
                        ) {
                            this._setStatus(
                                MEETING_STATUS.FAILED
                            )
                        }
                    }

                connection.addEventListener(
                    JitsiMeetJS.events
                        .connection
                        .CONNECTION_ESTABLISHED,
                    onEstablished
                )

                connection.addEventListener(
                    JitsiMeetJS.events
                        .connection
                        .CONNECTION_FAILED,
                    onFailed
                )

                connection.addEventListener(
                    JitsiMeetJS.events
                        .connection
                        .CONNECTION_DISCONNECTED,
                    onDisconnected
                )

                this._connectionListeners =
                    [
                        [
                            JitsiMeetJS.events
                                .connection
                                .CONNECTION_ESTABLISHED,
                            onEstablished,
                        ],

                        [
                            JitsiMeetJS.events
                                .connection
                                .CONNECTION_FAILED,
                            onFailed,
                        ],

                        [
                            JitsiMeetJS.events
                                .connection
                                .CONNECTION_DISCONNECTED,
                            onDisconnected,
                        ],
                    ]

                try {
                    connection.connect()
                } catch (error) {
                    rejectOnce(error)
                }
            }
        )
    }

    async _disconnect() {
        const connection =
            this._connection

        if (!connection) {
            return
        }

        this._removeConnectionListeners()

        try {
            await connection.disconnect()
        } catch (error) {
            console.warn(
                '[JitsiController] disconnect failed:',
                error
            )
        } finally {
            if (
                this._connection ===
                connection
            ) {
                this._connection =
                    null
            }
        }
    }

    // =========================================================================
    // Conference
    // =========================================================================

    _joinConference({
                        displayName,
                        email,
                    }) {
        const JitsiMeetJS =
            ensureJitsiInitialized()

        if (!this._connection) {
            throw new Error(
                'Cannot join conference without connection'
            )
        }

        return new Promise(
            (resolve, reject) => {
                const conference =
                    this._connection.initJitsiConference(
                        this._roomName.toLowerCase(),
                        CONFERENCE_CONFIG
                    )

                this._conference =
                    conference

                conference.setDisplayName(
                    displayName
                )

                if (email) {
                    conference.setLocalParticipantProperty(
                        'email',
                        email
                    )
                }

                let settled = false

                const resolveOnce =
                    () => {
                        if (settled) {
                            return
                        }

                        settled = true

                        const localId =
                            conference.myUserId()

                        this._emit(
                            JITSI_EVENTS.CONFERENCE_JOINED,
                            {
                                participantId:
                                localId,
                                displayName,
                            }
                        )

                        /**
                         * Some participants may already be available
                         * in the conference object by the time JOINED fires.
                         *
                         * Sync them once here.
                         *
                         * This does NOT create any local media.
                         */
                        this._syncExistingParticipants(
                            conference
                        )

                        resolve()
                    }

                const rejectOnce =
                    (error) => {
                        if (settled) {
                            return
                        }

                        settled = true

                        reject(
                            error
                        )
                    }

                const bind = (
                    event,
                    handler
                ) => {
                    conference.on(
                        event,
                        handler
                    )

                    this._conferenceListeners.push(
                        [
                            event,
                            handler,
                        ]
                    )
                }

                // =================================================================
                // Conference joined
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .CONFERENCE_JOINED,
                    resolveOnce
                )

                // =================================================================
                // Conference failed
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .CONFERENCE_FAILED,
                    (error) => {
                        rejectOnce(
                            error instanceof
                            Error
                                ? error
                                : new Error(
                                    String(
                                        error
                                    )
                                )
                        )
                    }
                )

                // =================================================================
                // User joined
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .USER_JOINED,
                    (
                        id,
                        participant
                    ) => {
                        if (
                            !participant
                        ) {
                            return
                        }

                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_JOINED,
                            mapParticipant(
                                participant
                            )
                        )
                    }
                )

                // =================================================================
                // User left
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .USER_LEFT,
                    (id) => {
                        this._qualityCache.delete(
                            id
                        )

                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_LEFT,
                            {
                                participantId:
                                id,
                            }
                        )
                    }
                )

                // =================================================================
                // Display name changed
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .DISPLAY_NAME_CHANGED,
                    (
                        id,
                        name
                    ) => {
                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_UPDATED,
                            {
                                participantId:
                                id,

                                displayName:
                                name,
                            }
                        )
                    }
                )

                // =================================================================
                // Remote track added
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .TRACK_ADDED,
                    (track) => {
                        if (
                            !track ||
                            track.isLocal()
                        ) {
                            return
                        }

                        this._emit(
                            JITSI_EVENTS.TRACK_ADDED,
                            mapTrack(track)
                        )
                    }
                )

                // =================================================================
                // Remote track removed
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .TRACK_REMOVED,
                    (track) => {
                        if (!track) {
                            return
                        }

                        this._emit(
                            JITSI_EVENTS.TRACK_REMOVED,
                            mapTrack(track)
                        )
                    }
                )

                // =================================================================
                // Participant connection status
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .PARTICIPANT_CONN_STATUS_CHANGED,
                    (
                        participantId
                    ) => {
                        const participant =
                            conference.getParticipantById(
                                participantId
                            )

                        if (
                            !participant
                        ) {
                            return
                        }

                        const connectionStatus =
                            participant.getConnectionStatus()

                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_UPDATED,
                            {
                                participantId,

                                isConnectionInterrupted:
                                    connectionStatus !==
                                    'active',
                            }
                        )
                    }
                )

                // =================================================================
                // Local stats
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .connectionQuality
                        .LOCAL_STATS_UPDATED,
                    (stats) => {
                        const localId =
                            conference.myUserId()

                        this._emitQualityThrottled(
                            localId,
                            stats?.connectionQuality ??
                            null
                        )
                    }
                )

                // =================================================================
                // Remote stats
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .connectionQuality
                        .REMOTE_STATS_UPDATED,
                    (
                        participantId,
                        stats
                    ) => {
                        this._emitQualityThrottled(
                            participantId,
                            stats?.connectionQuality ??
                            null
                        )
                    }
                )

                // =================================================================
                // Track mute changed
                //
                // Local tracks already have their own listener.
                // Therefore local tracks are ignored here to avoid
                // duplicate TRACK_MUTED / TRACK_UNMUTED events.
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .TRACK_MUTE_CHANGED,
                    (track) => {
                        if (!track) {
                            return
                        }

                        if (
                            track.isLocal()
                        ) {
                            return
                        }

                        const mapped =
                            mapTrack(track)

                        const muted =
                            track.isMuted()

                        this._emit(
                            muted
                                ? JITSI_EVENTS.TRACK_MUTED
                                : JITSI_EVENTS.TRACK_UNMUTED,
                            mapped
                        )

                        const type =
                            track.getType()

                        if (
                            type !== 'audio' &&
                            type !== 'video'
                        ) {
                            return
                        }

                        const participantId =
                            track.getParticipantId()

                        if (
                            !participantId
                        ) {
                            return
                        }

                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_UPDATED,
                            {
                                participantId,

                                ...(type ===
                                'audio'
                                    ? {
                                        isAudioMuted:
                                        muted,
                                    }
                                    : {}),

                                ...(type ===
                                'video'
                                    ? {
                                        isVideoMuted:
                                        muted,
                                    }
                                    : {}),
                            }
                        )
                    }
                )

                // =================================================================
                // Dominant speaker
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .DOMINANT_SPEAKER_CHANGED,
                    (id) => {
                        this._emit(
                            JITSI_EVENTS.ACTIVE_SPEAKER_CHANGED,
                            {
                                participantId:
                                id,
                            }
                        )
                    }
                )

                // =================================================================
                // Chat message
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .MESSAGE_RECEIVED,
                    (
                        id,
                        rawText
                    ) => {
                        this._handleMessage(
                            id,
                            rawText
                        )
                    }
                )

                // =================================================================
                // Join
                // =================================================================

                try {
                    conference.join()
                } catch (error) {
                    rejectOnce(error)
                }
            }
        )
    }

    /**
     * Emit currently available participants after conference join.
     *
     * This is only a participant synchronization operation.
     * It does NOT create or request any local media.
     */
    _syncExistingParticipants(
        conference
    ) {
        if (!conference) {
            return
        }

        try {
            const participants =
                typeof conference.getParticipants ===
                'function'
                    ? conference.getParticipants()
                    : []

            if (!Array.isArray(participants)) {
                return
            }

            for (const participant of participants) {
                if (!participant) {
                    continue
                }

                this._emit(
                    JITSI_EVENTS.PARTICIPANT_JOINED,
                    mapParticipant(
                        participant
                    )
                )
            }
        } catch (error) {
            console.warn(
                '[JitsiController] Existing participant sync failed:',
                error
            )
        }
    }

    async _leaveConference() {
        const conference =
            this._conference

        if (!conference) {
            return
        }

        this._removeConferenceListeners()

        try {
            await conference.leave()
        } catch (error) {
            console.warn(
                '[JitsiController] conference.leave() failed:',
                error
            )
        } finally {
            if (
                this._conference ===
                conference
            ) {
                this._conference =
                    null
            }
        }
    }

    // =========================================================================
    // Local Tracks
    // =========================================================================

    /**
     * Create exactly one local media track.
     *
     * IMPORTANT:
     *
     * This method is NEVER called from join().
     *
     * It is called only after an explicit media action:
     *
     * - toggleAudio()
     * - toggleVideo()
     *
     * Therefore entering a room cannot request camera/microphone permission.
     */
    async _createAndAddLocalTrack(
        type
    ) {
        if (
            type !== 'audio' &&
            type !== 'video'
        ) {
            return false
        }

        if (
            type === 'audio' &&
            this._audioTrackCreating
        ) {
            return false
        }

        if (
            type === 'video' &&
            this._videoTrackCreating
        ) {
            return false
        }

        if (!this._conference) {
            return false
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        if (type === 'audio') {
            this._audioTrackCreating =
                true
        } else {
            this._videoTrackCreating =
                true
        }

        let track = null

        try {
            /**
             * This is the actual media creation point.
             *
             * Browser permission can be requested here.
             *
             * Jitsi/WebRTC handles the browser media processing path.
             */
            const tracks =
                await JitsiMeetJS.createLocalTracks(
                    {
                        devices: [
                            type,
                        ],
                    }
                )

            track =
                tracks?.[0]

            if (!track) {
                throw new Error(
                    `Could not create ${type} track`
                )
            }

            this._bindLocalTrackEvents(
                track
            )

            /**
             * Add to conference first.
             *
             * Only store the track after Jitsi successfully
             * accepts it.
             */
            await this._conference.addTrack(
                track
            )

            this._localTracks.push(
                track
            )

            this._emit(
                JITSI_EVENTS.TRACK_ADDED,
                mapTrack(track)
            )

            return true
        } catch (error) {
            if (track) {
                await this._safeDisposeTrack(
                    track
                )
            }

            console.warn(
                `[JitsiController] Could not create ${type} track:`,
                error
            )

            return false
        } finally {
            if (type === 'audio') {
                this._audioTrackCreating =
                    false
            } else {
                this._videoTrackCreating =
                    false
            }
        }
    }

    /**
     * Bind local track events.
     */
    _bindLocalTrackEvents(
        track
    ) {
        if (!track) {
            return
        }

        /**
         * Avoid duplicate bindings.
         */
        if (
            track.__jitsiControllerMuteHandler
        ) {
            return
        }

        const JitsiMeetJS =
            ensureJitsiInitialized()

        const onMuteChanged =
            () => {
                const mapped =
                    mapTrack(track)

                const muted =
                    track.isMuted()

                this._emit(
                    muted
                        ? JITSI_EVENTS.TRACK_MUTED
                        : JITSI_EVENTS.TRACK_UNMUTED,
                    mapped
                )

                const type =
                    track.getType()

                if (
                    type !== 'audio' &&
                    type !== 'video'
                ) {
                    return
                }

                if (!this._conference) {
                    return
                }

                const participantId =
                    this._conference.myUserId()

                if (!participantId) {
                    return
                }

                this._emit(
                    JITSI_EVENTS.PARTICIPANT_UPDATED,
                    {
                        participantId,

                        ...(type ===
                        'audio'
                            ? {
                                isAudioMuted:
                                muted,
                            }
                            : {}),

                        ...(type ===
                        'video'
                            ? {
                                isVideoMuted:
                                muted,
                            }
                            : {}),
                    }
                )
            }

        track.addEventListener(
            JitsiMeetJS.events.track
                .TRACK_MUTE_CHANGED,
            onMuteChanged
        )

        track.__jitsiControllerMuteHandler =
            onMuteChanged
    }

    /**
     * Find local track by type.
     *
     * NOTE:
     * Both camera and desktop tracks have getType() === 'video'.
     * Use _findCameraTrack() when you specifically need the camera.
     */
    _findLocalTrack(
        type
    ) {
        return (
            this._localTracks.find(
                (track) =>
                    track.getType() ===
                    type
            ) || null
        )
    }

    /**
     * Find actual camera track.
     *
     * Desktop screen share is also a video track, so getVideoType()
     * must be checked.
     */
    _findCameraTrack() {
        return (
            this._localTracks.find(
                (track) => {
                    if (
                        track.getType() !==
                        'video'
                    ) {
                        return false
                    }

                    const videoType =
                        track.getVideoType?.()

                    return (
                        videoType !==
                        'desktop'
                    )
                }
            ) || null
        )
    }

    /**
     * Replace local track reference.
     */
    _replaceLocalTrack(
        oldTrack,
        newTrack
    ) {
        if (oldTrack) {
            const index =
                this._localTracks.indexOf(
                    oldTrack
                )

            if (index !== -1) {
                this._localTracks[
                    index
                    ] = newTrack

                return
            }
        }

        if (
            !this._localTracks.includes(
                newTrack
            )
        ) {
            this._localTracks.push(
                newTrack
            )
        }
    }

    /**
     * Remove local track reference.
     */
    _removeLocalTrack(
        track
    ) {
        this._localTracks =
            this._localTracks.filter(
                (item) =>
                    item !== track
            )
    }

    /**
     * Dispose all local tracks.
     */
    async _disposeLocalTracks() {
        const tracks = [
            ...this._localTracks,
        ]

        this._localTracks = []

        await Promise.all(
            tracks.map(
                (track) =>
                    this._safeDisposeTrack(
                        track
                    )
            )
        )

        this._screenShare = {
            active: false,
            desktopTrack: null,
            replacedTrack: null,
        }
    }

    /**
     * Safely dispose a local track.
     */
    async _safeDisposeTrack(
        track
    ) {
        if (!track) {
            return
        }

        try {
            const JitsiMeetJS =
                ensureJitsiInitialized()

            // -----------------------------------------------------------------
            // Remove mute listener
            // -----------------------------------------------------------------

            const muteHandler =
                track.__jitsiControllerMuteHandler

            if (muteHandler) {
                try {
                    track.removeEventListener(
                        JitsiMeetJS.events.track
                            .TRACK_MUTE_CHANGED,
                        muteHandler
                    )
                } catch {
                }

                delete track.__jitsiControllerMuteHandler
            }

            // -----------------------------------------------------------------
            // Remove screen-share stopped listener
            // -----------------------------------------------------------------

            const screenStoppedHandler =
                track.__jitsiControllerScreenStoppedHandler

            if (
                screenStoppedHandler
            ) {
                try {
                    track.removeEventListener(
                        JitsiMeetJS.events.track
                            .LOCAL_TRACK_STOPPED,
                        screenStoppedHandler
                    )
                } catch {
                }

                delete track.__jitsiControllerScreenStoppedHandler
            }

            // -----------------------------------------------------------------
            // Dispose Jitsi track
            // -----------------------------------------------------------------

            if (
                typeof track.dispose ===
                'function'
            ) {
                await track.dispose()
            }
        } catch (error) {
            console.warn(
                '[JitsiController] Track dispose failed:',
                error
            )
        }
    }

    // =========================================================================
    // Messages
    // =========================================================================

    _handleMessage(
        id,
        rawText
    ) {
        if (!this._conference) {
            return
        }

        const myId =
            this._conference.myUserId()

        const isLocal =
            id === myId

        const participant =
            isLocal
                ? null
                : this._conference.getParticipantById(
                    id
                )

        const name = isLocal
            ? this._displayName
            : participant?.getDisplayName() ||
            'شرکت‌کننده'

        let text = rawText
        let replyTo = null

        try {
            const parsed =
                JSON.parse(rawText)

            if (
                parsed &&
                typeof parsed.text ===
                'string'
            ) {
                text = parsed.text

                replyTo =
                    parsed.replyTo ||
                    null
            }
        } catch {
            /**
             * Plain text message.
             */
        }

        this._emit(
            JITSI_EVENTS.MESSAGE_RECEIVED,
            mapMessage(
                id,
                name,
                text,
                replyTo
            )
        )
    }

    // =========================================================================
    // Quality
    // =========================================================================

    _emitQualityThrottled(
        participantId,
        quality
    ) {
        if (!participantId) {
            return
        }

        const now =
            Date.now()

        const previous =
            this._qualityCache.get(
                participantId
            )

        if (previous) {
            const timePassed =
                now -
                previous.time

            const previousQuality =
                previous.quality

            const qualityDifference =
                Math.abs(
                    (previousQuality ??
                        0) -
                    (quality ?? 0)
                )

            /**
             * Avoid flooding React/store with tiny quality changes.
             */
            if (
                timePassed < 5000 &&
                qualityDifference < 15
            ) {
                return
            }
        }

        this._qualityCache.set(
            participantId,
            {
                time: now,
                quality,
            }
        )

        this._emit(
            JITSI_EVENTS.PARTICIPANT_UPDATED,
            {
                participantId,

                connectionQuality:
                quality,
            }
        )
    }

    // =========================================================================
    // Screen Share Lifecycle
    // =========================================================================

    /**
     * Called when the user stops screen sharing from the browser's
     * native screen-sharing UI.
     */
    _handleDesktopTrackStopped =
        () => {
            if (
                !this._screenShare.active ||
                this
                    ._screenShareTransitioning
            ) {
                return
            }

            this.stopScreenShare().catch(
                (error) => {
                    console.warn(
                        '[JitsiController] Auto stop screen share failed:',
                        error
                    )
                }
            )
        }

    // =========================================================================
    // Lifecycle Helpers
    // =========================================================================

    _assertOperationActive(
        operationId
    ) {
        if (
            operationId !==
            this._operationId ||
            this._isLeaving ||
            this._isDisposed
        ) {
            throw new Error(
                'Jitsi operation was cancelled'
            )
        }
    }

    /**
     * Cleanup after failed join/connect.
     */
    async _cleanupConnection() {
        try {
            await this._leaveConference()
        } catch {
        }

        try {
            await this._disposeLocalTracks()
        } catch {
        }

        try {
            await this._disconnect()
        } catch {
        }

        this._cleanupInternalState()
    }

    /**
     * Reset internal state after leaving/failure.
     */
    _cleanupInternalState() {
        this._roomName = ''
        this._displayName = ''
        this._email = ''

        this._qualityCache.clear()

        this._screenShare = {
            active: false,
            desktopTrack: null,
            replacedTrack: null,
        }

        this._audioTrackCreating =
            false

        this._videoTrackCreating =
            false

        this._screenShareTransitioning =
            false

        this._isLeaving = false
    }

    // =========================================================================
    // Listener Cleanup
    // =========================================================================

    _removeConnectionListeners() {
        if (!this._connection) {
            this._connectionListeners =
                []

            return
        }

        for (const [
            event,
            handler,
        ] of this._connectionListeners) {
            try {
                this._connection.removeEventListener(
                    event,
                    handler
                )
            } catch {
            }
        }

        this._connectionListeners =
            []
    }

    _removeConferenceListeners() {
        if (!this._conference) {
            this._conferenceListeners =
                []

            return
        }

        for (const [
            event,
            handler,
        ] of this._conferenceListeners) {
            try {
                if (
                    typeof this
                        ._conference
                        .off ===
                    'function'
                ) {
                    this._conference.off(
                        event,
                        handler
                    )
                } else if (
                    typeof this
                        ._conference
                        .removeEventListener ===
                    'function'
                ) {
                    this._conference.removeEventListener(
                        event,
                        handler
                    )
                }
            } catch {
            }
        }

        this._conferenceListeners =
            []
    }

    _removeAllJitsiListeners() {
        this._removeConferenceListeners()
        this._removeConnectionListeners()
    }

    // =========================================================================
    // State
    // =========================================================================

    _setStatus(
        status
    ) {
        if (
            this._status ===
            status
        ) {
            return
        }

        this._status =
            status

        this._emit(
            JITSI_EVENTS.STATUS_CHANGED,
            status
        )
    }

    // =========================================================================
    // Event Emit
    // =========================================================================

    _emit(
        event,
        data
    ) {
        const listeners =
            this._listeners.get(
                event
            )

        if (
            !listeners ||
            listeners.size === 0
        ) {
            return
        }

        /**
         * Clone listeners before iteration.
         *
         * This allows a listener to unsubscribe itself
         * safely during event emission.
         */
        for (
            const listener of [
            ...listeners,
        ]
            ) {
            try {
                listener(data)
            } catch (error) {
                console.error(
                    `[JitsiController] Listener error (${event}):`,
                    error
                )
            }
        }
    }
}

/**
 * Singleton.
 *
 * Browser-side usage only.
 */
export const jitsiController =
    new JitsiController()