import { memo, useEffect, useMemo } from 'react'
import { useParticipants } from '../hooks/useParticipants'
import { useMeetingStore } from '../store/meeting-store'
import { VideoTile } from './VideoTile'
import { jitsiController } from '../jitsi/JitsiController'
import { SpeakerStage } from './SpeakerStage'
import { CameraParticipants } from './CameraParticipants'

export const VideoGrid = memo(function VideoGrid() {
  const { participants, count } = useParticipants()

  // Keep layout state local to this component so the Room can boot even if
  // optional layout helper files are missing from an older src copy.
  const activeSpeakerId = useMeetingStore((s) => s.activeSpeakerId ?? null)
  const pinnedParticipantId = useMeetingStore((s) => s.pinnedParticipantId ?? null)
  const focusedParticipantId = useMeetingStore((s) => s.focusedParticipantId ?? null)

  const layout = useMemo(() => {
    const pinnedParticipant =
      pinnedParticipantId
        ? participants.find((p) => p.id === pinnedParticipantId) || null
        : null

    const focusedParticipant =
      focusedParticipantId
        ? participants.find((p) => p.id === focusedParticipantId) || null
        : null

    // Pin > explicit Focus > Screen Share.
    const priorityParticipant =
      pinnedParticipant ||
      focusedParticipant ||
      participants.find((p) => p.isScreenSharing) ||
      null

    const priorityId = priorityParticipant?.id || null
    const speakers = []
    const cameraParticipants = []
    const avatarParticipants = []

    for (const participant of participants) {
      if (participant.id === priorityId) continue

      const micOn = !participant.isAudioMuted
      const hasVideo =
        participant.hasVideo !== undefined
          ? participant.hasVideo
          : !participant.isVideoMuted

      if (micOn) {
        speakers.push(participant)
      } else if (hasVideo || participant.isScreenSharing) {
        cameraParticipants.push(participant)
      } else {
        avatarParticipants.push(participant)
      }
    }

    return {
      priorityParticipant,
      speakers,
      cameraParticipants,
      avatarParticipants,
    }
  }, [participants, pinnedParticipantId, focusedParticipantId])

  const qualityPreferredParticipantId = useMemo(() => {
    // Receive Quality stays independent from visual grouping:
    // Pinned > Screen Share > Active Speaker.
    if (pinnedParticipantId) {
      const pinned = participants.find(
        (p) => p.id === pinnedParticipantId && !p.isLocal
      )
      if (pinned) return pinned.id
    }

    const screenSharer = participants.find(
      (p) => p.isScreenSharing && !p.isLocal
    )
    if (screenSharer) return screenSharer.id

    if (activeSpeakerId) {
      const active = participants.find(
        (p) => p.id === activeSpeakerId && !p.isLocal
      )
      if (active) return active.id
    }

    return null
  }, [participants, pinnedParticipantId, activeSpeakerId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      jitsiController.setPreferredParticipants(
        qualityPreferredParticipantId
          ? [qualityPreferredParticipantId]
          : []
      )
    }, 900)

    return () => window.clearTimeout(timer)
  }, [qualityPreferredParticipantId])

  if (count === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/35 text-sm">
        در حال انتظار برای اتصال...
      </div>
    )
  }

  const { priorityParticipant, speakers, cameraParticipants, avatarParticipants } = layout
  const hasFocus = Boolean(priorityParticipant)
  const focusIsPinned = priorityParticipant?.id === pinnedParticipantId
  const focusIsExplicit = priorityParticipant?.id === focusedParticipantId

  return (
    <div className="meeting-layout h-full min-h-0 p-2 sm:p-3 pb-[calc(98px+env(safe-area-inset-bottom))] lg:pb-[calc(106px+env(safe-area-inset-bottom))]">
      {hasFocus && (
        <div className="meeting-focus-wrapper">
          <section className="meeting-focus-view" aria-label="نمای اصلی">
            <VideoTile
              participantId={priorityParticipant.id}
              isLarge
              isPinned={focusIsPinned}
              isFocused={focusIsExplicit}
            />
          </section>
          <div className="meeting-focus-meta">
            {focusIsPinned && <span>📌 پین شده</span>}
            {focusIsExplicit && <span>نمای Focus</span>}
            {!focusIsPinned &&
              !focusIsExplicit &&
              priorityParticipant.isScreenSharing && <span>اشتراک صفحه</span>}
          </div>
        </div>
      )}

      {speakers.length > 0 && (
        <SpeakerStage participants={speakers} />
      )}

      {cameraParticipants.length > 0 && (
        <CameraParticipants participants={cameraParticipants} />
      )}

      {avatarParticipants.length > 0 && (
        <section
          className="meeting-avatar-section"
          aria-label="شرکت‌کنندگان بدون دوربین و میکروفون"
        >
          <div className="meeting-section-label">بدون تصویر و صدا</div>
          <div className="meeting-avatar-row">
            {avatarParticipants.map((participant) => {
              const initial =
                participant.displayName?.trim()?.[0]?.toUpperCase() || '?'
              return (
                <div
                  key={participant.id}
                  className="meeting-avatar-item"
                  title={participant.displayName}
                >
                  <div className="meeting-avatar-circle">{initial}</div>
                  <span>{participant.displayName || 'شرکت‌کننده'}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!hasFocus &&
        !speakers.length &&
        !cameraParticipants.length &&
        !avatarParticipants.length && (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            شرکت‌کننده‌ای برای نمایش وجود ندارد.
          </div>
        )}
    </div>
  )
})
