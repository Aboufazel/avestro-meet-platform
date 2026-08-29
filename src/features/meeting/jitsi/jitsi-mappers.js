/**
 * تبدیل داده‌های خام lib-jitsi-meet به ساختار داده‌ای اپلیکیشن.
 * UI فقط با این ساختارها کار می‌کند — هیچ object خام Jitsi به UI نمی‌رسد.
 */

/**
 * @typedef {Object} AppParticipant
 * @property {string} id
 * @property {string} displayName
 * @property {boolean} isLocal
 * @property {boolean} isAudioMuted
 * @property {boolean} isVideoMuted
 * @property {boolean} isScreenSharing
 * @property {boolean} isModerator
 * @property {boolean} isActiveSpeaker
 */

/**
 * @typedef {Object} AppTrack
 * @property {string} participantId
 * @property {'audio'|'video'|'desktop'} type
 * @property {boolean} isMuted
 * @property {boolean} isLocal
 * @property {MediaStreamTrack} track
 * @property {JitsiTrack} jitsiTrack - فقط برای attach/detach نگه داشته می‌شه
 */

/**
 * @typedef {Object} AppMessage
 * @property {string} id
 * @property {string} participantId
 * @property {string} displayName
 * @property {string} text
 * @property {number} timestamp
 */

/**
 * @param {JitsiParticipant} jitsiParticipant
 * @param {boolean} [isLocal=false]
 * @returns {AppParticipant}
 */
export function mapParticipant(jitsiParticipant, isLocal = false) {
  return {
    id: jitsiParticipant.getId(),
    displayName: jitsiParticipant.getDisplayName() || 'شرکت‌کننده',
    isLocal,
    isAudioMuted: jitsiParticipant.isAudioMuted(),
    isVideoMuted: jitsiParticipant.isVideoMuted(),
    isScreenSharing: false,
    isModerator: jitsiParticipant.isModerator(),
    isActiveSpeaker: false,
    isConnectionInterrupted: false,
    connectionQuality: 100,
  }
}

/**
 * @param {JitsiTrack} jitsiTrack
 * @returns {AppTrack}
 */
export function mapTrack(jitsiTrack) {
  return {
    participantId: jitsiTrack.isLocal()
      ? 'local'
      : jitsiTrack.getParticipantId(),
    type: jitsiTrack.getType(),
    isMuted: jitsiTrack.isMuted(),
    isLocal: jitsiTrack.isLocal(),
    track: jitsiTrack.getTrack(),
    jitsiTrack,
  }
}

/**
 * @param {string} participantId
 * @param {string} displayName
 * @param {string} text
 * @returns {AppMessage}
 */
export function mapMessage(participantId, displayName, text) {
  return {
    id: `${participantId}-${Date.now()}`,
    participantId,
    displayName: displayName || 'شرکت‌کننده',
    text,
    timestamp: Date.now(),
  }
}