import { memo, useEffect, useMemo, useRef } from 'react'
import { MonitorUp } from 'lucide-react'
import { useParticipants } from '../hooks/useParticipants'
import { useFitGrid } from '../hooks/useFitGrid'
import { useViewportContext } from '../ClassViewportContext'
import { useMeetingStore } from '../store/meeting-store'
import { jitsiController } from '../jitsi/JitsiController'
import { PERF } from '../jitsi/jitsi-config'
import { VideoTile } from './VideoTile'
import './class-room.css'

const hasLiveVideo = (p) => p.isScreenSharing || (p.hasVideo !== undefined ? p.hasVideo : !p.isVideoMuted)

/**
 * چیدمان کلاس؛ فقط دو حالت دارد و تخته و اشتراک صفحه هر دو یک مسیر را فعال می‌کنند:
 *
 *  ۱) حالت ویدئو (بدون تخته و اشتراک): شبکه‌ی کارت‌های بزرگ؛ مدرس اول.
 *  ۲) حالت محتوا (تخته یا اشتراک صفحه): محتوا بیشترین فضا را می‌گیرد؛ در کنارش
 *     ستون «کارت مدرس + سایر شرکت‌کنندگان». هیچ‌چیز روی محتوا شناور نیست.
 *
 * board: عنصر تخته (وقتی باز است). contentMode را RoomPage از (تخته یا اشتراک) می‌سازد.
 */
export const ClassLayout = memo(function ClassLayout({ board = null, contentMode = false, onStopShare }) {
  const { participants, count } = useParticipants()
  const { compact } = useViewportContext()
  const isRecording = useMeetingStore((s) => s.isRecording)
  const gridRef = useRef(null)

  const { teacher, sharer, gridList, others, allowed, onStageIds } = useMemo(() => {
    const t = participants.find((p) => p.isTeacher) || null
    const s = participants.find((p) => p.isScreenSharing) || null
    const rest = participants.filter((p) => p.id !== t?.id)

    // محتوای اصلی: تخته ← اشتراک صفحه ← مدرس. این همان اولویت قبلی صحنه است.
    const stageP = (!board && s) || t || participants.find((p) => !p.isLocal) || participants[0] || null

    const ordered = []
    const push = (p) => { if (p && !p.isLocal && hasLiveVideo(p) && !ordered.includes(p.id)) ordered.push(p.id) }
    push(stageP); push(t); rest.forEach(push)

    return {
      teacher: t,
      sharer: s,
      gridList: t ? [t, ...rest] : participants,
      others: rest,
      allowed: new Set(ordered.slice(0, PERF.maxRemoteVideos)),
      onStageIds: stageP && !stageP.isLocal ? [stageP.id] : [],
    }
  }, [participants, board])

  const paused = typeof document !== 'undefined' && document.hidden && !isRecording
  useEffect(() => {
    const timer = window.setTimeout(() => {
      jitsiController.setReceiverPriority({ onStageIds, visibleIds: [...allowed], paused })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [onStageIds, allowed, paused])

  const fit = useFitGrid(gridRef, gridList.length, {
    infoH: compact ? 29 : 37,
    gap: compact ? 8 : 12,
    minW: compact ? 132 : 220,
    maxW: compact ? 420 : 620,
  })

  if (count === 0) {
    return <div className="cl-empty">در حال انتظار برای اتصال...</div>
  }

  const card = (p, isTeacherCard = false) => (
    <VideoTile
      key={p.id}
      variant="card"
      participantId={p.id}
      preferCamera
      isTeacherCard={isTeacherCard}
      videoEnabled={p.isLocal || allowed.has(p.id)}
    />
  )

  if (!contentMode) {
    return (
      <div className="cl-root">
        <div
          ref={gridRef}
          className={`cl-grid ${fit.scroll ? 'is-scroll' : ''}`}
          style={{ '--card-w': `${fit.cardW}px`, '--cols': fit.cols }}
          aria-label="تصاویر شرکت‌کنندگان کلاس"
        >
          {gridList.map((p) => card(p, p.id === teacher?.id))}
        </div>
      </div>
    )
  }

  const stageIsOwnShare = !board && Boolean(sharer?.isLocal)

  return (
    <div className="cl-root is-content">
      <section className="cl-content" aria-label="محتوای آموزشی">
        <div className="cl-content-main">
          {board || (sharer && (
            <VideoTile variant="stage" participantId={sharer.id} isLarge videoEnabled playAudio={false} />
          ))}
        </div>
        {stageIsOwnShare && (
          <div className="cl-share-bar">
            <MonitorUp size={15} aria-hidden="true" />
            <span>در حال اشتراک صفحه؛ دانش‌آموزان همین تصویر را می‌بینند</span>
            {onStopShare && <button type="button" onClick={onStopShare}>توقف</button>}
          </div>
        )}
      </section>

      <aside className="cl-side" aria-label="مدرس و شرکت‌کنندگان">
        {teacher && <div className="cl-side-teacher">{card(teacher, true)}</div>}
        {others.length > 0 && <div className="cl-side-list">{others.map((p) => card(p))}</div>}
      </aside>
    </div>
  )
})
