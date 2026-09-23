import { memo } from 'react'
import { VideoTile } from './VideoTile'

function EmptySlot() {
  return (
    <div className="meeting-empty-video-slot" aria-hidden="true">
      <div className="meeting-empty-video-slot__inner" />
    </div>
  )
}

export const CameraParticipants = memo(function CameraParticipants({ participants = [] }) {
  if (!participants.length) return null

  const emptyCount = Math.max(0, 3 - participants.length)

  return (
    <section className="meeting-camera-section" aria-label="دوربین‌های روشن">
      <div className="meeting-section-label">دوربین</div>
      <div
        className="meeting-camera-grid"
        data-count={participants.length}
        data-layout={participants.length <= 3 ? 'stable-three' : 'multi-row'}
      >
        {participants.map((participant) => (
          <div key={participant.id} className="meeting-camera-tile">
            <VideoTile participantId={participant.id} />
          </div>
        ))}

        {Array.from({ length: emptyCount }).map((_, index) => (
          <EmptySlot key={`camera-empty-${index}`} />
        ))}
      </div>
    </section>
  )
})
