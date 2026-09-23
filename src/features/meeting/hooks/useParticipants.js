import { useMemo } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import {
  selectActiveSpeakerId,
  selectLocalParticipantId,
} from '../store/meeting-selectors'

function decorateParticipant(p, activeSpeakerId, localId) {
  return {
    ...p,
    isActiveSpeaker: p.id === activeSpeakerId,
    isLocal: p.id === localId || p.isLocal === true,
    hasVideo: !p.isVideoMuted,
  }
}

export function useParticipants() {
  const participantsMap = useMeetingStore((s) => s.participants)
  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)
  const localId = useMeetingStore(selectLocalParticipantId)

  const participants = useMemo(
    () =>
      Array.from(participantsMap.values()).map((p) =>
        decorateParticipant(p, activeSpeakerId, localId)
      ),
    [participantsMap, activeSpeakerId, localId]
  )

  const layout = useMemo(() => {
    const speakerParticipants = []
    const cameraParticipants = []
    const avatarParticipants = []

    for (const participant of participants) {
      if (!participant.isAudioMuted) {
        speakerParticipants.push(participant)
      } else if (participant.hasVideo || participant.isScreenSharing) {
        cameraParticipants.push(participant)
      } else {
        avatarParticipants.push(participant)
      }
    }

    return {
      speakerParticipants,
      cameraParticipants,
      avatarParticipants,
    }
  }, [participants])

  return {
    participants,
    count: participants.length,
    ...layout,
  }
}

export function useParticipant(participantId) {
  const participant = useMeetingStore(
    (state) => state.participants.get(participantId)
  )
  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)
  const localId = useMeetingStore(selectLocalParticipantId)

  return useMemo(() => {
    if (!participant) return null
    return decorateParticipant(participant, activeSpeakerId, localId)
  }, [participant, activeSpeakerId, localId])
}
