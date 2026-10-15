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
 * @property {'active'|'inactive'|'interrupted'|'restoring'|null} streamingStatus
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
/**
 * نوع track برای اپ: 'audio' | 'video' | 'desktop'
 *
 * در lib-jitsi-meet اشتراک صفحه هم یک track از نوع 'video' است؛ فقط
 * getVideoType() مشخص می‌کند 'desktop' است یا 'camera'. استور و UI به نوع
 * 'desktop' تکیه دارند (کلید `${id}-desktop`، isScreenSharing و ...). قبلاً
 * این‌جا فقط getType() برگردانده می‌شد، پس اشتراک صفحه‌ی دیگران هیچ‌وقت
 * به‌عنوان اشتراک صفحه شناخته نمی‌شد و مثل یک دوربین معمولی نمایش داده می‌شد.
 */
function resolveTrackType(jitsiTrack) {
  const type = jitsiTrack.getType()

  if (type === 'video') {
    const videoType =
      typeof jitsiTrack.getVideoType === 'function'
        ? jitsiTrack.getVideoType()
        : jitsiTrack.videoType

    if (videoType === 'desktop') {
      return 'desktop'
    }
  }

  return type
}

export function mapTrack(jitsiTrack) {
  return {
    participantId: jitsiTrack.isLocal()
      ? 'local'
      : jitsiTrack.getParticipantId(),
    type: resolveTrackType(jitsiTrack),
    isMuted: jitsiTrack.isMuted(),
    isLocal: jitsiTrack.isLocal(),
    track: jitsiTrack.getTrack(),
    jitsiTrack,
    streamingStatus:
      typeof jitsiTrack.getTrackStreamingStatus === 'function'
        ? jitsiTrack.getTrackStreamingStatus()
        : null,
  }
}

/**
 * @param {string} participantId
 * @param {string} displayName
 * @param {string} text
 * @returns {AppMessage}
 */
// export function mapMessage(participantId, displayName, text) {
//   return {
//     id: `${participantId}-${Date.now()}`,
//     participantId,
//     displayName: displayName || 'شرکت‌کننده',
//     text,
//     timestamp: Date.now(),
//   }
// }

export function mapMessage(participantId, displayName, text, replyTo = null) {
  return {
    id: `${participantId}-${Date.now()}`,
    participantId,
    displayName: displayName || 'شرکت‌کننده',
    text,
    replyTo,
    timestamp: Date.now(),
  }
}