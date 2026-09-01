import {memo, useMemo} from 'react'
import {useParticipants} from '../hooks/useParticipants'
import {useMeetingStore} from '../store/meeting-store'
import {selectActiveSpeakerId} from '../store/meeting-selectors'
import {VideoTile} from './VideoTile'

/**
 * منطق انتخاب افراد "بالا" (featured):
 * - هرکسی که در حال اشتراک صفحه‌ست (اولویت اول)
 * - سخنران فعلی (active speaker)
 * - هرکسی که میکروفونش الان بازه (در حال صحبت)
 * بقیه می‌رن پایین، کوچیک.
 */
function useFeaturedParticipants(participants, activeSpeakerId) {
    return useMemo(() => {
        const screenSharers = participants.filter((p) => p.isScreenSharing)

        if (screenSharers.length > 0) {
            const others = participants.filter((p) => !p.isScreenSharing)
            return {featured: screenSharers, rest: others}
        }

        const featuredIds = new Set()

        if (activeSpeakerId) featuredIds.add(activeSpeakerId)

        participants.forEach((p) => {
            if (!p.isAudioMuted) featuredIds.add(p.id)
        })

        // if (featuredIds.size === 0 && participants.length > 0) {
        //     featuredIds.add(participants[0].id)
        // }

        const featured = participants.filter((p) => featuredIds.has(p.id))
        const rest = participants.filter((p) => !featuredIds.has(p.id))

        return {featured, rest}
    }, [participants, activeSpeakerId])
}

export const VideoGrid = memo(function VideoGrid() {
  const { participants, count } = useParticipants()
  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)

  const { featured, rest } = useFeaturedParticipants(participants, activeSpeakerId)

  if (count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-olive-500">در حال انتظار برای اتصال...</span>
      </div>
    )
  }

  if (count === 1) {
  return (
    <div className="h-full min-h-0 p-2">
      <VideoTile participantId={participants[0].id} isLarge />
    </div>
  )
}

  // هیچکس featured نیست (کسی صحبت نمی‌کنه) → گرید مساوی معمولی
  if (featured.length === 0) {
  const gridClass = count <= 4 ? 'grid-cols-2' : count <= 9 ? 'grid-cols-3' : 'grid-cols-4'
  return (
    <div className={`grid ${gridClass} gap-2 p-2 h-full min-h-0`}>
      {participants.map((participant) => (
        <VideoTile key={participant.id} participantId={participant.id} />
      ))}
    </div>
  )
}

  const featuredGridClass =
    featured.length <= 1
      ? 'grid-cols-1'
      : featured.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3'

  return (
    <div className="h-full flex flex-col gap-2 p-2 min-h-0">
      <div className={`grid ${featuredGridClass} gap-2 flex-1 min-h-0`}>
        {featured.map((participant) => (
          <VideoTile key={participant.id} participantId={participant.id} isLarge />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="flex gap-2 overflow-x-auto h-36 shrink-0">
          {rest.map((participant) => (
            <div key={participant.id} className="w-52 shrink-0">
              <VideoTile participantId={participant.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})