import {JITSI_EVENTS, MEETING_STATUS} from './jitsi-events.js'
import {
    CONNECTION_CONFIG,
    CONFERENCE_CONFIG,
    RECONNECT_CONFIG,
    JITSI_INIT_OPTIONS,
    ADAPTIVE_UPLOAD,
    getDesktopFrameRate,
    getScreenShareMode,
    getScreenShareProfile,
    isFirefoxBrowser,
    setScreenShareModePreference,
    MULTI_STREAM_ENABLED,
    LOCAL_VIDEO_CONFIG,
    RECEIVER_QUALITY,
    PERF,
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
 * 8. Screen-share: by default (MULTI_STREAM_ENABLED) camera and desktop are
 *    independent tracks. With VITE_JITSI_MULTI_STREAM=false the camera is swapped
 *    out for the desktop track and restored afterwards (single video slot).
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

    /**
     * disableAudioLevels / audioLevelsInterval / pcStatsInterval از
     * IJitsiMeetJSOptions هستند. فاصله‌ی audio level روی دستگاه ضعیف بیشتر
     * است تا polling پیوسته CPU را اشغال نکند.
     *
     * IMPORTANT:
     * JitsiMeetJS.init() itself does not create local
     * microphone/camera tracks.
     */
    JitsiMeetJS.init(JITSI_INIT_OPTIONS)

    JitsiMeetJS.setLogLevel(
        JitsiMeetJS.logLevels.WARN
    )

    jitsiInitialized = true

    return JitsiMeetJS
}

