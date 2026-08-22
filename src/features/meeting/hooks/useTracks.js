import { useMeetingStore } from '../store/meeting-store'
import { selectLocalAudioTrack, selectLocalVideoTrack } from '../store/meeting-selectors'

/**
 * track های local کاربر
 */
export function useLocalTracks() {
  const audioTrack = useMeetingStore(selectLocalAudioTrack)
  const videoTrack = useMeetingStore(selectLocalVideoTrack)
  return { audioTrack, videoTrack }
}

/**
 * track های یک participant خاص
 * @param {string} participantId
 */
export function useParticipantTracks(participantId) {
  const isLocal = useMeetingStore((s) => s.localParticipantId === participantId)
  const key = isLocal ? 'local' : participantId

  const audioTrack = useMeetingStore(
    (s) => s.tracks.get(`${key}-audio`) ?? null
  )
  const videoTrack = useMeetingStore(
    (s) => s.tracks.get(`${key}-video`) ?? null
  )
  const desktopTrack = useMeetingStore(
    (s) => s.tracks.get(`${key}-desktop`) ?? null
  )
  return { audioTrack, videoTrack, desktopTrack }
}