import { useMemo } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import {
  selectFocusedParticipantId,
  selectPinnedParticipantId,
} from '../store/meeting-selectors'
import { useParticipants } from './useParticipants'

export function useMeetingLayout() {
  const {
    participants,
    speakerParticipants,
    cameraParticipants,
    avatarParticipants,
  } = useParticipants()

  const pinnedId = useMeetingStore(selectPinnedParticipantId)
  const focusedId = useMeetingStore(selectFocusedParticipantId)

  return useMemo(() => {
    const find = (id) =>
      id ? participants.find((p) => p.id === id) || null : null

    const pinnedParticipant = find(pinnedId)
    const focusedParticipant = find(focusedId)

    // Layout priority is independent from active speaker.
    // Pin > explicit Focus > Screen Share > grouped speakers.
    const priorityParticipant =
      pinnedParticipant ||
      focusedParticipant ||
      participants.find((p) => p.isScreenSharing) ||
      null

    const priorityId = priorityParticipant?.id || null

    return {
      pinnedParticipant,
      focusedParticipant,
      priorityParticipant,
      speakers: speakerParticipants.filter((p) => p.id !== priorityId),
      cameraParticipants: cameraParticipants.filter((p) => p.id !== priorityId),
      avatarParticipants: avatarParticipants.filter((p) => p.id !== priorityId),
    }
  }, [
    participants,
    speakerParticipants,
    cameraParticipants,
    avatarParticipants,
    pinnedId,
    focusedId,
  ])
}
