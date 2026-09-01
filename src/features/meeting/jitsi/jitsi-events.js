/**
 * Application event names — این‌ها event های Jitsi نیستند.
 * JitsiController این event‌ها را emit می‌کند و UI فقط این‌ها را می‌شناسد.
 */
export const JITSI_EVENTS = {
  STATUS_CHANGED: 'statusChanged',

  CONFERENCE_JOINED: 'conferenceJoined',
  CONFERENCE_LEFT: 'conferenceLeft',

  PARTICIPANT_JOINED: 'participantJoined',
  PARTICIPANT_LEFT: 'participantLeft',
  PARTICIPANT_UPDATED: 'participantUpdated',

  TRACK_ADDED: 'trackAdded',
  TRACK_REMOVED: 'trackRemoved',
  TRACK_MUTED: 'trackMuted',
  TRACK_UNMUTED: 'trackUnmuted',

  ACTIVE_SPEAKER_CHANGED: 'activeSpeakerChanged',

  MESSAGE_RECEIVED: 'messageReceived',

  SCREEN_SHARE_STARTED: 'screenShareStarted',
  SCREEN_SHARE_STOPPED: 'screenShareStopped',

  CONNECTION_ESTABLISHED: 'connectionEstablished',
  CONNECTION_INTERRUPTED: 'connectionInterrupted',
  CONNECTION_FAILED: 'connectionFailed',
}

/**
 * Meeting status values
 * @typedef {'idle'|'initializing'|'connecting'|'connected'|'reconnecting'|'leaving'|'left'|'failed'} MeetingStatus
 */
export const MEETING_STATUS = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  LEAVING: 'leaving',
  LEFT: 'left',
  FAILED: 'failed',
}