export class JitsiController {
    constructor() {
        // نگهداری تایمرهای «قطع طولانی‌مدت» برای هر participant
        this._disconnectWatchdogs = new Map()
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

        // وضعیت reconnect برای پایداری روی نت ضعیف
        this._reconnectAttempts = 0
        this._reconnectTimer = null
        this._connectionFallbackTimer = null
        this._iceRestartTimer = null
        this._iceRestartInFlight = false
        this._isReconnecting = false

// آخرین اطلاعات join برای reconnect (بدون درخواست دوباره میکروفون/دوربین)
        this._lastJoinParams = null

        // =====================================================================
        // Quality cache
        // =====================================================================

        this._qualityCache = new Map()

        // Last receive-quality priority sent to Jitsi. Avoid repeating the
        // same bridge update when the React participant store refreshes.
        // وضعیت دریافت ویدیو (receiver constraints)
        // _remoteVideoSources: sourceName -> {participantId, videoType}
        // _receiverIntent    : آخرین درخواست UI (چه کسانی بزرگ/قابل‌دیدن‌اند)
        // _receiverKey       : برای جلوگیری از ارسال تکراری یک پیام به bridge
        this._remoteVideoSources = new Map()
        // Participants whose stop message has arrived. Ignore delayed desktop
        // TRACK_ADDED events until that participant explicitly starts sharing again.
        this._screenShareSeqByParticipant = new Map() // participantId -> last accepted seq
        this._authoritativelyStoppedScreenShares = new Map() // participantId -> stoppedAt (ms)
        // کی الان واقعاً در حال اشتراک است (از پیام‌های وضعیت) و track دسکتاپی که
        // قبل از دانستن این وضعیت رسیده و منتظر است.
        this._remoteScreenShareActive = new Map() // participantId -> lastSeenAt (ms)
        this._pendingDesktopTracks = new Map() // participantId -> JitsiRemoteTrack
        this._screenShareHeartbeat = null
        this._receiverWatchdog = null
        this._onBrowserOnline = null
        this._onBrowserOffline = null
        this._screenSharePresenceId = null
        this._localScreenShareSeq = 0
        this._trackVideoTypeListeners = new Map()
        this._receiverIntent = null
        this._receiverKey = null

        // =====================================================================
        // Screen sharing
        // =====================================================================

        this._screenShareStatePublisher = null

        this._screenShare = {
            active: false,
            desktopTrack: null,

            /**
             * Camera track that existed before screen sharing.
             *
             * null means there was no camera enabled before
             * screen sharing started.
             */
            wasCameraActiveBefore: false,
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

        // Local audio outbound recovery only.
        // This is intentionally isolated from reconnect / ICE / video logic.
        this._localAudioRecoveryInFlight = false
        this._localAudioRecoveryLastAt = 0
        this._localAudioRecoveryCooldownMs = 2500
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
                   token = null,
                   tokenProvider = null,
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

        // JWT سرور Jitsi (null = ورود بدون توکن)
        this._jwt = token || null
        this._tokenProvider = tokenProvider || null

        this._isLeaving = false

        // قبلاً این مقدار هیچ‌جا ست نمی‌شد و _attemptReconnect همیشه
        // بلافاصله return می‌کرد؛ یعنی reconnect کامل هرگز اجرا نمی‌شد.
        this._lastJoinParams = {
            displayName: this._displayName,
            email: this._email,
        }

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
        this._cancelReconnect()

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
                // Before unmuting, verify that the underlying local source is
                // still alive. A stale/ended JitsiLocalTrack can otherwise make
                // the UI look unmuted while no microphone data is actually sent.
                if (this._isLocalAudioTrackBroken(audioTrack)) {
                    return this._recoverLocalAudioTrack(
                        audioTrack,
                        'toggle-audio-health-check'
                    )
                }

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

                        resolution:
                        LOCAL_VIDEO_CONFIG.resolution,
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

            this._tuneLocalCamera(newTrack)

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
            // فقط سورس دوربین. بدون source name این محدودیت به اشتراک صفحه
            // (در حالت multi-stream) هم اعمال می‌شد و متن را ۳۶۰p می‌کرد.
            this._manualSendHeight = normalizedHeight

            await this._setSenderHeight(
                this._effectiveSendHeight(),
                this._findCameraTrack(),
                'camera'
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


    /**
     * کنترل دریافت ویدیو از bridge.
     *
     * قبلاً این‌جا conference.selectParticipants صدا زده می‌شد که در API فعلی
     * lib-jitsi-meet وجود ندارد؛ پس کد همیشه false برمی‌گرداند و هیچ اولویتی
     * اعمال نمی‌شد. API درست setReceiverConstraints است که با «source name»
     * کار می‌کند، نه participantId.
     *
     * @param {object}   intent
     * @param {string[]} intent.onStageIds  شرکت‌کننده‌های «بزرگ» (pin/focus/screen/speaker)
     * @param {string[]} intent.visibleIds  شرکت‌کننده‌هایی که تایل ویدیوی‌شان دیده می‌شود (به ترتیب اولویت)
     * @param {boolean}  intent.paused      true = هیچ ویدیویی نگیر (تب مخفی / صفحه خاموش)
     */
    setReceiverPriority({
                            onStageIds = [],
                            visibleIds = [],
                            paused = false,
                            gridHeight = null,
                        } = {}) {
        this._receiverIntent = {
            onStageIds: [...new Set(onStageIds.filter(Boolean).map(String))],
            visibleIds: [...new Set(visibleIds.filter(Boolean).map(String))],
            paused: Boolean(paused),
            // ارتفاع مجاز تایل‌های غیر on-stage (پیش‌فرض: کوچک)
            gridHeight: Number(gridHeight) > 0 ? Number(gridHeight) : null,
        }

        return this._applyReceiverConstraints()
    }

    _restoreRemoteCameraTrack(changedTrack) {
        try {
            const participantId = changedTrack.getParticipantId?.()
            const participant = participantId
                ? this._conference?.getParticipantById?.(participantId)
                : null

            for (const other of participant?.getTracks?.() ?? []) {
                if (
                    other === changedTrack ||
                    other.isLocal?.() ||
                    other.getType?.() !== 'video' ||
                    other.getVideoType?.() === 'desktop'
                ) {
                    continue
                }

                this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(other))
            }
        } catch (error) {
            console.warn('[JitsiController] Could not restore camera track:', error)
        }
    }

    _sourcesOfParticipant(participantId) {
        const result = []

        for (const [sourceName, info] of this._remoteVideoSources) {
            if (info.participantId === participantId) {
                result.push({sourceName, videoType: info.videoType})
            }
        }

        return result
    }

    _applyReceiverConstraints(force = false) {
        const conference = this._conference
        const intent = this._receiverIntent

        if (!conference || !intent) {
            return false
        }

        const maxVideos = PERF.maxRemoteVideos
        const SCREEN_HEIGHT = RECEIVER_QUALITY.SCREEN

        let message

        if (intent.paused) {
            // حالت فقط‌صدا: هیچ ویدیویی دریافت/decode نشود.
            message = {
                lastN: 0,
                selectedSources: [],
                onStageSources: [],
                defaultConstraints: {maxHeight: RECEIVER_QUALITY.SMALL},
                constraints: {},
            }
        } else {
            const onStageSources = []
            const constraints = {}

            for (const id of intent.onStageIds) {
                const sources = this._sourcesOfParticipant(id)
                const hasDesktop = sources.some((s) => s.videoType === 'desktop')

                for (const {sourceName, videoType} of sources) {
                    // اگر کسی صفحه‌اش را اشتراک می‌گذارد، فقط صفحه «بزرگ» است
                    // و دوربینش همان کیفیت کوچک پیش‌فرض را می‌گیرد.
                    if (hasDesktop && videoType !== 'desktop') continue

                    onStageSources.push(sourceName)
                    constraints[sourceName] = {
                        maxHeight:
                            videoType === 'desktop'
                                ? SCREEN_HEIGHT
                                : RECEIVER_QUALITY.LARGE,
                    }
                }
            }

            const selected = [...onStageSources]

            for (const id of intent.visibleIds) {
                for (const {sourceName} of this._sourcesOfParticipant(id)) {
                    if (!selected.includes(sourceName)) {
                        selected.push(sourceName)
                    }
                }
            }

            const selectedSources = selected.slice(0, maxVideos)

            message = {
                lastN: maxVideos,
                selectedSources,
                onStageSources: onStageSources.filter((s) =>
                    selectedSources.includes(s)
                ),
                defaultConstraints: {
                    maxHeight: intent.gridHeight || RECEIVER_QUALITY.SMALL,
                },
                constraints,
            }
        }

        const key = JSON.stringify(message)

        // React state می‌تواند مدام refresh شود؛ یک پیام یکسان را تکرار نکن.
        // (مگر وقتی مجبوریم دوباره بفرستیم: بعد از قطع/وصل، bridge تنظیمات را از دست داده.)
        if (!force && key === this._receiverKey) {
            return true
        }

        this._receiverKey = key

        try {
            if (typeof conference.setReceiverConstraints === 'function') {
                if (force) {
                    // lib ممکن است پیام کاملاً یکسان را خودش dedupe کند و به bridge
                    // نفرستد. اول یک پیام ۱ پیکسل متفاوت (همان لایه‌ی simulcast) و
                    // بلافاصله پیام واقعی؛ وضعیت نهایی همان پیام واقعی است.
                    conference.setReceiverConstraints({
                        ...message,
                        defaultConstraints: {
                            ...message.defaultConstraints,
                            maxHeight: (message.defaultConstraints?.maxHeight || RECEIVER_QUALITY.SMALL) + 1,
                        },
                    })
                }

                conference.setReceiverConstraints(message)
            } else {
                // fallback برای نسخه‌های قدیمی lib
                conference.setLastN?.(message.lastN)
                conference.setReceiverVideoConstraint?.(
                    intent.onStageIds.length
                        ? RECEIVER_QUALITY.LARGE
                        : RECEIVER_QUALITY.SMALL
                )
            }

            this._startReceiverWatchdog()

            return true
        } catch (error) {
            this._receiverKey = null
            console.warn('[JitsiController] setReceiverConstraints failed:', error)
            return false
        }
    }

    /**
     * محدود کردن خروجی دوربین خودمان تا انکودر دستگاه کمتر فشار بخورد.
     * - setSenderVideoConstraint: رزولوشن/لایه‌های simulcast ارسالی
     * - applyConstraints(frameRate): best-effort (در API ساخت track گزینه‌ای
     *   برای فریم‌ریت وجود ندارد)
     */
    _tuneLocalCamera(track) {
        try {
            const mediaTrack = track?.getTrack?.()
            const settings = mediaTrack?.getSettings?.() || {}
            const maxFps = LOCAL_VIDEO_CONFIG.maxFps

            // بعضی مرورگرها (به‌خصوص Safari روی مک) وقتی فقط ارتفاع خواسته شود
            // تصویر ۴:۳ می‌دهند و در تایل ۱۶:۹ نوار سیاه می‌افتد. نسبت ۱۶:۹ را
            // صریحاً می‌خواهیم؛ اگر دوربین پشتیبانی کند همان را می‌دهد و اگر نه
            // همان حالت قبلی می‌ماند (applyConstraints با ideal هرگز reject نمی‌کند).
            const TARGET_RATIO = 16 / 9
            const ratio =
                settings.width && settings.height ? settings.width / settings.height : null
            const needsWide = ratio !== null && Math.abs(ratio - TARGET_RATIO) > 0.05
            const needsFps = Boolean(maxFps) && (!settings.frameRate || settings.frameRate > maxFps + 1)

            if (mediaTrack?.applyConstraints && (needsWide || needsFps)) {
                const constraints = {}

                if (needsFps) {
                    constraints.frameRate = {ideal: maxFps, max: maxFps}
                }

                if (needsWide) {
                    const h = LOCAL_VIDEO_CONFIG.maxHeight
                    const w = Math.round((h * TARGET_RATIO) / 2) * 2
                    constraints.aspectRatio = {ideal: TARGET_RATIO}
                    constraints.width = {ideal: w}
                    constraints.height = {ideal: h}
                } else {
                    // width/height فعلی را هم می‌دهیم تا applyConstraints
                    // رزولوشن را به پیش‌فرض دستگاه برنگرداند.
                    if (settings.width) {
                        constraints.width = {ideal: settings.width, max: settings.width}
                    }
                    if (settings.height) {
                        constraints.height = {ideal: settings.height, max: settings.height}
                    }
                }

                mediaTrack.applyConstraints(constraints).catch(() => {})
            }
        } catch {
        }

        try {
            // Only the camera source: without a source name this capped the
            // screen share to camera resolution as well.
            this._setSenderHeight(this._effectiveSendHeight(), track, 'camera')
        } catch {
        }
    }

    /**
     * مستند: JitsiConference.setSenderVideoConstraint(maxFrameHeight) فقط یک پارامتر
     * دارد (نسخه‌های قدیمی‌تر پارامتر دومِ sourceName هم داشتند). اگر lib پارامتر دوم
     * را نداشته باشد، آن را نادیده می‌گیرد و عدد برای کل ویدیوی ارسالی اعمال می‌شود.
     * پس: برای سورس دسکتاپ فقط وقتی صدا می‌زنیم که پارامتر دوم پشتیبانی شود؛ وگرنه
     * سقف دوربین را (ناخواسته) عوض می‌کرد.
     */
    _supportsPerSourceSenderConstraint() {
        const fn = this._conference?.setSenderVideoConstraint
        return typeof fn === 'function' && fn.length >= 2
    }

    _setSenderHeight(height, track, kind) {
        const conference = this._conference

        if (typeof conference?.setSenderVideoConstraint !== 'function') {
            return null
        }

        const perSource = this._supportsPerSourceSenderConstraint()

        if (kind === 'desktop' && !perSource) {
            return null
        }

        try {
            const args = perSource ? [height, track?.getSourceName?.()] : [height]

            return conference.setSenderVideoConstraint(...args)?.catch?.(() => {})
        } catch {
            return null
        }
    }

    /**
     * ارتفاع مجاز ویدیوی ارسالی دوربین: انتخاب دستی کاربر (تنظیمات) یا مقدار
     * tier دستگاه؛ و اگر آپلود خراب است سقف کاهش‌یافته‌ی adaptive.
     */
    _effectiveSendHeight() {
        const base = this._manualSendHeight || LOCAL_VIDEO_CONFIG.maxHeight
        return this._uploadCapped
            ? Math.min(ADAPTIVE_UPLOAD.lowHeight, base)
            : base
    }

    /**
     * کاهش خودکار کیفیت ارسال در packet loss بالا و برگشت بعد از بهبود.
     * به‌جای اینکه تصویر فریز شود/بپرد، رزولوشن پایین می‌آید تا جریان روان بماند.
     */
    _adaptUploadQuality(uploadPacketLoss) {
        if (!this._conference || typeof uploadPacketLoss !== 'number') {
            return
        }

        const camera = this._findCameraTrack()

        if (!camera || camera.isMuted?.()) {
            return
        }

        const state = this._adaptState || (this._adaptState = {bad: 0, good: 0})

        if (uploadPacketLoss >= ADAPTIVE_UPLOAD.lossHigh) {
            state.bad += 1
            state.good = 0
        } else if (uploadPacketLoss <= ADAPTIVE_UPLOAD.lossLow) {
            state.good += 1
            state.bad = 0
        } else {
            state.bad = 0
            state.good = 0
        }

        let changed = false

        if (!this._uploadCapped && state.bad >= ADAPTIVE_UPLOAD.downSamples) {
            this._uploadCapped = true
            changed = true
        } else if (this._uploadCapped && state.good >= ADAPTIVE_UPLOAD.upSamples) {
            this._uploadCapped = false
            changed = true
        }

        if (!changed) {
            return
        }

        state.bad = 0
        state.good = 0

        try {
            this._setSenderHeight(this._effectiveSendHeight(), camera, 'camera')
        } catch {
        }
    }

    /**
     * روش مستند lib برای فریم‌ریت اشتراک صفحه: PeerConnection را طوری تنظیم می‌کند
     * که فریم‌ریت داده‌شده قابل دستیابی باشد
     * (JitsiConference.setDesktopSharingFrameRate(maxFps) → boolean).
     * در مستند نسخه‌ی جدید lib گزینه‌ی desktopSharingFrameRate در init / createLocalTracks /
     * config کنفرانس وجود ندارد؛ پس فقط به آن‌ها تکیه نمی‌کنیم و این را هم صدا می‌زنیم.
     */
    _applyDesktopFrameRate(mode = getScreenShareMode()) {
        const {fps} = getScreenShareProfile(mode)

        try {
            const applied = this._conference?.setDesktopSharingFrameRate?.(fps)
            console.info('[ScreenShare] setDesktopSharingFrameRate', {fps, applied})
            return applied
        } catch (error) {
            console.warn('[ScreenShare] setDesktopSharingFrameRate failed', error)
            return false
        }
    }

    /**
     * تنظیم track اشتراک صفحه بر اساس حالت انتخابی (متن / متعادل / ویدیو):
     * contentHint، فریم‌ریت، سقف اندازه‌ی capture و سقف لایه‌ی ارسالی.
     * همه best-effort هستند؛ مرورگری که پشتیبانی نکند بی‌صدا رد می‌شود.
     */
    _tuneDesktopTrack(track, mode = getScreenShareMode()) {
        const profile = getScreenShareProfile(mode)
        const mediaTrack = track?.getTrack?.()

        this._applyDesktopFrameRate(mode)

        try {
            if (mediaTrack && 'contentHint' in mediaTrack) {
                mediaTrack.contentHint = profile.contentHint
            }
        } catch {
        }

        // Firefox: applyConstraints روی track اشتراک صفحه می‌تواند capture را
        // دوباره بسازد و فریم سیاه بدهد؛ آنجا فقط به سقف لایه‌ی ارسالی
        // (setSenderVideoConstraint پایین) و فریم‌ریتِ زمان ساخت track تکیه می‌کنیم.
        if (!isFirefoxBrowser()) {
            try {
                mediaTrack
                    ?.applyConstraints?.({
                        frameRate: {ideal: profile.fps, max: profile.fps},
                        height: {max: profile.maxHeight},
                        width: {max: Math.round((profile.maxHeight * 16) / 9)},
                    })
                    ?.catch?.(() => {})
            } catch {
            }
        }

        try {
            this._setSenderHeight(profile.maxHeight, track, 'desktop')
        } catch {
        }
    }

    /**
     * عوض‌کردن حالت اشتراک صفحه؛ اگر اشتراک فعال است بدون قطع، روی همان track اعمال می‌شود.
     */
    setScreenShareMode(mode) {
        if (!setScreenShareModePreference(mode)) {
            return false
        }

        const track = this._screenShare?.desktopTrack

        if (this._screenShare?.active && track) {
            this._tuneDesktopTrack(track, mode)
        }

        return true
    }

    /**
     * بعد از افت/برگشت اینترنت، ICE restart یا باز شدن دوباره‌ی کانال bridge،
     * JVB تنظیمات دریافت ویدیوی ما (lastN، selectedSources، رزولوشن) را فراموش
     * می‌کند و فقط چند نفر آخرِ صحبت‌کننده را با کیفیت پیش‌فرض می‌فرستد؛
     * ولی ما چون پیام قبلی را «همان» می‌دانستیم دوباره نمی‌فرستادیم و تایل بقیه
     * خالی می‌ماند. این‌جا اجباری دوباره می‌فرستیم و دوربین خودمان را هم
     * دوباره محدود می‌کنیم.
     */
    _recoverMediaAfterInterruption(reason) {
        if (!this._conference || this._isLeaving || this._isDisposed) {
            return
        }

        try {
            this._applyReceiverConstraints(true)
        } catch (error) {
            console.warn('[JitsiController] receiver recovery failed:', reason, error)
        }

        // watchdog دوره‌ای فقط تنظیمات دریافت را تازه می‌کند؛ دوربین را فقط بعد از
        // قطعی واقعی دوباره محدود می‌کنیم تا بی‌دلیل روی track دست نزنیم.
        if (reason === 'watchdog') {
            return
        }

        try {
            const camera = this._findCameraTrack()
            if (camera) {
                this._tuneLocalCamera(camera)
            }
        } catch {
        }

        console.info('[Recovery] receiver constraints re-sent', {reason})
    }

    _startReceiverWatchdog() {
        if (this._receiverWatchdog || typeof window === 'undefined') {
            return
        }

        // چک ملایم هر ۳۰ ثانیه؛ پیام یک پیکسل متفاوت همان لایه را انتخاب می‌کند
        // پس چشمک/تغییر کیفیت دیده نمی‌شود.
        this._receiverWatchdog = setInterval(() => {
            if (
                !this._conference ||
                this._isLeaving ||
                this._isDisposed ||
                this._status === MEETING_STATUS.RECONNECTING
            ) {
                return
            }
            this._recoverMediaAfterInterruption('watchdog')
        }, 30000)

        // مستند lib: JitsiMeetJS.setNetworkInfo({isOnline}) وضعیت شبکه را به خود
        // کتابخانه می‌گوید تا قطع/وصل اینترنت را درست مدیریت کند (به‌جای اینکه
        // فقط از شکست ICE بفهمد).
        const tellLibNetwork = (isOnline) => {
            try {
                window.JitsiMeetJS?.setNetworkInfo?.({isOnline})
            } catch {
            }
        }

        tellLibNetwork(typeof navigator === 'undefined' ? true : navigator.onLine !== false)

        this._onBrowserOffline = () => tellLibNetwork(false)
        this._onBrowserOnline = () => {
            tellLibNetwork(true)
            setTimeout(() => this._recoverMediaAfterInterruption('browser-online'), 1500)
        }
        window.addEventListener('offline', this._onBrowserOffline)
        window.addEventListener('online', this._onBrowserOnline)
    }

    _stopReceiverWatchdog() {
        if (this._receiverWatchdog) {
            clearInterval(this._receiverWatchdog)
            this._receiverWatchdog = null
        }

        if (typeof window !== 'undefined') {
            if (this._onBrowserOnline) {
                window.removeEventListener('online', this._onBrowserOnline)
                this._onBrowserOnline = null
            }
            if (this._onBrowserOffline) {
                window.removeEventListener('offline', this._onBrowserOffline)
                this._onBrowserOffline = null
            }
        }
    }

    _resetReceiverState() {
        this._stopReceiverWatchdog()
        this._uploadCapped = false
        this._adaptState = null
        this._stopScreenShareHeartbeat()
        this._remoteScreenShareActive.clear()
        this._pendingDesktopTracks.clear()

        if (this._reconcileTimers) {
            for (const timers of this._reconcileTimers.values()) {
                timers.forEach(clearTimeout)
            }
            this._reconcileTimers.clear()
        }

        this._remoteVideoSources.clear()
        this._receiverIntent = null
        this._receiverKey = null

        // listener های streaming-status که روی track های remote گذاشته شده بود
        // قبلاً هیچ‌وقت پاک نمی‌شدند و track ها را در حافظه نگه می‌داشتند.
        if (this._trackStreamingListeners) {
            for (const [track, entry] of this._trackStreamingListeners) {
                try {
                    track.off?.(entry.event, entry.handler)
                } catch {
                }
            }

            this._trackStreamingListeners.clear()
        }

        if (this._trackVideoTypeListeners) {
            for (const [track, entry] of this._trackVideoTypeListeners) {
                try {
                    track.off?.(entry.event, entry.handler)
                } catch {
                }
            }

            this._trackVideoTypeListeners.clear()
        }
    }

    _withTimeout(promise, ms) {
        let timer

        return Promise.race([
            Promise.resolve(promise),
            new Promise((resolve) => {
                timer = setTimeout(resolve, ms)
            }),
        ]).finally(() => clearTimeout(timer))
    }

    // =========================================================================
// Screen Share
// =========================================================================

    /**
     * Start screen sharing.
     *
     * This is the ONLY place where desktop capture is requested.
     */
    setScreenShareStatePublisher(publisher) {
        this._screenShareStatePublisher =
            typeof publisher === 'function' ? publisher : null
    }

    _nextScreenShareSeq() {
        // Monotonic per sender, and comparable across reconnects (time based).
        this._localScreenShareSeq = Math.max(Date.now(), this._localScreenShareSeq + 1)
        return this._localScreenShareSeq
    }

    _publishAuthoritativeScreenShareState(isSharing, seq) {
        const participantId = this._conference?.myUserId?.()
        if (!participantId || typeof this._screenShareStatePublisher !== 'function') {
            return false
        }

        try {
            // RoomPage wires this callback to the classroom WebSocket.
            this._screenShareStatePublisher(participantId, Boolean(isSharing), seq)
            return true
        } catch (error) {
            console.warn('[JitsiController] WebSocket screen-share state publish failed:', error)
            return false
        }
    }

    /**
     * Single entry point for screen-share state messages (WebSocket and
     * endpoint message). Late, duplicated or out-of-order messages are
     * dropped, so an old "stop" can never wipe a newer share.
     */
    _acceptScreenShareState(participantId, isSharing, seq, opts = {}) {
        if (!participantId) return false

        const numericSeq = Number(seq) || 0
        const lastSeq = this._screenShareSeqByParticipant.get(participantId) || 0

        // seq === 0 means "legacy / unknown order" (e.g. cached replay).
        // Never let it override anything we already know about.
        // استثنا: حالت از presence (participant property) خودش «آخرین مقدار» است و
        // برای ورود دیرهنگام همیشه معتبر؛ نیازی به seq ندارد.
        if (
            !opts.fromPresence &&
            numericSeq <= lastSeq &&
            !(numericSeq === 0 && lastSeq === 0)
        ) {
            return false
        }

        if (numericSeq > 0) {
            this._screenShareSeqByParticipant.set(participantId, numericSeq)
        }

        // heartbeat: همان وضعیت «در حال اشتراک» دوباره آمد؛ بی‌سروصدا فقط
        // مطمئن شو track نمایش داده شده (اگر رویدادش گم شده بود).
        if (isSharing && this._remoteScreenShareActive.has(participantId)) {
            this._remoteScreenShareActive.set(participantId, Date.now())
            this._reconcileRemoteScreenShare(participantId, -1)
            return true
        }

        console.info('[ScreenShare] state', { participantId, isSharing, seq: numericSeq })
        this._logParticipantSources(isSharing ? 'on-share-start' : 'on-share-stop', participantId)

        if (isSharing) {
            this._authoritativelyStoppedScreenShares.delete(participantId)
            this._remoteScreenShareActive.set(participantId, Date.now())
            this._scheduleRemoteScreenShareReconcile(participantId)
        } else {
            this._cancelRemoteScreenShareReconcile(participantId)
            this._remoteScreenShareActive.delete(participantId)
            this._pendingDesktopTracks.delete(participantId)
            this._authoritativelyStoppedScreenShares.set(participantId, Date.now())
        }

        this._emit(JITSI_EVENTS.SCREEN_SHARE_STATE_RECEIVED, {
            participantId,
            isSharing: Boolean(isSharing),
        })

        if (!isSharing) {
            for (const [sourceName, source] of this._remoteVideoSources) {
                if (source?.participantId === participantId && source?.videoType === 'desktop') {
                    this._remoteVideoSources.delete(sourceName)
                }
            }
            this._receiverKey = null
            this._applyReceiverConstraints()
        }

        return true
    }

    /**
     * شبکه‌ی ایمنی برای «توقف و شروع دوباره‌ی اشتراک».
     *
     * پیام «شروع اشتراک» (WebSocket/endpoint) از خودِ track زودتر می‌رسد و UI فقط
     * با TRACK_ADDED واقعی تایل اشتراک را نشان می‌دهد. اگر آن رویداد برای
     * اشتراک دوم از دست برود (یا در لحظه‌ی ناهماهنگ با پاک‌سازیِ اشتراک قبلی
     * برسد)، تا refresh چیزی دیده نمی‌شد. این‌جا چند بار بعد از پیام «شروع»
     * از خود lib می‌پرسیم track دسکتاپ این شرکت‌کننده هست یا نه و اگر هست،
     * دوباره به استور و receiver constraints معرفی‌اش می‌کنیم.
     */
    /**
     * track دسکتاپ remote را فقط وقتی به UI می‌دهد که آن شرکت‌کننده «الان»
     * در حال اشتراک است.
     *
     * Jicofo منبع دسکتاپِ آخرین اشتراک را حتی بعد از تمام‌شدن اشتراک نگه می‌دارد
     * (فرستنده track را با replaceTrack برمی‌دارد و source-remove نمی‌فرستد).
     * کسی که بعداً وارد می‌شود آن منبع کهنه را می‌گیرد و قبلاً تایلِ «اشتراک
     * تصویر» شبح نشان می‌داد. حالا تا پیام وضعیت «در حال اشتراک» نرسد نگه
     * داشته می‌شود و نمایش داده نمی‌شود.
     */
    _emitRemoteTrackAdded(mapped, jitsiTrack) {
        if (
            mapped?.type === 'desktop' &&
            !mapped.isLocal &&
            mapped.participantId &&
            !this._remoteScreenShareActive.has(mapped.participantId)
        ) {
            this._pendingDesktopTracks.set(mapped.participantId, jitsiTrack)
            return false
        }

        this._emit(JITSI_EVENTS.TRACK_ADDED, mapped)
        return true
    }

    /**
     * فرستنده: وضعیت «در حال اشتراک» را تازه نگه می‌دارد تا کسی که بعداً وارد
     * شد یا پیام شروع را از دست داد، بدون اینکه فرستنده دوباره اشتراک بگیرد ببیند.
     */
    _startScreenShareHeartbeat() {
        this._stopScreenShareHeartbeat()

        this._screenShareHeartbeat = setInterval(() => {
            if (!this._screenShare?.active) {
                this._stopScreenShareHeartbeat()
                return
            }
            this._broadcastScreenShareState(true, { publish: false })
        }, 8000)
    }

    _stopScreenShareHeartbeat() {
        if (this._screenShareHeartbeat) {
            clearInterval(this._screenShareHeartbeat)
            this._screenShareHeartbeat = null
        }
    }

    /** فرستنده: به شرکت‌کننده‌ی تازه‌وارد وضعیت اشتراک جاری را اعلام کن. */
    _announceScreenShareToNewcomer() {
        if (!this._screenShare?.active) {
            return
        }

        this._broadcastScreenShareState(true)

        // کانال bridge تازه‌وارد ممکن است لحظه‌ی اول هنوز باز نباشد.
        setTimeout(() => {
            if (this._screenShare?.active) {
                this._broadcastScreenShareState(true, { publish: false })
            }
        }, 2000)
    }

    /** فهرست سورس‌های ویدیوی یک شرکت‌کننده طبق lib (فقط برای عیب‌یابی). */
    _snapshotParticipantSources(participantId) {
        const out = []

        try {
            const participant = this._conference?.getParticipantById?.(participantId)
            const sources = participant?.getSources?.()

            if (sources && typeof sources.entries === 'function') {
                for (const [mediaType, bySource] of sources.entries()) {
                    if (mediaType !== 'video' || !bySource?.entries) continue
                    for (const [sourceName, info] of bySource.entries()) {
                        out.push({
                            sourceName,
                            videoType: info?.videoType,
                            muted: info?.muted,
                        })
                    }
                }
            }
        } catch {
        }

        return out
    }

    _logParticipantSources(reason, participantId) {
        if (!participantId) return
        console.info('[Sources]', reason, {
            participantId,
            video: this._snapshotParticipantSources(participantId),
        })
    }

    _scheduleRemoteScreenShareReconcile(participantId) {
        if (!participantId || participantId === this._conference?.myUserId?.()) {
            return
        }

        this._cancelRemoteScreenShareReconcile(participantId)

        this._reconcileTimers = this._reconcileTimers || new Map()
        const timers = []

        for (const delay of [300, 1200, 3000, 6000]) {
            timers.push(
                setTimeout(() => this._reconcileRemoteScreenShare(participantId, delay), delay)
            )
        }

        this._reconcileTimers.set(participantId, timers)
    }

    _cancelRemoteScreenShareReconcile(participantId) {
        const timers = this._reconcileTimers?.get(participantId)

        if (timers) {
            timers.forEach(clearTimeout)
            this._reconcileTimers.delete(participantId)
        }
    }

    _reconcileRemoteScreenShare(participantId, delay) {
        const conference = this._conference

        // بین‌راه اشتراک متوقف شده یا از جلسه خارج شده‌ایم
        if (!conference || this._authoritativelyStoppedScreenShares.has(participantId)) {
            return false
        }

        let remoteTracks = []
        let participantFound = false

        try {
            // API مستند lib: JitsiParticipant.getTracks(). (conference.getRemoteTracks
            // در همه‌ی نسخه‌ها وجود ندارد یا شکل دیگری دارد؛ نتیجه‌ی خالی آن مدرک نیست.)
            const participant = conference.getParticipantById?.(participantId)
            participantFound = Boolean(participant)
            remoteTracks = participant?.getTracks?.() || []

        } catch {
            return false
        }

        const desktops = remoteTracks.filter(
            (t) => t?.getType?.() === 'video' && t.getVideoType?.() === 'desktop'
        )

        // اگر lib هنوز track قدیمیِ اشتراک قبلی را هم نگه داشته، آخرین track
        // «غیر mute» را انتخاب کن (جدیدترین)، نه اولی را.
        const desktop =
            [...desktops].reverse().find((t) => !t.isMuted?.()) ||
            desktops[desktops.length - 1]

        if (!desktop) {
            if (delay < 0) {
                return false
            }
            console.warn(
                '[ScreenShare] start message received but no desktop track found yet',
                {
                    participantId,
                    afterMs: delay,
                    participantFound,
                    tracks: remoteTracks.map((t) => ({
                        type: t?.getType?.(),
                        videoType: t?.getVideoType?.(),
                        source: t?.getSourceName?.(),
                        muted: t?.isMuted?.(),
                    })),
                }
            )
            return false
        }

        const sourceName = desktop.getSourceName?.()

        if (sourceName) {
            this._remoteVideoSources.set(sourceName, {
                participantId,
                videoType: 'desktop',
            })
        }

        // استور با همان key جایگزین می‌شود؛ اگر track همان بود هیچ re-attach ای رخ نمی‌دهد.
        this._emit(JITSI_EVENTS.TRACK_ADDED, mapTrack(desktop))

        this._receiverKey = null
        this._applyReceiverConstraints()

        this._pendingDesktopTracks.delete(participantId)

        if (delay >= 0) {
            console.info('[ScreenShare] reconciled remote desktop track', {
                participantId,
                sourceName,
                afterMs: delay,
                desktopTracks: desktops.length,
                muted: desktop.isMuted?.(),
            })
        }

        return true
    }

    /**
     * A remote desktop source that shows up right after an authoritative
     * "stop" is a leftover of the old share. Only that short window is
     * suppressed; a genuinely new share is never blocked forever (the
     * start message may have been lost).
     */
    _isStaleDesktopSource(participantId) {
        const stoppedAt = this._authoritativelyStoppedScreenShares.get(participantId)
        if (!stoppedAt) return false
        if (Date.now() - stoppedAt < 1500) return true
        this._authoritativelyStoppedScreenShares.delete(participantId)
        return false
    }

    applyAuthoritativeScreenShareState({ participantId, isSharing, seq } = {}) {
        this._acceptScreenShareState(participantId, isSharing, seq)
    }

    /**
     * حالت اشتراک صفحه را مثل isTeacher و raisedHand به‌صورت participant property در
     * presence منتشر می‌کند (setLocalParticipantProperty، مستند). presence حالتِ فعلی را
     * نگه می‌دارد و هر کسی که بعداً وارد می‌شود خودکار می‌گیرد؛ بدون heartbeat.
     */
    _setScreenSharePresence(isSharing) {
        const conference = this._conference

        if (typeof conference?.setLocalParticipantProperty !== 'function') {
            return
        }

        try {
            if (isSharing) {
                this._screenSharePresenceId =
                    this._screenSharePresenceId || String(Date.now())
                conference.setLocalParticipantProperty('screenShare', this._screenSharePresenceId)
            } else {
                this._screenSharePresenceId = null
                conference.setLocalParticipantProperty('screenShare', '0')
            }
        } catch (error) {
            console.debug('[JitsiController] screenShare presence skipped:', error?.message)
        }
    }

    /** گیرنده: اشتراک‌هایی که از قبل در presence ثبت شده‌اند (ورود دیرهنگام). */
    _syncScreenSharePresence() {
        const conference = this._conference

        if (!conference) return

        try {
            for (const participant of conference.getParticipants?.() || []) {
                const id = participant?.getId?.()
                const value = participant?.getProperty?.('screenShare')

                if (id && value && value !== '0' && !this._remoteScreenShareActive.has(id)) {
                    this._acceptScreenShareState(id, true, 0, {fromPresence: true})
                }
            }
        } catch {
        }
    }

    _broadcastScreenShareState(isSharing, { publish = true } = {}) {
        const seq = this._nextScreenShareSeq()

        if (publish) {
            this._setScreenSharePresence(isSharing)
        }

        // The classroom WebSocket is the authoritative state source.
        if (publish) {
            this._publishAuthoritativeScreenShareState(isSharing, seq)
        }

        const conference = this._conference
        if (!conference || typeof conference.sendEndpointMessage !== 'function') {
            return false
        }

        try {
            // Empty endpoint id broadcasts to every participant in lib-jitsi-meet.
            const result = conference.sendEndpointMessage('', {
                type: 'avestro-screen-share-state-v1',
                isSharing: Boolean(isSharing),
                seq,
                sentAt: Date.now(),
            })
            result?.catch?.((error) => {
                // کانال bridge وقتی ICE قطع است باز نیست؛ WebSocket مرجع اصلی است.
                console.debug('[JitsiController] Screen-share endpoint broadcast skipped:', error?.message)
            })
            return true
        } catch (error) {
            console.debug('[JitsiController] Screen-share endpoint broadcast skipped:', error?.message)
            return false
        }
    }

    async startScreenShare() {
        if (
            !this._conference ||
            this._screenShare.active ||
            this._screenShareTransitioning
        ) {
            return false
        }

        const JitsiMeetJS = ensureJitsiInitialized()
        this._screenShareTransitioning = true

        // قبل از ساخت track: فریم‌ریت PeerConnection را مطابق حالت انتخابی تنظیم کن.
        this._applyDesktopFrameRate()

        // true  = دوربین و دسکتاپ هم‌زمان (پیش‌فرض؛ multi-stream روی سرور)
        // false = مدل قدیمی meet: دوربین جایگزین دسکتاپ می‌شود
        const keepCamera = MULTI_STREAM_ENABLED

        let desktopTrack = null
        let trackAttached = false
        let cameraRemoved = false

        try {
            const tracks = await JitsiMeetJS.createLocalTracks({
                devices: ['desktop'],
                desktopSharingFrameRate: getDesktopFrameRate(),
            })

            desktopTrack = tracks?.[0]
            if (!desktopTrack) {
                throw new Error('Could not create desktop track')
            }

            const cameraTrack = this._findCameraTrack()

            this._bindLocalTrackEvents(desktopTrack)

            if (!keepCamera && cameraTrack) {
                // مهم: اول camera را کامل از سرور حذف کن، بعد desktop را اضافه کن.
                // سرور فقط یک اسلات ویدیو به ازای هر نفر دارد؛ اگر برعکس انجام شود،
                // سرور روی camera قفل می‌ماند و بقیه هیچ‌وقت desktop را نمی‌بینند.
                await this._conference.removeTrack(cameraTrack)
                cameraRemoved = true

                await this._safeDisposeTrack(cameraTrack)

                await this._conference.addTrack(desktopTrack)
                trackAttached = true

                this._replaceLocalTrack(cameraTrack, desktopTrack)
            } else {
                // بدون دوربین (یا حالت multi-stream): desktop فقط اضافه می‌شود
                await this._conference.addTrack(desktopTrack)
                trackAttached = true
                this._localTracks.push(desktopTrack)
            }

            this._screenShare = {
                active: true,
                desktopTrack,
                wasCameraActiveBefore: Boolean(cameraTrack),
            }

            this._tuneDesktopTrack(desktopTrack)

            console.info('[ScreenShare] local desktop source added', {
                sourceName: desktopTrack.getSourceName?.(),
                ssrc: desktopTrack.getSsrc?.(),
                mode: getScreenShareMode(),
            })

            const stoppedHandler = this._handleDesktopTrackStopped
            desktopTrack.addEventListener(
                JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                stoppedHandler
            )
            desktopTrack.__jitsiControllerScreenStoppedHandler = stoppedHandler

            const mappedDesktop = mapTrack(desktopTrack)
            this._emit(JITSI_EVENTS.TRACK_ADDED, mappedDesktop)
            this._emit(JITSI_EVENTS.SCREEN_SHARE_STARTED, mappedDesktop)
            this._broadcastScreenShareState(true)
            this._startScreenShareHeartbeat()
            return true
        } catch (error) {
            try {
                if (trackAttached && desktopTrack) {
                    await this._conference?.removeTrack(desktopTrack)
                }

                // اگر دوربین حذف شده بود ولی بعدش خطا خوردیم، برای اینکه
                // کاربر کاملاً بدون تصویر نماند، یک دوربین تازه می‌سازیم.
                if (cameraRemoved) {
                    await this._createAndAddLocalTrack('video')
                }
            } catch (rollbackError) {
                console.warn(
                    '[JitsiController] Screen-share rollback failed:',
                    rollbackError
                )
            }

            if (desktopTrack) {
                this._removeLocalTrack(desktopTrack)
                await this._safeDisposeTrack(desktopTrack)
            }

            this._screenShare = {
                active: false,
                desktopTrack: null,
                wasCameraActiveBefore: false,
            }

            const normalized = normalizeError(error, ERROR_CODES.SCREEN_SHARE_FAILED)
            console.warn('[JitsiController] Screen share failed:', normalized)
            this._emit(JITSI_EVENTS.SCREEN_SHARE_FAILED, normalized)

            return false
        } finally {
            this._screenShareTransitioning = false
        }
    }

    /**
     * Stop screen sharing. A screen-share stop/failure must NEVER tear down the
     * Jitsi connection. In single-slot mode (default) the camera is recreated
     * afterwards; in multi-stream mode the camera was never touched.
     */
    async stopScreenShare() {
        if (!this._conference || !this._screenShare.active) {
            return false
        }

        if (this._screenShareTransitioning) {
            return false
        }

        this._screenShareTransitioning = true
        const desktopTrack = this._screenShare.desktopTrack
        const shouldRestoreCamera =
            !MULTI_STREAM_ENABLED && this._screenShare.wasCameraActiveBefore
        const mappedDesktop = desktopTrack ? mapTrack(desktopTrack) : null
        let removeError = null

        // Tell remote clients immediately. Do not wait for removeTrack(), which
        // can resolve before all endpoints have processed the source removal.
        this._stopScreenShareHeartbeat()
        this._broadcastScreenShareState(false)

        try {
            if (desktopTrack) {
                try {
                    await this._conference.removeTrack(desktopTrack)
                } catch (error) {
                    removeError = error
                    console.warn('[JitsiController] Could not remove screen-share track cleanly:', error)
                }

                this._removeLocalTrack(desktopTrack)
                await this._safeDisposeTrack(desktopTrack)

                if (mappedDesktop) {
                    this._emit(JITSI_EVENTS.TRACK_REMOVED, mappedDesktop)
                }
            }

            this._screenShare = {
                active: false,
                desktopTrack: null,
                wasCameraActiveBefore: false,
            }

            if (shouldRestoreCamera) {
                // دوربین را از صفر می‌سازیم — دقیقاً همان مسیر toggleVideo
                // که همیشه درست کار کرده، نه resurrect کردن track قدیمی.
                const restored = await this._createAndAddLocalTrack('video')

                if (!restored) {
                    console.warn(
                        '[JitsiController] Failed to restore camera after screen share stopped'
                    )
                }
            }

            this._emit(JITSI_EVENTS.SCREEN_SHARE_STOPPED)
            return !removeError
        } catch (error) {
            const normalized = normalizeError(error, ERROR_CODES.SCREEN_SHARE_FAILED)
            console.warn('[JitsiController] Screen share stop cleanup failed:', normalized)

            // Always clear UI state so a failed cleanup cannot leave a stale
            // sharing indicator on the teacher's own client.
            this._screenShare = {
                active: false,
                desktopTrack: null,
                wasCameraActiveBefore: false,
            }
            this._emit(JITSI_EVENTS.SCREEN_SHARE_STOPPED)
            this._emit(JITSI_EVENTS.SCREEN_SHARE_FAILED, normalized)
            return false
        } finally {
            this._screenShareTransitioning = false
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

    // ───────────────────── کلاس آموزشی ─────────────────────

    /** علامت‌گذاری خودم به‌عنوان معلم (برای چیدمان کلاس؛ فقط نمایشی است) */
    async setTeacherFlag(on) {
        if (!this._conference) return false
        try {
            this._conference.setLocalParticipantProperty('isTeacher', on ? '1' : '0')
            this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                participantId: this._conference.myUserId(),
                isTeacher: Boolean(on),
            })
            return true
        } catch (error) {
            console.warn('[JitsiController] setTeacherFlag failed:', error)
            return false
        }
    }

    /** بلندکردن/پایین‌آوردن دست برای خودم */
    async setHandRaised(raised) {
        if (!this._conference) return false
        try {
            this._conference.setLocalParticipantProperty(
                'raisedHand',
                raised ? String(Date.now()) : '0'
            )
            this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                participantId: this._conference.myUserId(),
                isHandRaised: Boolean(raised),
            })
            return true
        } catch (error) {
            console.warn('[JitsiController] setHandRaised failed:', error)
            return false
        }
    }

