import { memo, useMemo, useEffect } from 'react'
import { useParticipants } from '../hooks/useParticipants'
import { useMeetingStore } from '../store/meeting-store'
import { selectActiveSpeakerId, selectPinnedParticipantId } from '../store/meeting-selectors'
import { VideoTile } from './VideoTile'
import { jitsiController } from '../jitsi/JitsiController'

function useFeaturedParticipants(participants, activeSpeakerId, pinnedId) {
  return useMemo(() => {
    if (pinnedId) {
      const pinned = participants.filter((p) => p.id === pinnedId)
      if (pinned.length) return { featured: pinned, rest: participants.filter((p) => p.id !== pinnedId) }
    }
    const screenSharers = participants.filter((p) => p.isScreenSharing)
    if (screenSharers.length) return { featured: screenSharers, rest: participants.filter((p) => !p.isScreenSharing) }
    const featuredIds = new Set()
    if (activeSpeakerId) featuredIds.add(activeSpeakerId)
    participants.forEach((p) => { if (!p.isAudioMuted) featuredIds.add(p.id) })
    return { featured: participants.filter((p) => featuredIds.has(p.id)), rest: participants.filter((p) => !featuredIds.has(p.id)) }
  }, [participants, activeSpeakerId, pinnedId])
}

export const VideoGrid = memo(function VideoGrid() {
  const { participants, count } = useParticipants()
  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)
  const pinnedParticipantId = useMeetingStore(selectPinnedParticipantId)
  const { featured, rest } = useFeaturedParticipants(participants, activeSpeakerId, pinnedParticipantId)

  // Mobile deliberately has one clear "main speaker" and a 2-column gallery.
  // This prevents the horizontal participant strip from making the room feel cramped.
  const mobileFeatured = useMemo(() => {
    if (!participants.length) return null
    if (pinnedParticipantId) {
      const pinned = participants.find((p) => p.id === pinnedParticipantId)
      if (pinned) return pinned
    }
    const screenSharer = participants.find((p) => p.isScreenSharing)
    if (screenSharer) return screenSharer
    const speaker = participants.find((p) => p.id === activeSpeakerId)
    if (speaker) return speaker
    return participants.find((p) => p.isLocal) || participants[0]
  }, [participants, pinnedParticipantId, activeSpeakerId])

  const mobileRest = useMemo(
    () => participants.filter((p) => p.id !== mobileFeatured?.id),
    [participants, mobileFeatured]
  )

  useEffect(() => {
    const featuredIds = featured.map((p) => p.id).filter((id) => id && !participants.find((p) => p.id === id)?.isLocal)
    jitsiController.setPreferredParticipants(featuredIds)
  }, [featured, participants])

  if (count === 0) return <div className="h-full flex items-center justify-center text-white/35 text-sm">در حال انتظار برای اتصال...</div>

  if (count === 1) {
    return <div className="h-full min-h-0 p-2 sm:p-3"><VideoTile participantId={participants[0].id} isLarge /></div>
  }

  return (
    <div className="h-full min-h-0 p-2 sm:p-3">
      {/* Mobile: one featured speaker on top + a breathing 2-column gallery below. */}
      <div className="md:hidden h-full min-h-0 flex flex-col gap-2.5 overflow-y-auto room-no-scrollbar pb-20">
        {mobileFeatured && (
          <div className="shrink-0 h-[46vh] min-h-[250px] max-h-[430px]">
            <VideoTile
              participantId={mobileFeatured.id}
              isLarge
              isPinned={pinnedParticipantId === mobileFeatured.id}
            />
          </div>
        )}
        {mobileRest.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            {mobileRest.map((p) => (
              <div key={p.id} className="min-w-0 aspect-[4/3]">
                <VideoTile participantId={p.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop/tablet: keep the existing featured + participant strip behavior. */}
      <div className="hidden md:flex h-full flex-col gap-2.5 min-h-0">
        <div className={`grid ${featured.length <= 1 ? 'grid-cols-1' : featured.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-2.5 flex-1 min-h-0`}>
          {featured.length > 0 ? featured.map((p) => (
            <VideoTile key={p.id} participantId={p.id} isLarge isPinned={pinnedParticipantId === p.id} />
          )) : participants.map((p) => (
            <VideoTile key={p.id} participantId={p.id} />
          ))}
        </div>
        {rest.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto h-[92px] sm:h-[118px] shrink-0 room-no-scrollbar pb-0.5">
            {rest.map((p) => <div key={p.id} className="w-[150px] sm:w-[190px] shrink-0"><VideoTile participantId={p.id} /></div>)}
          </div>
        )}
      </div>
    </div>
  )
})
