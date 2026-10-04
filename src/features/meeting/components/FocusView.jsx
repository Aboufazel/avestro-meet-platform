import { memo } from 'react'
import { VideoTile } from './VideoTile'

export const FocusView = memo(function FocusView({ participant, isPinned = false, isFocused = false }) {
  if (!participant) return null
  return (
    <section className="meeting-focus-view" aria-label="نمای اصلی">
      <VideoTile
        participantId={participant.id}
        isLarge
        isPinned={isPinned}
        isFocused={isFocused}
      />
    </section>
  )
})
