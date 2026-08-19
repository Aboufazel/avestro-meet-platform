/**
 * تنظیمات اتصال به سرور Jitsi
 * هیچ مقداری نباید اینجا هاردکد بشه — همه از env میان
 */

const JITSI_HOST = import.meta.env.VITE_JITSI_HOST || 'meet.avestro.ir'
const JITSI_INTERNAL_DOMAIN = 'meet.jitsi'

export const CONNECTION_CONFIG = {
  hosts: {
    domain: JITSI_INTERNAL_DOMAIN,
    muc: `conference.${JITSI_INTERNAL_DOMAIN}`,
    focus: `focus.${JITSI_INTERNAL_DOMAIN}`,
  },
  serviceUrl: `wss://${JITSI_HOST}/xmpp-websocket`,
  clientNode: 'https://jitsi.org/jitmeet',
}

export const CONFERENCE_CONFIG = {
  // کیفیت ویدیو
  maxFullResolutionParticipants: 2,
  resolution: 720,
  constraints: {
    video: {
      height: { ideal: 720, max: 720, min: 180 },
    },
  },

  // پرفرمنس
  disableSimulcast: false,
  enableLayerSuspension: true,
  p2p: { enabled: false },

  // صدا
  disableAP: false,
  enableNoisyMicDetection: true,
  enableNoAudioDetection: true,
  audioQuality: {
    stereo: false,
    opusDtx: true,
  },

  // UI
  prejoinPageEnabled: false,
  disableDeepLinking: true,
  disableInviteFunctions: true,
}

export const TRACK_CONFIG = {
  devices: ['audio', 'video'],
  constraints: {
    video: {
      facingMode: 'user',
      height: { ideal: 720, max: 720, min: 180 },
    },
  },
}