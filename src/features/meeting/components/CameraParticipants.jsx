import { memo } from 'react'
import { VideoTile } from './VideoTile'

export const CameraParticipants = memo(function CameraParticipants({ participants }) {
  if (!participants?.length) return null

  return (
    <section className="meeting-camera-section" aria-label="دوربین‌های روشن">
      <div className="meeting-section-label">دوربین</div>
      <div className="meeting-camera-grid">
        {participants.map((participant) => (
          <div key={participant.id} className="meeting-camera-tile">
            <VideoTile participantId={participant.id} />
          </div>
        ))}
      </div>
    </section>
  )
})
