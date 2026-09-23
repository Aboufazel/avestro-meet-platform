import { memo } from 'react'
import { VideoTile } from './VideoTile'

function EmptySlot() {
  return (
    <div className="meeting-empty-video-slot" aria-hidden="true">
      <div className="meeting-empty-video-slot__inner" />
    </div>
  )
}

export const SpeakerStage = memo(function SpeakerStage({ participants = [] }) {
  if (!participants.length) return null

  const emptyCount = Math.max(0, 3 - participants.length)

  return (
    <section
      className={`meeting-speaker-stage ${participants.length === 1 ? 'is-single' : ''}`}
      aria-label="افراد دارای میکروفون روشن"
    >
      <div className="meeting-stage-header">
        <span className="meeting-stage-dot" />
        <span>{participants.length} نفر با میکروفون روشن</span>
      </div>

      <div
        className="meeting-speaker-grid"
        data-count={participants.length}
        data-layout={participants.length <= 3 ? 'stable-three' : 'multi-row'}
      >
        {participants.map((participant) => (
          <div key={participant.id} className="meeting-speaker-tile">
            <VideoTile participantId={participant.id} />
          </div>
        ))}

        {Array.from({ length: emptyCount }).map((_, index) => (
          <EmptySlot key={`speaker-empty-${index}`} />
        ))}
      </div>
    </section>
  )
})
