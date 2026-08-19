import { memo, useMemo } from 'react'
import { useParticipants } from '../hooks/useParticipants'
import { useMeetingStore } from '../store/meeting-store'
import { selectActiveSpeakerId } from '../store/meeting-selectors'
import { VideoTile } from './VideoTile'

export const VideoGrid = memo(function VideoGrid() {
  const { participants, count } = useParticipants()
  const activeSpeakerId = useMeetingStore(selectActiveSpeakerId)

  const gridClass = useMemo(() => {
    if (count <= 1) return 'grid-cols-1'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 9) return 'grid-cols-3'
    return 'grid-cols-4'
  }, [count])

  if (count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-olive-500">
          در حال انتظار برای اتصال...
        </span>
      </div>
    )
  }

  const speakerLayout = count > 2 && activeSpeakerId

  if (speakerLayout) {
    const speaker =
      participants.find((p) => p.id === activeSpeakerId) ||
      participants[0]

    const others = participants.filter(
      (p) => p.id !== speaker.id
    )

    return (
      <div className="h-full flex flex-col gap-2 p-2">
        <div className="flex-1 min-h-0">
          <VideoTile
            participantId={speaker.id}
            isLarge
          />
        </div>

        {others.length > 0 && (
          <div className="flex gap-2 overflow-x-auto h-28 shrink-0">
            {others.map((participant) => (
              <div
                key={participant.id}
                className="w-44 shrink-0"
              >
                <VideoTile
                  participantId={participant.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`grid ${gridClass} gap-2 p-2 h-full`}>
      {participants.map((participant) => (
        <VideoTile
          key={participant.id}
          participantId={participant.id}
        />
      ))}
    </div>
  )
})