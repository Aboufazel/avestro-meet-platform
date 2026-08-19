/**
 * Selectors برای meeting-store
 *
 * هر selector فقط بخش مورد نیاز state رو می‌گیره تا re-render کمتر بشه.
 * استفاده: const status = useMeetingStore(selectStatus)
 */

export const selectStatus = (s) => s.status
export const selectError = (s) => s.error
export const selectRoomName = (s) => s.roomName
export const selectLocalParticipantId = (s) => s.localParticipantId

export const selectParticipants = (s) => s.participants
export const selectActiveSpeakerId = (s) => s.activeSpeakerId

export const selectTracks = (s) => s.tracks

export const selectIsAudioMuted = (s) => s.isAudioMuted
export const selectIsVideoMuted = (s) => s.isVideoMuted
export const selectIsScreenSharing = (s) => s.isScreenSharing

export const selectMessages = (s) => s.messages
export const selectUnreadCount = (s) => s.unreadCount
export const selectIsChatOpen = (s) => s.isChatOpen

export const selectIsPanelOpen = (s) => s.isPanelOpen
export const selectActivePanelTab = (s) => s.activePanelTab

// ─── Derived selectors ──────────────────────────────────────────────────────

/** لیست array از participants */
export const selectParticipantList = (s) => Array.from(s.participants.values())

/** تعداد شرکت‌کنندگان */
export const selectParticipantCount = (s) => s.participants.size

/** track یک participant خاص */
export const selectParticipantTrack = (participantId, type) => (s) =>
  s.tracks.get(`${participantId}-${type}`)

/** track های local */
export const selectLocalAudioTrack = (s) => s.tracks.get('local-audio')
export const selectLocalVideoTrack = (s) => s.tracks.get('local-video')

/** participant فعال (active speaker) */
export const selectActiveSpeaker = (s) =>
  s.activeSpeakerId ? s.participants.get(s.activeSpeakerId) : null

/** آیا جلسه در حال اتصال است */
export const selectIsConnecting = (s) =>
  s.status === 'initializing' || s.status === 'connecting'

/** آیا جلسه متصل است */
export const selectIsConnected = (s) => s.status === 'connected'

/** آیا جلسه در حال خروج است */
export const selectIsLeaving = (s) =>
  s.status === 'leaving' || s.status === 'left'