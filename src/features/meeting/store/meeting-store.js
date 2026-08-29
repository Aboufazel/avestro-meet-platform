import {create} from 'zustand'
import {MEETING_STATUS} from '../jitsi/jitsi-events.js'

/**
 * Meeting Store
 *
 * Single source of truth برای state جلسه.
 */
export const useMeetingStore = create((set, get) => ({
    // ─────────────────────────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────────────────────────

    status: MEETING_STATUS.IDLE,
    error: null,
    renegotiationTick: 0,

    // ─────────────────────────────────────────────────────────────
    // ROOM
    // ─────────────────────────────────────────────────────────────

    roomName: null,
    localParticipantId: null,

    // ─────────────────────────────────────────────────────────────
    // PARTICIPANTS
    // ─────────────────────────────────────────────────────────────

    participants: new Map(),
    activeSpeakerId: null,

    // state اولیه:
    isRecording: false,
    recordingSeconds: 0,


    // ─────────────────────────────────────────────────────────────
    // TRACKS
    // ─────────────────────────────────────────────────────────────

    tracks: new Map(),

    // ─────────────────────────────────────────────────────────────
    // LOCAL MEDIA
    // ─────────────────────────────────────────────────────────────

    isAudioMuted: true,
    isVideoMuted: true,
    isScreenSharing: false,

    // ─────────────────────────────────────────────────────────────
    // SETTINGS
    // ─────────────────────────────────────────────────────────────

    isSettingsOpen: false,
    selectedAudioOutputId: null,

    // ─────────────────────────────────────────────────────────────
    // MEETING MUTE
    // ─────────────────────────────────────────────────────────────

    isMeetingMuted: false,

    // ─────────────────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────────────────

    messages: [],
    unreadCount: 0,
    isChatOpen: false,

    // ─────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────

    isPanelOpen: false,
    activePanelTab: 'participants',

    // =============================================================
    // INTERNAL ACTIONS
    // =============================================================

    _setStatus: (status) =>
        set({
            status,
            error: null,
        }),

    _setError: (error) =>
        set({
            error,
            status: MEETING_STATUS.FAILED,
        }),

    _setLocalParticipantId: (id) =>
        set({
            localParticipantId: id,
        }),

    // ─────────────────────────────────────────────────────────────
    // PARTICIPANT ADD
    // ─────────────────────────────────────────────────────────────

    _addParticipant: (participant) =>
        set((state) => {
            if (!participant?.id) {
                return {}
            }

            const next = new Map(state.participants)

            const existing = next.get(participant.id)

            next.set(
                participant.id,
                existing
                    ? {
                        ...existing,
                        ...participant,
                    }
                    : {
                        id: participant.id,
                        displayName:
                            participant.displayName ||
                            'شرکت‌کننده',

                        isLocal:
                            participant.isLocal ??
                            participant.id === state.localParticipantId,

                        isAudioMuted:
                            participant.isAudioMuted ?? true,

                        isVideoMuted:
                            participant.isVideoMuted ?? true,

                        isScreenSharing:
                            participant.isScreenSharing ?? false,

                        isModerator:
                            participant.isModerator ?? false,

                        isActiveSpeaker:
                            participant.isActiveSpeaker ?? false,
                    }
            )

            return {
                participants: next,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // PARTICIPANT REMOVE
    // ─────────────────────────────────────────────────────────────

    _removeParticipant: (participantId) =>
        set((state) => {
            if (!participantId) {
                return {}
            }

            const participants = new Map(state.participants)
            participants.delete(participantId)

            const tracks = new Map(state.tracks)

            for (const [key, track] of tracks) {
                if (track.participantId === participantId) {
                    tracks.delete(key)
                }
            }

            const activeSpeakerId =
                state.activeSpeakerId === participantId
                    ? null
                    : state.activeSpeakerId

            return {
                participants,
                tracks,
                activeSpeakerId,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // PARTICIPANT UPDATE
    // ─────────────────────────────────────────────────────────────

    _updateParticipant: (participantId, updates) =>
        set((state) => {
            if (!participantId) {
                return {}
            }

            const participant =
                state.participants.get(participantId)

            if (!participant) {
                return {}
            }

            const next = new Map(state.participants)

            next.set(participantId, {
                ...participant,
                ...updates,
            })

            return {
                participants: next,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // ACTIVE SPEAKER
    // ─────────────────────────────────────────────────────────────
    // اکشن‌ها (کنار بقیه‌ی _set...):
    _setRecording: (isRecording) => set({isRecording, recordingSeconds: 0}),
    _incrementRecordingSeconds: () => set((state) => ({recordingSeconds: state.recordingSeconds + 1})),

    _setActiveSpeaker: (participantId) =>
        set((state) => {
            const next = new Map(state.participants)

            // قبلی‌ها را reset کن
            for (const [id, participant] of next) {
                if (participant.isActiveSpeaker) {
                    next.set(id, {
                        ...participant,
                        isActiveSpeaker: false,
                    })
                }
            }

            // جدید را active کن
            if (participantId) {
                const participant = next.get(participantId)

                if (participant) {
                    next.set(participantId, {
                        ...participant,
                        isActiveSpeaker: true,
                    })
                }
            }

            return {
                activeSpeakerId: participantId || null,
                participants: next,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // TRACK ADD
    // ─────────────────────────────────────────────────────────────

    _addTrack: (track) =>
        set((state) => {
            if (!track?.participantId || !track?.type) {
                return {}
            }

            const key =
                `${track.participantId}-${track.type}`

            const tracks = new Map(state.tracks)

            tracks.set(key, track)

            /**
             * Track اضافه شد.
             *
             * همزمان participant را sync می‌کنیم.
             */
            const participants =
                new Map(state.participants)

            const participantId =
                track.isLocal
                    ? state.localParticipantId
                    : track.participantId

            if (participantId) {
                const participant =
                    participants.get(participantId)

                if (participant) {
                    const updates = {}

                    if (track.type === 'audio') {
                        updates.isAudioMuted =
                            !!track.isMuted
                    }

                    if (
                        track.type === 'video' ||
                        track.type === 'desktop'
                    ) {
                        updates.isVideoMuted =
                            !!track.isMuted
                    }

                    if (track.type === 'desktop') {
                        updates.isScreenSharing = true
                    }

                    participants.set(
                        participantId,
                        {
                            ...participant,
                            ...updates,
                        }
                    )
                }
            }

            /**
             * Local state
             */
            const localUpdates = {}

            if (track.isLocal) {
                if (track.type === 'audio') {
                    localUpdates.isAudioMuted =
                        !!track.isMuted
                }

                if (track.type === 'video') {
                    localUpdates.isVideoMuted =
                        !!track.isMuted
                }

                if (track.type === 'desktop') {
                    localUpdates.isScreenSharing = true
                }
            }

            return {
                tracks,
                participants,
                ...localUpdates,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // TRACK REMOVE
    // ─────────────────────────────────────────────────────────────

    _removeTrack: (track) =>
        set((state) => {
            if (!track?.participantId || !track?.type) {
                return {}
            }

            const key =
                `${track.participantId}-${track.type}`

            const tracks = new Map(state.tracks)

            tracks.delete(key)

            const participants =
                new Map(state.participants)

            const participantId =
                track.isLocal
                    ? state.localParticipantId
                    : track.participantId

            if (participantId) {
                const participant =
                    participants.get(participantId)

                if (participant) {
                    const updates = {}

                    if (track.type === 'audio') {
                        updates.isAudioMuted = true
                    }

                    if (track.type === 'video') {
                        updates.isVideoMuted = true
                    }

                    if (track.type === 'desktop') {
                        updates.isScreenSharing = false
                    }

                    participants.set(
                        participantId,
                        {
                            ...participant,
                            ...updates,
                        }
                    )
                }
            }

            const localUpdates = {}

            if (track.isLocal) {
                if (track.type === 'audio') {
                    localUpdates.isAudioMuted = true
                }

                if (track.type === 'video') {
                    localUpdates.isVideoMuted = true
                }

                if (track.type === 'desktop') {
                    localUpdates.isScreenSharing = false
                }
            }

            return {
                tracks,
                participants,
                ...localUpdates,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // TRACK MUTE / UNMUTE
    //
    // مهم‌ترین بخش Real-time
    // ─────────────────────────────────────────────────────────────

    _updateTrackMute: (track) =>
        set((state) => {
            if (!track?.participantId || !track?.type) {
                return {}
            }

            const key =
                `${track.participantId}-${track.type}`

            const tracks = new Map(state.tracks)

            const existing = tracks.get(key)

            /**
             * اگر track قبلاً در store نبود،
             * باز هم وضعیت participant را update می‌کنیم.
             */
            if (existing) {
                tracks.set(key, {
                    ...existing,
                    isMuted: !!track.isMuted,
                })
            } else {
                tracks.set(key, track)
            }

            // ─────────────────────────────────────────────
            // Participant sync
            // ─────────────────────────────────────────────

            const participants =
                new Map(state.participants)

            const participantId =
                track.isLocal
                    ? state.localParticipantId
                    : track.participantId

            if (participantId) {
                const participant =
                    participants.get(participantId)

                if (participant) {
                    const updates = {}

                    if (track.type === 'audio') {
                        updates.isAudioMuted =
                            !!track.isMuted
                    }

                    if (track.type === 'video') {
                        updates.isVideoMuted =
                            !!track.isMuted
                    }

                    if (track.type === 'desktop') {
                        updates.isScreenSharing =
                            !track.isMuted
                    }

                    participants.set(
                        participantId,
                        {
                            ...participant,
                            ...updates,
                        }
                    )
                }
            }

            // ─────────────────────────────────────────────
            // Local sync
            // ─────────────────────────────────────────────

            const localUpdates = {}

            if (track.isLocal) {
                if (track.type === 'audio') {
                    localUpdates.isAudioMuted =
                        !!track.isMuted
                }

                if (track.type === 'video') {
                    localUpdates.isVideoMuted =
                        !!track.isMuted
                }
            }

            return {
                tracks,
                participants,
                ...localUpdates,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // SCREEN SHARE
    // ─────────────────────────────────────────────────────────────


// اکشن جدید:
    _bumpRenegotiationTick: () => set((state) => ({renegotiationTick: state.renegotiationTick + 1})),
    _setScreenSharing: (enabled, track = null) =>
        set((state) => {
            const participants =
                new Map(state.participants)

            const localId =
                state.localParticipantId

            if (localId) {
                const participant =
                    participants.get(localId)

                if (participant) {
                    participants.set(localId, {
                        ...participant,
                        isScreenSharing: enabled,
                    })
                }
            }

            return {
                isScreenSharing: enabled,
                participants,
            }
        }),

    // ─────────────────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────────────────

    _addMessage: (message) =>
        set((state) => ({
            messages: [
                ...state.messages,
                message,
            ],

            unreadCount:
                state.isChatOpen
                    ? 0
                    : state.unreadCount + 1,
        })),

    // =============================================================
    // PUBLIC UI ACTIONS
    // =============================================================

    togglePanel: (tab) =>
        set((state) => {
            if (
                state.activePanelTab === tab &&
                state.isPanelOpen
            ) {
                return {
                    isPanelOpen: false,
                }
            }

            return {
                isPanelOpen: true,
                activePanelTab: tab,
            }
        }),

    toggleMeetingMute: () =>
        set((state) => ({
            isMeetingMuted:
                !state.isMeetingMuted,
        })),

    openSettings: () =>
        set({
            isSettingsOpen: true,
        }),

    closeSettings: () =>
        set({
            isSettingsOpen: false,
        }),

    setSelectedAudioOutputId: (id) =>
        set({
            selectedAudioOutputId: id,
        }),

    openChat: () =>
        set({
            isPanelOpen: true,
            activePanelTab: 'chat',
            unreadCount: 0,
            isChatOpen: true,
        }),

    closePanel: () =>
        set({
            isPanelOpen: false,
            isChatOpen: false,
        }),

    // =============================================================
    // RESET
    // =============================================================

    resetMeeting: () =>
        set({
            status: MEETING_STATUS.IDLE,
            error: null,

            roomName: null,
            localParticipantId: null,

            participants: new Map(),
            activeSpeakerId: null,

            tracks: new Map(),

            isAudioMuted: true,
            isVideoMuted: true,
            isScreenSharing: false,

            isSettingsOpen: false,
            selectedAudioOutputId: null,

            isMeetingMuted: false,

            messages: [],
            unreadCount: 0,
            isChatOpen: false,

            isPanelOpen: false,
            activePanelTab: 'participants',
        }),
}))