    /** قطع صدا یا تصویر یک شرکت‌کننده توسط مدیر ('audio' | 'video') */
    async muteParticipantMedia(participantId, mediaType) {
        if (!this._conference || !participantId) return false
        if (participantId === this._conference.myUserId()) return false
        try {
            this._conference.muteParticipant(participantId, mediaType)
            return true
        } catch (error) {
            console.warn('[JitsiController] muteParticipantMedia failed:', error)
            return false
        }
    }

    /**
     * فعال‌کردن «تعدیل صدا و تصویر» (AV moderation) Jitsi؛ سرور جلوی باز کردن
     * میکروفون/دوربین بدون تأیید مدیر را می‌گیرد.
     * اگر سرور/نسخه پشتیبانی نکند false برمی‌گردد و کلاس بدون آن ادامه می‌یابد.
     */
    async enableAVModeration(mediaTypes = ['audio', 'video']) {
        const conf = this._conference
        if (!conf || typeof conf.enableAVModeration !== 'function') return false
        try {
            if (typeof conf.isAVModerationSupported === 'function' && !conf.isAVModerationSupported()) {
                return false
            }
            mediaTypes.forEach((t) => conf.enableAVModeration(t, true))
            return true
        } catch (error) {
            console.warn('[JitsiController] enableAVModeration failed:', error)
            return false
        }
    }

