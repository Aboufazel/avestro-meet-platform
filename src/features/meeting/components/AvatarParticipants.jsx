import { memo } from 'react'

export const AvatarParticipants = memo(function AvatarParticipants({ participants }) {
  if (!participants?.length) return null

  return (
    <section className="meeting-avatar-section" aria-label="شرکت‌کنندگان بدون دوربین و میکروفون">
      <div className="meeting-section-label">بدون تصویر و صدا</div>
      <div className="meeting-avatar-row">
        {participants.map((participant) => {
          const initial = participant.displayName?.trim()?.[0]?.toUpperCase() || '?'
          return (
            <div key={participant.id} className="meeting-avatar-item" title={participant.displayName}>
              <div className="meeting-avatar-circle">{initial}</div>
              <span>{participant.displayName || 'شرکت‌کننده'}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
})
