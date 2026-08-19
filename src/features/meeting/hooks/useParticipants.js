import { useMemo } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import {
  selectParticipantList,
  selectParticipantCount,
  selectLocalParticipantId,
  selectActiveSpeakerId,
} from '../store/meeting-selectors'

/**
 * لیست کامل شرکت‌کنندگان با active speaker مشخص شده
 */
export function useParticipants() {
  const participantsMap = useMeetingStore(
    (s) => s.participants
  )

  const activeSpeakerId = useMeetingStore(
    selectActiveSpeakerId
  )

  const localId = useMeetingStore(
    selectLocalParticipantId
  )

  const count = participantsMap.size

  const participants = useMemo(() => {
    return Array.from(participantsMap.values()).map((p) => ({
      ...p,
      isActiveSpeaker: p.id === activeSpeakerId,
      isLocal: p.id === localId,
    }))
  }, [participantsMap, activeSpeakerId, localId])

  return {
    participants,
    count,
  }
}

/**
 * اطلاعات یک شرکت‌کننده خاص
 * @param {string} participantId
 */
export function useParticipant(participantId) {
  const participant = useMeetingStore(
    (state) => state.participants.get(participantId)
  )

  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)
  const localId = useMeetingStore(selectLocalParticipantId)

  return useMemo(() => {
    if (!participant) return null

    return {
      ...participant,
      isActiveSpeaker: participant.id === activeSpeakerId,
      isLocal: participant.id === localId,
    }
  }, [participant, activeSpeakerId, localId])
}