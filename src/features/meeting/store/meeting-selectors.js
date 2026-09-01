/**
 * Selectors برای meeting-store
 */

export const selectStatus = (s) => s.status

export const selectError = (s) => s.error

export const selectRoomName = (s) => s.roomName

export const selectLocalParticipantId =
    (s) => s.localParticipantId

// ─────────────────────────────────────────────────────────────
// PARTICIPANTS
// ─────────────────────────────────────────────────────────────

export const selectParticipants =
    (s) => s.participants

export const selectActiveSpeakerId =
    (s) => s.activeSpeakerId

export const selectParticipantList = (s) =>
    Array.from(s.participants.values())

export const selectParticipantCount = (s) =>
    s.participants.size

export const selectParticipant =
    (participantId) =>
        (s) =>
            s.participants.get(participantId) || null

// ─────────────────────────────────────────────────────────────
// TRACKS
// ─────────────────────────────────────────────────────────────

export const selectTracks =
    (s) => s.tracks

export const selectParticipantTrack =
    (participantId, type) =>
        (s) =>
            s.tracks.get(
                `${participantId}-${type}`
            ) || null

export const selectLocalAudioTrack =
    (s) =>
        s.tracks.get('local-audio') || null

export const selectLocalVideoTrack =
    (s) =>
        s.tracks.get('local-video') || null

export const selectLocalDesktopTrack =
    (s) =>
        s.tracks.get('local-desktop') || null

// ─────────────────────────────────────────────────────────────
// ACTIVE SPEAKER
// ─────────────────────────────────────────────────────────────

export const selectActiveSpeaker =
    (s) =>
        s.activeSpeakerId
            ? s.participants.get(
                s.activeSpeakerId
            ) || null
            : null

// ─────────────────────────────────────────────────────────────
// LOCAL MEDIA
// ─────────────────────────────────────────────────────────────

export const selectIsAudioMuted =
    (s) => s.isAudioMuted

export const selectIsVideoMuted =
    (s) => s.isVideoMuted

export const selectIsScreenSharing =
    (s) => s.isScreenSharing

// ─────────────────────────────────────────────────────────────
// MEETING MUTE
// ─────────────────────────────────────────────────────────────

export const selectIsMeetingMuted =
    (s) => s.isMeetingMuted

// ─────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────

export const selectMessages =
    (s) => s.messages

export const selectUnreadCount =
    (s) => s.unreadCount

export const selectIsChatOpen =
    (s) => s.isChatOpen

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────

export const selectIsPanelOpen =
    (s) => s.isPanelOpen

export const selectActivePanelTab =
    (s) => s.activePanelTab

export const selectIsSettingsOpen =
    (s) => s.isSettingsOpen

export const selectSelectedAudioOutputId =
    (s) => s.selectedAudioOutputId

export const selectRenegotiationTick = (s) => s.renegotiationTick

export const selectIsRecording = (s) => s.isRecording
export const selectRecordingSeconds = (s) => s.recordingSeconds

export const selectIsVoiceRecording = (s) => s.isVoiceRecording
export const selectVoiceRecordingSeconds = (s) => s.voiceRecordingSeconds
export const selectReplyingTo = (s) => s.replyingTo
// ─────────────────────────────────────────────────────────────
// CONNECTION
// ─────────────────────────────────────────────────────────────

export const selectIsConnecting =
    (s) =>
        s.status === 'initializing' ||
        s.status === 'connecting'

export const selectIsConnected =
    (s) =>
        s.status === 'connected'

export const selectIsLeaving =
    (s) =>
        s.status === 'leaving' ||
        s.status === 'left'