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
  const audioTrack = useMeetingStore(
    (s) => s.tracks.get(`${participantId}-audio`) ?? null
  )
  const videoTrack = useMeetingStore(
    (s) => s.tracks.get(`${participantId}-video`) ?? null
  )
  const desktopTrack = useMeetingStore(
    (s) => s.tracks.get(`${participantId}-desktop`) ?? null
  )
  return { audioTrack, videoTrack, desktopTrack }
}