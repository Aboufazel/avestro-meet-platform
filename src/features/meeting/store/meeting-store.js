import {create} from 'zustand'
import {MEETING_STATUS} from '../jitsi/jitsi-events.js'

/**
 * Meeting Store
 *
 * تنها منبع حقیقت برای state جلسه.
 * فقط از طریق meeting-actions.js باید تغییر کند.
 */
export const useMeetingStore = create((set, get) => ({
    // ─── Status ────────────────────────────────────────────────────────────
    status: MEETING_STATUS.IDLE,
    error: null,

    // ─── Room ──────────────────────────────────────────────────────────────
    roomName: null,
    localParticipantId: null,

    // ─── Participants ──────────────────────────────────────────────────────
    /** @type {Map<string, import('../jitsi/jitsi-mappers.js').AppParticipant>} */
    participants: new Map(),
    activeSpeakerId: null,

    // ─── Tracks ────────────────────────────────────────────────────────────
    /** @type {Map<string, import('../jitsi/jitsi-mappers.js').AppTrack>} */
    tracks: new Map(),

    // ─── Local media ───────────────────────────────────────────────────────
    isAudioMuted: true,
    isVideoMuted: true,
    isScreenSharing: false,
    isSettingsOpen: false,
    selectedAudioOutputId: null,

    // ─── Chat ──────────────────────────────────────────────────────────────
    /** @type {import('../jitsi/jitsi-mappers.js').AppMessage[]} */
    messages: [],
    unreadCount: 0,
    isChatOpen: false,

    // ─── UI ────────────────────────────────────────────────────────────────
    isPanelOpen: false,
    activePanelTab: 'participants', // 'participants' | 'chat'

    // ─── Actions (internal) ────────────────────────────────────────────────

    _setStatus: (status) => set({status, error: null}),

    _setError: (error) => set({error, status: MEETING_STATUS.FAILED}),

    _setLocalParticipantId: (id) => set({localParticipantId: id}),

    _addParticipant: (participant) =>
        set((state) => {
            const next = new Map(state.participants)
            next.set(participant.id, participant)
            return {participants: next}
        }),

    _removeParticipant: (participantId) =>
        set((state) => {
            const next = new Map(state.participants)
            next.delete(participantId)
            // حذف track های مربوطه
            const tracks = new Map(state.tracks)
            for (const [key, track] of tracks) {
                if (track.participantId === participantId) tracks.delete(key)
            }
            return {participants: next, tracks}
        }),

    _updateParticipant: (participantId, updates) =>
        set((state) => {
            const participant = state.participants.get(participantId)
            if (!participant) return {}
            const next = new Map(state.participants)
            next.set(participantId, {...participant, ...updates})
            return {participants: next}
        }),

    _setActiveSpeaker: (participantId) => set({activeSpeakerId: participantId}),

    _addTrack: (track) =>
        set((state) => {
            const key = `${track.participantId}-${track.type}`
            const next = new Map(state.tracks)
            next.set(key, track)
            return {tracks: next}
        }),

    _removeTrack: (track) =>
        set((state) => {
            const key = `${track.participantId}-${track.type}`
            const next = new Map(state.tracks)
            next.delete(key)
            return {tracks: next}
        }),

    _updateTrackMute: (track) =>
        set((state) => {
            const key = `${track.participantId}-${track.type}`
            const existing = state.tracks.get(key)
            if (!existing) return {}
            const next = new Map(state.tracks)
            next.set(key, {...existing, isMuted: track.isMuted})

            // آپدیت وضعیت mute در local state
            if (track.isLocal) {
                if (track.type === 'audio') return {tracks: next, isAudioMuted: track.isMuted}
                if (track.type === 'video') return {tracks: next, isVideoMuted: track.isMuted}
            }
            return {tracks: next}
        }),

    _addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
            unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1,
        })),

    // ─── UI Actions (public) ────────────────────────────────────────────────

    togglePanel: (tab) =>
        set((state) => {
            if (state.activePanelTab === tab && state.isPanelOpen) {
                return {isPanelOpen: false}
            }
            return {isPanelOpen: true, activePanelTab: tab}
        }),

    openSettings: () => set({isSettingsOpen: true}),
    closeSettings: () => set({isSettingsOpen: false}),
    setSelectedAudioOutputId: (id) => set({selectedAudioOutputId: id}),
    openChat: () =>
        set({isPanelOpen: true, activePanelTab: 'chat', unreadCount: 0, isChatOpen: true}),

    closePanel: () => set({isPanelOpen: false, isChatOpen: false}),

    resetMeeting: () =>
        set({
            status: MEETING_STATUS.IDLE,
            error: null,
            roomName: null,
            isSettingsOpen: false,
            localParticipantId: null,
            participants: new Map(),
            activeSpeakerId: null,
            tracks: new Map(),
            isAudioMuted: true,
            isVideoMuted: true,
            isScreenSharing: false,
            messages: [],
            unreadCount: 0,
            isChatOpen: false,
            isPanelOpen: false,
        }),
}))