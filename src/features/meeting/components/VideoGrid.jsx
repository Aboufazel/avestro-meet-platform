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

  useEffect(() => {
    const featuredIds = featured.map((p) => p.id).filter((id) => id && !participants.find((p) => p.id === id)?.isLocal)
    jitsiController.setPreferredParticipants(featuredIds)
  }, [featured, participants])

  if (count === 0) return <div className="h-full flex items-center justify-center text-white/35 text-sm">در حال انتظار برای اتصال...</div>

  if (count === 1) return <div className="h-full min-h-0 p-2 sm:p-3"><VideoTile participantId={participants[0].id} isLarge /></div>

  if (featured.length === 0) {
    const gridClass = count <= 4 ? 'grid-cols-2' : count <= 9 ? 'grid-cols-3' : 'grid-cols-4'
    return <div className={`grid ${gridClass} gap-2 p-2 sm:p-3 h-full min-h-0`}>{participants.map((p) => <VideoTile key={p.id} participantId={p.id} />)}</div>
  }

  return <div className="h-full flex flex-col gap-2.5 p-2 sm:p-3 min-h-0">
    <div className={`grid ${featured.length <= 1 ? 'grid-cols-1' : featured.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-2.5 flex-1 min-h-0`}>
      {featured.map((p) => <VideoTile key={p.id} participantId={p.id} isLarge isPinned={pinnedParticipantId === p.id} />)}
    </div>
    {rest.length > 0 && <div className="flex gap-2.5 overflow-x-auto h-[92px] sm:h-[118px] shrink-0 room-no-scrollbar pb-0.5">{rest.map((p) => <div key={p.id} className="w-[150px] sm:w-[190px] shrink-0"><VideoTile participantId={p.id} /></div>)}</div>}
  </div>
})
