import { memo } from 'react'
import { VideoTile } from './VideoTile'

export const SpeakerStage = memo(function SpeakerStage({ participants }) {
  if (!participants?.length) return null

  return (
    <section className="meeting-speaker-stage" aria-label="افراد دارای میکروفون روشن">
      <div className="meeting-stage-header">
        <span className="meeting-stage-dot" />
        <span>{participants.length} نفر در حال صحبت</span>
      </div>
      <div className={`meeting-speaker-grid count-${Math.min(participants.length, 6)}`}>
        {participants.map((participant) => (
          <div key={participant.id} className="meeting-speaker-tile">
            <VideoTile participantId={participant.id} />
          </div>
        ))}
      </div>
    </section>
  )
})