    /** تأیید صحبت/تصویر یک شرکت‌کننده توسط مدیر */
    async approveParticipantMedia(participantId, mediaTypes = ['audio', 'video']) {
        const conf = this._conference
        if (!conf || !participantId || typeof conf.avModerationApprove !== 'function') return false
        try {
            mediaTypes.forEach((t) => conf.avModerationApprove(t, participantId))
            return true
        } catch (error) {
            console.warn('[JitsiController] approveParticipantMedia failed:', error)
            return false
        }
    }

    /** قطع صدای همه‌ی غیر مدیرها */
    async muteAllParticipants(mediaType = 'audio') {
        if (!this._conference) return 0
        let count = 0
        for (const p of this._conference.getParticipants()) {
            if (p.isModerator()) continue
            try {
                this._conference.muteParticipant(p.getId(), mediaType)
                count += 1
            } catch (error) {
                console.warn('[JitsiController] muteAll failed for', p.getId(), error)
            }
        }
        return count
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
            // JitsiConference.muteEveryone در مستند نیست (صدا زدنش خطا می‌داد و
            // دکمه بی‌صدا کار نمی‌کرد). روش مستند: muteParticipant(id, mediaType).
            const myId = this._conference.myUserId?.()
            const others = (this._conference.getParticipants?.() || []).filter(
                (p) => p?.getId?.() && p.getId() !== myId
            )

            others.forEach((p) => this._conference.muteParticipant(p.getId(), 'audio'))

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
            this._resetReceiverState()

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
                        this._jwt || null,
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
                    () => {
                        clearTimeout(this._connectionFallbackTimer)
                        this._connectionFallbackTimer = null
                        resolveOnce()
                    }

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
                        if (this._isLeaving || this._isDisposed) {
                            return
                        }

                        // A temporary network loss can make the XMPP connection report
                        // disconnected while the conference ICE path is still able to
                        // recover. Do not tear down the conference immediately.
                        // CONNECTION_DISCONNECTED belongs to the XMPP/server connection.
                        // Do not emit the conference ICE interruption event here; the
                        // conference-level CONNECTION_INTERRUPTED event is the authoritative
                        // media/ICE signal and prevents duplicate reconnect UI/events.
                        this._setStatus(MEETING_STATUS.RECONNECTING)

                        clearTimeout(this._connectionFallbackTimer)
                        this._connectionFallbackTimer = setTimeout(() => {
                            if (this._isLeaving || this._isDisposed) {
                                return
                            }

                            const conference = this._conference
                            if (conference && typeof conference.isConnectionInterrupted === 'function') {
                                if (!conference.isConnectionInterrupted()) {
                                    return
                                }
                            }

                            this._scheduleReconnect()
                        }, 10000)
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

    // =========================================================================
// Reconnect (پایداری روی نت ضعیف)
// =========================================================================

    /**
     * برنامه‌ریزی تلاش مجدد اتصال با exponential backoff.
     *
     * چرا لازم است:
     * روی موبایل‌دیتا، افت موقت سیگنال طبیعی است. قبلاً هر قطعی XMPP
     * بلافاصله باعث FAILED شدن کل جلسه می‌شد و کاربر باید دستی دوباره
     * وصل می‌شد. این تجربه‌ی بدی روی نت ضعیف است.
     *
     * با backoff نمایی (۱، ۲، ۴، ۸... ثانیه تا سقف ۱۵ ثانیه)، به شبکه
     * فرصت می‌دهیم خودش را جمع‌وجور کند، بدون spam کردن تلاش‌های پشت سر هم
     * که خودش هم مصرف باتری/CPU دارد.
     */
    _scheduleReconnect() {
        if (this._isReconnecting || this._isLeaving || this._isDisposed) {
            return
        }

        if (this._reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
            console.warn('[JitsiController] Max reconnect attempts reached')
            this._setStatus(MEETING_STATUS.FAILED)
            this._emit(JITSI_EVENTS.CONNECTION_FAILED, normalizeError(
                new Error('Reconnect attempts exhausted'),
                ERROR_CODES.ROOM_JOIN_FAILED
            ))
            return
        }

        this._isReconnecting = true

        const delay = Math.min(
            RECONNECT_CONFIG.baseDelayMs * Math.pow(2, this._reconnectAttempts),
            RECONNECT_CONFIG.maxDelayMs
        )

        this._reconnectAttempts += 1

        clearTimeout(this._reconnectTimer)

        this._reconnectTimer = setTimeout(() => {
            this._attemptReconnect()
        }, delay)
    }

    async _attemptReconnect() {
        if (this._isLeaving || this._isDisposed || !this._lastJoinParams) {
            this._isReconnecting = false
            return
        }

        try {
            // پاکسازی اتصال قبلی (بدون دیسپوز لوکال تِرک‌ها —
            // می‌خواهیم بعد از وصل شدن دوباره همان میکروفون/دوربین
            // را اضافه کنیم، نه اینکه کاربر دوباره اجازه بدهد)
            const savedLocalTracks = [...this._localTracks]

            // قبلاً فقط listener ها حذف و ارجاع‌ها null می‌شد؛ conference و
            // connection قدیمی (وب‌سوکت XMPP + PeerConnection + decoder ها)
            // هرگز بسته نمی‌شدند و با هر قطعی کوتاه یک نسخه‌ی دیگر روی هم
            // جمع می‌شد. این یکی از دلایل داغ‌شدن گوشی بعد از یک ساعت بود.
            // timeout می‌گذاریم چون روی شبکه‌ی قطع leave/disconnect ممکن
            // است هیچ‌وقت resolve نشود.
            await this._withTimeout(this._leaveConference(), 4000)
            await this._withTimeout(this._disconnect(), 4000)

            this._conference = null
            this._connection = null
            this._remoteVideoSources.clear()
            this._receiverKey = null

            // توکن قبلی ممکن است منقضی شده باشد؛ اگر تمدید نشد از قبلی استفاده کن
            if (this._tokenProvider) {
                try {
                    this._jwt = (await this._withTimeout(this._tokenProvider(), 4000)) || this._jwt
                } catch (err) {
                    console.warn('[JitsiController] JWT refresh failed:', err)
                }
            }

            await this._connect()
            await this._joinConference({
                displayName: this._lastJoinParams.displayName,
                email: this._lastJoinParams.email,
            })

            // اضافه کردن دوباره‌ی track های محلی که از قبل فعال بودند
            for (const track of savedLocalTracks) {
                try {
                    await this._conference.addTrack(track)
                } catch (err) {
                    console.warn('[JitsiController] Re-adding local track after reconnect failed:', err)
                }
            }

            this._reconnectAttempts = 0
            this._isReconnecting = false
            this._setStatus(MEETING_STATUS.CONNECTED)
            this._emit(JITSI_EVENTS.CONNECTION_ESTABLISHED)

            // محدودیت‌های دریافت ویدیو روی conference جدید دوباره اعمال شود
            this._applyReceiverConstraints()
        } catch (error) {
            this._isReconnecting = false
            console.warn('[JitsiController] Reconnect attempt failed:', error)
            this._scheduleReconnect()
        }
    }

    _cancelReconnect() {
        clearTimeout(this._reconnectTimer)
        clearTimeout(this._connectionFallbackTimer)
        clearTimeout(this._iceRestartTimer)
        this._reconnectTimer = null
        this._connectionFallbackTimer = null
        this._iceRestartTimer = null
        this._iceRestartInFlight = false
        this._isReconnecting = false
        this._reconnectAttempts = 0
    }


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
                // Explicit screen-share state sync
                // Track removal is the primary signal, but this small endpoint
                // message clears stale remote UI immediately if that event is
                // delayed or lost by the installed Jitsi stack.
                // =================================================================
                const endpointMessageEvent = JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED
                if (endpointMessageEvent) {
                    bind(endpointMessageEvent, (participant, payload, from) => {
                        if (payload?.type !== 'avestro-screen-share-state-v1') return
                        const participantId = participant?.getId?.() || from || null
                        if (!participantId) return

                        this._acceptScreenShareState(
                            participantId,
                            payload.isSharing === true,
                            payload.seq ?? payload.sentAt
                        )
                    })
                }

                // =================================================================
                // Conference connection / ICE state
                // =================================================================
                // lib-jitsi-meet exposes these events at conference level.
                // Keep the existing full reconnect as a fallback for a real
                // XMPP connection disconnect, but do NOT recreate the conference
                // or media tracks for a temporary ICE interruption.

                bind(
                    JitsiMeetJS.events.conference.CONNECTION_INTERRUPTED,
                    () => {
                        if (this._isLeaving || this._isDisposed) {
                            return
                        }

                        this._setStatus(MEETING_STATUS.RECONNECTING)
                        this._emit(JITSI_EVENTS.CONNECTION_INTERRUPTED)

                        clearTimeout(this._iceRestartTimer)
                        this._iceRestartTimer = setTimeout(async () => {
                            if (this._isLeaving || this._isDisposed || this._iceRestartInFlight) {
                                return
                            }

                            const currentConference = this._conference
                            if (!currentConference || typeof currentConference.isIceRestartSupported !== 'function' || !currentConference.isIceRestartSupported()) {
                                return
                            }

                            if (typeof currentConference.isConnectionInterrupted === 'function' && !currentConference.isConnectionInterrupted()) {
                                return
                            }

                            this._iceRestartInFlight = true
                            try {
                                await currentConference.restartJvbIce()
                                this._recoverMediaAfterInterruption('ice-restart')
                            } catch (error) {
                                console.warn('[JitsiController] JVB ICE restart failed:', error)
                            } finally {
                                this._iceRestartInFlight = false
                            }
                        }, 3000)
                    }
                )

                bind(
                    JitsiMeetJS.events.conference.CONNECTION_RESTORED,
                    () => {
                        clearTimeout(this._iceRestartTimer)
                        clearTimeout(this._connectionFallbackTimer)
                        this._iceRestartTimer = null
                        this._connectionFallbackTimer = null
                        this._iceRestartInFlight = false

                        if (this._isLeaving || this._isDisposed) {
                            return
                        }

                        this._reconnectAttempts = 0
                        this._setStatus(MEETING_STATUS.CONNECTED)
                        this._emit(JITSI_EVENTS.CONNECTION_RESTORED)

                        // JVB بعد از قطعی تنظیمات دریافت را از دست می‌دهد.
                        this._recoverMediaAfterInterruption('connection-restored')
                        setTimeout(
                            () => this._recoverMediaAfterInterruption('connection-restored+3s'),
                            3000
                        )
                    }
                )

                // =================================================================
                // رویدادهای مستند JitsiConferenceEvents برای سلامت مدیا
                // =================================================================
                const CE = JitsiMeetJS.events.conference

                // «بایت می‌رسد ولی فریم decode نمی‌شود» = دقیقاً علت تایل سیاه. بعد از
                // بازیابی، lib یک بار دیگر با map خالی (all-clear) خبر می‌دهد.
                if (CE.INBOUND_VIDEO_STATS_RECEIVED) {
                    bind(CE.INBOUND_VIDEO_STATS_RECEIVED, (tpc, stats) => {
                        const failing =
                            stats instanceof Map
                                ? stats.size
                                : stats && typeof stats === 'object'
                                  ? Object.keys(stats).length
                                  : 0

                        if (failing === 0) {
                            console.info('[Media] inbound video decoding OK / recovered')
                            return
                        }

                        console.warn('[Media] remote video receiving bytes but not decoding', {
                            streams: failing,
                        })

                        const now = Date.now()
                        if (now - (this._lastDecodeRecoveryAt || 0) > 10000) {
                            this._lastDecodeRecoveryAt = now
                            this._recoverMediaAfterInterruption('inbound-video-not-decoding')
                        }
                    })
                }

                // کامپیوتر/تب از خواب برگشت (suspend): مدیا و تنظیمات دریافت را تازه کن.
                if (CE.SUSPEND_DETECTED) {
                    bind(CE.SUSPEND_DETECTED, () => {
                        console.warn('[Media] suspend detected')
                        setTimeout(
                            () => this._recoverMediaAfterInterruption('suspend-detected'),
                            1500
                        )
                    })
                }

                // Jicofo درخواست source-add (unmute دوربین/اشتراک) را رد کرد؛
                // یعنی دیگران ویدیوی ما را نمی‌بینند. تا الان این بی‌صدا بود.
                if (CE.TRACK_UNMUTE_REJECTED) {
                    bind(CE.TRACK_UNMUTE_REJECTED, (track) => {
                        console.warn('[Media] Jicofo rejected source-add (unmute)', {
                            type: track?.getType?.(),
                            videoType: track?.getVideoType?.(),
                        })
                    })
                }

                if (CE.VIDEO_UNMUTE_PERMISSIONS_CHANGED) {
                    bind(CE.VIDEO_UNMUTE_PERMISSIONS_CHANGED, (...args) => {
                        console.info('[Media] video unmute permissions changed', args)
                    })
                }

                // bridge چه سورس‌هایی را واقعاً برای ما می‌فرستد.
                if (CE.FORWARDED_SOURCES_CHANGED) {
                    this._forwardedSources = this._forwardedSources || new Set()
                    bind(CE.FORWARDED_SOURCES_CHANGED, (leaving = [], entering = []) => {
                        leaving.forEach((n) => this._forwardedSources.delete(n))
                        entering.forEach((n) => this._forwardedSources.add(n))
                        console.debug('[Media] forwarded sources', {
                            entering,
                            leaving,
                            total: this._forwardedSources.size,
                        })
                    })
                }

                // ورود دیرهنگام: اشتراک‌هایی که از قبل در presence هستند را بخوان.
                if (CE.CONFERENCE_JOINED) {
                    bind(CE.CONFERENCE_JOINED, () => {
                        setTimeout(() => this._syncScreenSharePresence(), 1500)
                    })
                }
                if (CE.USER_JOINED) {
                    bind(CE.USER_JOINED, () => {
                        setTimeout(() => this._syncScreenSharePresence(), 1000)
                        setTimeout(() => this._syncScreenSharePresence(), 3500)
                    })
                }

                // وضعیت سورس‌های یک شرکت‌کننده‌ی remote عوض شد (mute / videoType).
                // مستند: participant.getSources() → Map<mediaType, Map<sourceName,
                // {muted, videoType}>> و برای ورود دیرهنگام از presence خودکار می‌آید.
                // فعلاً فقط ثبت می‌کنیم تا ببینیم lib هنگام توقف اشتراک واقعاً چه می‌گوید.
                if (CE.PARTICIPANT_SOURCE_UPDATED) {
                    bind(CE.PARTICIPANT_SOURCE_UPDATED, (arg) => {
                        const id = typeof arg === 'string' ? arg : arg?.getId?.()
                        this._logParticipantSources('source-updated', id)
                    })
                }

                // کانال bridge (WebSocket/SCTP) هر بار که (دوباره) باز می‌شود، JVB با
                // تنظیمات پیش‌فرض شروع می‌کند.
                if (JitsiMeetJS.events.conference.DATA_CHANNEL_OPENED) {
                    bind(
                        JitsiMeetJS.events.conference.DATA_CHANNEL_OPENED,
                        () => this._recoverMediaAfterInterruption('bridge-channel-open')
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

                        this._announceScreenShareToNewcomer()
                    }
                )

                // =================================================================
                // User left
                // =================================================================

                bind(
                    JitsiMeetJS.events.conference.USER_LEFT,
                    (id) => {
                        this._qualityCache.delete(id)
                        this._remoteScreenShareActive.delete(id)
                        this._pendingDesktopTracks.delete(id)
                        this._cancelRemoteScreenShareReconcile(id)

                        const timer = this._disconnectWatchdogs.get(id)
                        if (timer) {
                            clearTimeout(timer)
                            this._disconnectWatchdogs.delete(id)
                        }

                        this._emit(JITSI_EVENTS.PARTICIPANT_LEFT, {participantId: id})
                    }
                )

                // =================================================================
                // Participant property changed (بلندکردن دست)
                // =================================================================

                bind(
                    JitsiMeetJS.events
                        .conference
                        .PARTICIPANT_PROPERTY_CHANGED,
                    (participant, name, _old, value) => {
                        // کلاس: مشخص‌کردن «معلم» برای چیدمان
                        if (name === 'isTeacher') {
                            this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                                participantId: participant.getId(),
                                isTeacher: value === '1',
                            })
                            return
                        }
                        // اشتراک صفحه: presence مرجع «حالت فعلی» است (ورود دیرهنگام هم می‌گیرد)
                        if (name === 'screenShare') {
                            this._acceptScreenShareState(
                                participant.getId(),
                                Boolean(value) && value !== '0',
                                0,
                                {fromPresence: true}
                            )
                            return
                        }
                        if (name !== 'raisedHand') return

                        this._emit(
                            JITSI_EVENTS.PARTICIPANT_UPDATED,
                            {
                                participantId: participant.getId(),
                                isHandRaised: Number(value || 0) > 0,
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

                        this._emitRemoteTrackAdded(mapTrack(track), track)
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

                // توجه: PARTICIPANT_CONN_STATUS_CHANGED و participant.getConnectionStatus()
                // در JitsiConferenceEvents / JitsiParticipant مستند نیستند (حذف‌شده)؛ این
                // handler در نسخه‌ی فعلی lib هرگز اجرا نمی‌شود. جایگزین‌های مستند:
                // LAST_N_ENDPOINTS_CHANGED، FORWARDED_SOURCES_CHANGED،
                // INBOUND_VIDEO_STATS_RECEIVED و connectionQuality.REMOTE_STATS_UPDATED.
                bind(
                    JitsiMeetJS.events.conference.PARTICIPANT_CONN_STATUS_CHANGED ||
                        'unused.participant_conn_status_changed',
                    (participantId) => {
                        const participant = conference.getParticipantById(participantId)
                        if (!participant) return

                        const connectionStatus = participant.getConnectionStatus()
                        const isInterrupted = connectionStatus !== 'active'

                        this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
                            participantId,
                            isConnectionInterrupted: isInterrupted,
                        })

                        this._handleConnectionStatusForWatchdog(participantId, isInterrupted)
                    }
                )

                // =================================================================
                // Local stats
                // =================================================================

                bind(
                    JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED,
                    (stats) => {
                        const localId = conference.myUserId()

                        // packetLoss.upload بیشترین ربط را به کیفیت آپلود خودمان دارد —
                        // مستقل از اینکه انکودر خودش را adapt کرده یا نه.
                        const uploadPacketLoss = stats?.packetLoss?.upload ?? null

                        this._emitQualityThrottled(
                            localId,
                            stats?.connectionQuality ?? null,
                            uploadPacketLoss
                        )

                        this._adaptUploadQuality(uploadPacketLoss)
                    }
                )

                // =================================================================
                // Remote stats
                // =================================================================

                bind(
                    JitsiMeetJS.events.connectionQuality.REMOTE_STATS_UPDATED,
                    (participantId, stats) => {
                        const downloadPacketLoss = stats?.packetLoss?.download ?? null
                        this._emitQualityThrottled(participantId, stats?.connectionQuality ?? null, downloadPacketLoss)
                    }
                )

                // =================================================================
                // Remote video type changes
                //
                // Jitsi can create a remote video track before participant
                // presence tells us whether it is a camera or desktop source.
                // If we keep the initial type, the store may show the camera
                // as a screen share (or vice versa), causing black/frozen tiles.
                // =================================================================

                bind(
                    JitsiMeetJS.events.conference.TRACK_ADDED,
                    (track) => {
                        if (!track || track.isLocal() || track.getType() !== 'video') {
                            return
                        }

                        const videoTypeEvent = JitsiMeetJS.events.track?.TRACK_VIDEOTYPE_CHANGED
                        if (!videoTypeEvent || typeof track.on !== 'function') {
                            return
                        }

                        const entry = {
                            event: videoTypeEvent,
                            handler: null,
                            lastType: mapTrack(track).type,
                        }
                        entry.handler = () => {
                            const mappedTrack = mapTrack(track)
                            const sourceName = track.getSourceName?.()

                            if (mappedTrack.type !== entry.lastType) {
                                // Remove the old key, then add the corrected type.
                                // Store removal is identity-safe, so it cannot delete
                                // another camera track that reused the old key.
                                this._emit(JITSI_EVENTS.TRACK_REMOVED, {
                                    ...mappedTrack,
                                    type: entry.lastType,
                                })
                                this._emitRemoteTrackAdded(mappedTrack, track)
                                entry.lastType = mappedTrack.type

                                // While its type was still unknown, this track was
                                // stored under `${id}-video` and may have overwritten
                                // the participant's real camera track. Re-publish the
                                // camera so it is back in the store after the share ends.
                                if (mappedTrack.type === 'desktop') {
                                    this._restoreRemoteCameraTrack(track)
                                }
                            }

                            if (sourceName) {
                                this._remoteVideoSources.set(sourceName, {
                                    participantId: track.getParticipantId(),
                                    videoType: track.getVideoType?.() || 'camera',
                                })
                            }

                            this._receiverKey = null
                            this._applyReceiverConstraints()
                        }

                        track.on(videoTypeEvent, entry.handler)
                        this._trackVideoTypeListeners.set(track, entry)
                    }
                )

                bind(
                    JitsiMeetJS.events.conference.TRACK_REMOVED,
                    (track) => {
                        const entry = this._trackVideoTypeListeners.get(track)
                        if (!entry) return

                        try {
                            track.off?.(entry.event, entry.handler)
                        } catch {
                        }
                        this._trackVideoTypeListeners.delete(track)
                    }
                )

                // =================================================================
                // Remote track streaming status
                // =================================================================
                // Jitsi reports active/inactive/interrupted/restoring for remote
                // video streams. This is more precise than treating every black
                // video as a conference reconnect problem.

                bind(
                    JitsiMeetJS.events.conference.TRACK_ADDED,
                    (track) => {
                        if (!track || track.isLocal()) {
                            return
                        }

                        const streamingEvent =
                            JitsiMeetJS.events.track?.TRACK_STREAMING_STATUS_CHANGED

                        if (!streamingEvent || typeof track.on !== 'function') {
                            return
                        }

                        const handler = (sourceName, status) => {
                            this._emit(JITSI_EVENTS.TRACK_STREAMING_STATUS_CHANGED, {
                                track: mapTrack(track),
                                sourceName: sourceName || null,
                                status: status || null,
                            })
                        }

                        track.on(streamingEvent, handler)

                        // Emit the current state immediately as well. A remote track can
                        // already be active by the time our listener is attached, so waiting
                        // only for the next status transition can leave the app without the
                        // real current streaming state.
                        if (typeof track.getTrackStreamingStatus === 'function') {
                            try {
                                const currentStatus = track.getTrackStreamingStatus()

                                if (currentStatus) {
                                    this._emit(JITSI_EVENTS.TRACK_STREAMING_STATUS_CHANGED, {
                                        track: mapTrack(track),
                                        sourceName: null,
                                        status: currentStatus,
                                    })
                                }
                            } catch (error) {
                                console.warn(
                                    '[JitsiController] Could not read remote track streaming status:',
                                    error
                                )
                            }
                        }

                        this._trackStreamingListeners = this._trackStreamingListeners || new Map()
                        this._trackStreamingListeners.set(track, {
                            event: streamingEvent,
                            handler,
                        })
                    }
                )

                bind(
                    JitsiMeetJS.events.conference.TRACK_REMOVED,
                    (track) => {
                        const entry = this._trackStreamingListeners?.get(track)
                        if (!entry || !track || typeof track.off !== 'function') {
                            this._trackStreamingListeners?.delete(track)
                            return
                        }

                        try {
                            track.off(entry.event, entry.handler)
                        } catch {
                        }

                        this._trackStreamingListeners.delete(track)
                    }
                )

                // =================================================================
                // Remote video sources -> receiver constraints
                // setReceiverConstraints با source name کار می‌کند؛ این نگاشت
                // participantId -> sourceName را نگه می‌دارد.
                // =================================================================

                bind(
                    JitsiMeetJS.events.conference.TRACK_ADDED,
                    (track) => {
                        if (
                            !track ||
                            track.isLocal() ||
                            track.getType() !== 'video'
                        ) {
                            return
                        }

                        const sourceName = track.getSourceName?.()

                        if (!sourceName) {
                            return
                        }

                        const participantId = track.getParticipantId()
                        const videoType = track.getVideoType?.() || 'camera'

                        // Firefox/Safari may report a desktop source after the
                        // stop message was already received. Never let that stale
                        // source take priority over the participant's camera.
                        if (
                            videoType === 'desktop' &&
                            this._isStaleDesktopSource(participantId)
                        ) {
                            this._remoteVideoSources.delete(sourceName)
                            this._receiverKey = null
                            this._applyReceiverConstraints()
                            return
                        }

                        this._remoteVideoSources.set(sourceName, {
                            participantId,
                            videoType,
                        })

                        this._receiverKey = null
                        this._applyReceiverConstraints()
                    }
                )

                bind(
                    JitsiMeetJS.events.conference.TRACK_REMOVED,
                    (track) => {
                        if (
                            !track ||
                            track.isLocal() ||
                            track.getType() !== 'video'
                        ) {
                            return
                        }

                        const sourceName = track.getSourceName?.()

                        if (
                            sourceName &&
                            this._remoteVideoSources.delete(sourceName)
                        ) {
                            this._applyReceiverConstraints()
                        }
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

                        // A screen share is also a 'video' track. Its mute state
                        // says nothing about the participant's CAMERA, so it must
                        // never flip isVideoMuted (that left the presenter's
                        // camera "off" after the share stopped).
                        if (mapped.type === 'desktop') {
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
            const createOptions = {
                devices: [type],
            }

            // رزولوشن دوربین ارسالی. قبلاً هیچ محدودیتی اعمال نمی‌شد و
            // دوربین با پیش‌فرض lib (تا ۷۲۰p و بیشتر) باز می‌شد.
            if (type === 'video') {
                createOptions.resolution = LOCAL_VIDEO_CONFIG.resolution
            }

            const tracks =
                await JitsiMeetJS.createLocalTracks(createOptions)

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

            if (type === 'video') {
                this._tuneLocalCamera(track)
            }

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

                // بعد از unmute، Jitsi ممکن است دوربین را از نو باز کند و
                // محدودیت فریم‌ریت از بین برود.
                if (
                    type === 'video' &&
                    !muted &&
                    track.getVideoType?.() !== 'desktop'
                ) {
                    this._tuneLocalCamera(track)
                }

                if (track.getVideoType?.() === 'desktop') {
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

        // ---------------------------------------------------------------------
        // Local audio health events
        // ---------------------------------------------------------------------
        //
        // Jitsi explicitly exposes these events for local tracks. We only
        // attach the recovery handlers to audio tracks; video/reconnect paths
        // are deliberately untouched.
        if (track.getType() === 'audio') {
            const onNoDataFromSource = () => {
                if (
                    !track.isMuted() &&
                    this._localTracks.includes(track)
                ) {
                    void this._recoverLocalAudioTrack(
                        track,
                        'no-data-from-source'
                    )
                }
            }

            const onLocalTrackStopped = () => {
                if (
                    !this._isLeaving &&
                    this._localTracks.includes(track)
                ) {
                    void this._recoverLocalAudioTrack(
                        track,
                        'local-track-stopped'
                    )
                }
            }

            track.addEventListener(
                JitsiMeetJS.events.track
                    .NO_DATA_FROM_SOURCE,
                onNoDataFromSource
            )

            track.addEventListener(
                JitsiMeetJS.events.track
                    .LOCAL_TRACK_STOPPED,
                onLocalTrackStopped
            )

            track.__jitsiControllerNoDataFromSourceHandler =
                onNoDataFromSource

            track.__jitsiControllerLocalTrackStoppedHandler =
                onLocalTrackStopped
        }
    }

    /**
     * Conservative local-audio health check.
     *
     * Do not use isReceivingData() as a standalone failure signal because
     * Jitsi documents that it can be false while a track is muted/disposed.
     */
    _isLocalAudioTrackBroken(track) {
        if (!track || track.getType?.() !== 'audio') {
            return true
        }

        try {
            if (track.isEnded?.()) {
                return true
            }

            if (track.disposed) {
                return true
            }

            if (
                !track.isMuted() &&
                typeof track.isReceivingData === 'function' &&
                !track.isReceivingData()
            ) {
                return true
            }
        } catch {
            return true
        }

        return false
    }

    /**
     * Replace a broken local microphone without reconnecting the conference.
     * The replacement uses the same microphone device when Jitsi exposes it.
     */
    async _recoverLocalAudioTrack(
        oldTrack,
        reason
    ) {
        if (
            !oldTrack ||
            oldTrack.getType?.() !== 'audio' ||
            !this._conference ||
            this._isLeaving ||
            oldTrack.isMuted?.()
        ) {
            return false
        }

        if (this._localAudioRecoveryInFlight) {
            return false
        }

        const now = Date.now()

        if (
            now - this._localAudioRecoveryLastAt <
            this._localAudioRecoveryCooldownMs
        ) {
            return false
        }

        if (
            !this._localTracks.includes(oldTrack)
        ) {
            return false
        }

        this._localAudioRecoveryInFlight = true
        this._localAudioRecoveryLastAt = now

        const JitsiMeetJS =
            ensureJitsiInitialized()

        let newTrack = null

        try {
            const deviceId =
                oldTrack.getDeviceId?.()

            const options = {
                devices: ['audio'],
            }

            if (deviceId) {
                options.micDeviceId = deviceId
            }

            console.warn(
                '[JitsiController] Recovering local audio track:',
                reason
            )

            const tracks =
                await JitsiMeetJS.createLocalTracks(
                    options
                )

            newTrack = tracks?.[0]

            if (!newTrack) {
                throw new Error(
                    'Could not create replacement audio track'
                )
            }

            this._bindLocalTrackEvents(
                newTrack
            )

            await this._conference.replaceTrack(
                oldTrack,
                newTrack
            )

            this._replaceLocalTrack(
                oldTrack,
                newTrack
            )

            // The old track is no longer needed after replaceTrack succeeds.
            this._unbindLocalAudioRecoveryEvents(
                oldTrack
            )

            await this._safeDisposeTrack(
                oldTrack
            )

            this._emit(
                JITSI_EVENTS.TRACK_REMOVED,
                mapTrack(oldTrack)
            )

            this._emit(
                JITSI_EVENTS.TRACK_ADDED,
                mapTrack(newTrack)
            )

            return true
        } catch (error) {
            if (newTrack) {
                this._unbindLocalAudioRecoveryEvents(
                    newTrack
                )

                await this._safeDisposeTrack(
                    newTrack
                )
            }

            console.warn(
                '[JitsiController] Local audio recovery failed:',
                error
            )

            return false
        } finally {
            this._localAudioRecoveryInFlight = false
        }
    }

    _unbindLocalAudioRecoveryEvents(
        track
    ) {
        if (!track) {
            return
        }

        try {
            const JitsiMeetJS =
                ensureJitsiInitialized()

            const noDataHandler =
                track.__jitsiControllerNoDataFromSourceHandler

            if (noDataHandler) {
                track.removeEventListener(
                    JitsiMeetJS.events.track
                        .NO_DATA_FROM_SOURCE,
                    noDataHandler
                )
                delete track.__jitsiControllerNoDataFromSourceHandler
            }

            const stoppedHandler =
                track.__jitsiControllerLocalTrackStoppedHandler

            if (stoppedHandler) {
                track.removeEventListener(
                    JitsiMeetJS.events.track
                        .LOCAL_TRACK_STOPPED,
                    stoppedHandler
                )
                delete track.__jitsiControllerLocalTrackStoppedHandler
            }
        } catch {
        }
    }

    /**
     * Find local track by type.
     *
     * NOTE:
     * Both camera and desktop tracks have getType() === 'video'.
     * Use _findCameraTrack() when you specifically need the camera.
     */
    /**
     * همه‌ی MediaStreamTrackهای صوتی زنده (خودم + بقیه‌ی شرکت‌کننده‌ها).
     * recordingService از این برای میکس صدای ضبط استفاده می‌کند؛ به صدای تب
     * و دیالوگ مرورگر نیازی نیست و روی Safari هم کار می‌کند.
     *
     * @returns {MediaStreamTrack[]}
     */
    getAudioMediaTracks() {
        const out = []

        try {
            for (const t of this._localTracks) {
                if (t.getType() === 'audio') {
                    const mt = t.getTrack?.()
                    if (mt && mt.readyState === 'live') out.push(mt)
                }
            }

            const participants = this._conference?.getParticipants?.() ?? []
            for (const participant of participants) {
                for (const t of participant.getTracks?.() ?? []) {
                    if (t.getType?.() === 'audio') {
                        const mt = t.getTrack?.()
                        if (mt && mt.readyState === 'live') out.push(mt)
                    }
                }
            }
        } catch (error) {
            console.warn('[JitsiController] getAudioMediaTracks failed:', error)
        }

        return out
    }

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
            // Remove local-audio recovery listeners before disposing.
            // This prevents our own recovery from reacting to intentional
            // disposal of the old microphone track.
            // -----------------------------------------------------------------

            this._unbindLocalAudioRecoveryEvents(
                track
            )

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

    _emitQualityThrottled(participantId, quality, packetLoss = null) {
        if (!participantId) return

        const now = Date.now()
        const previous = this._qualityCache.get(participantId)

        if (previous) {
            const timePassed = now - previous.time
            const qualityDiff = Math.abs((previous.quality ?? 0) - (quality ?? 0))
            const lossDiff = Math.abs((previous.packetLoss ?? 0) - (packetLoss ?? 0))

            // فقط وقتی هیچ‌کدام تغییر معناداری نکرده، skip کن
            if (timePassed < 5000 && qualityDiff < 15 && lossDiff < 5) {
                return
            }
        }

        this._qualityCache.set(participantId, {time: now, quality, packetLoss})

        this._emit(JITSI_EVENTS.PARTICIPANT_UPDATED, {
            participantId,
            connectionQuality: quality,
            packetLoss, // درصد پکت‌لاس خام — عدد قابل‌اعتمادتر برای "نت واقعاً بد است یا نه"
        })
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
     * اگر participant مدت طولانی قطع بماند، خودمان محلی فرض می‌کنیم
     * رفته است و او را حذف می‌کنیم — مستقل از اینکه سرور XMPP کِی
     * (یا اصلاً) USER_LEFT واقعی می‌فرستد.
     */
    _handleConnectionStatusForWatchdog(participantId, isInterrupted) {
        const DISCONNECT_GRACE_MS = 30000 // ۳۰ ثانیه مهلت قبل از حذف — چون این تایمر هیچ هزینه‌ی CPU/حافظه‌ای ندارد (فقط یک setTimeout)، محتاط‌تر بودن ضرری ندارد

        // اگر برگشت (دیگر interrupted نیست)، تایمر رو پاک کن
        if (!isInterrupted) {
            const existing = this._disconnectWatchdogs.get(participantId)
            if (existing) {
                clearTimeout(existing)
                this._disconnectWatchdogs.delete(participantId)
            }
            return
        }

        // اگر از قبل تایمر داشت، دوباره نساز
        if (this._disconnectWatchdogs.has(participantId)) {
            return
        }

        const timer = setTimeout(() => {
            this._disconnectWatchdogs.delete(participantId)

            // چک کن هنوز واقعاً در کنفرانس هست و هنوز interrupted است
            const participant = this._conference?.getParticipantById(participantId)

            if (!participant) {
                // سرور خودش حذفش کرده، کاری لازم نیست
                return
            }

            if (participant.getConnectionStatus() !== 'active') {
                console.warn(
                    '[JitsiController] Participant considered disconnected after grace period (client-side):',
                    participantId
                )

                this._qualityCache.delete(participantId)

                // فرض محلی: این کاربر رفته. UI را آپدیت کن.
                this._emit(JITSI_EVENTS.PARTICIPANT_LEFT, {participantId})

                // توجه: از _conference حذفش نمی‌کنیم چون آن آبجکت را
                // خود lib-jitsi-meet مدیریت می‌کند. اگر بعداً سرور واقعاً
                // USER_LEFT بفرستد، آن رویداد هم می‌آید و _removeParticipant
                // دوباره (بی‌ضرر) صدا زده می‌شود.
            }
        }, DISCONNECT_GRACE_MS)

        this._disconnectWatchdogs.set(participantId, timer)
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

        for (const timer of this._disconnectWatchdogs.values()) {
            clearTimeout(timer)
        }
        this._disconnectWatchdogs.clear()

        this._qualityCache.clear()
        this._authoritativelyStoppedScreenShares?.clear()
        this._screenShareSeqByParticipant?.clear()
        this._resetReceiverState()

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