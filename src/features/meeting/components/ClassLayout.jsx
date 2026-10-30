import { memo, useEffect, useMemo } from 'react'
import { MonitorUp, Users } from 'lucide-react'
import { useParticipants } from '../hooks/useParticipants'
import { useMeetingStore } from '../store/meeting-store'
import { jitsiController } from '../jitsi/JitsiController'
import { PERF } from '../jitsi/jitsi-config'
import { VideoTile } from './VideoTile'
import './class-layout.css'

const hasLiveVideo = (p) => p.isScreenSharing || (p.hasVideo !== undefined ? p.hasVideo : !p.isVideoMuted)

/**
 * چیدمان «کلاس» — یک مالک واحد برای هر دو حالت:
 *
 *  حالت ۱ (is-grid-mode): نمایش ویدئو — کلاس سمیناریِ خلوت با کارت‌های بزرگ؛
 *   کارت مدرس اول (سمت راست در RTL) و بقیه در شبکه‌ی هوشمند.
 *
 *  حالت ۲ (is-content-mode): تخته سفید یا اشتراک صفحه فعال است —
 *   • محتوای آموزشی (تخته/اشتراک) بیشترین فضای ممکن را می‌گیرد
 *   • کارت مستقل و کوچک‌ترِ مدرس + نوار قابل پیمایش سایرین در ریل کنار
 *   • هیچ پنل یا دکمه‌ی شناوری روی محتوای اصلی نیست
 *
 *  حالت عمودی موبایل (portrait = true): چیدمان انباشته‌ی «تماشایی» —
 *   • محتوا تمام‌عرض بالا؛ کارت کوچک شناور مدرس روی گوشه‌ی محتوا (PiP)
 *   • نوار افقیِ قابل پیمایش سایر شرکت‌کنندگان زیر محتوا
 *   • کنترل‌ها در داک پایین (خارج از این کامپوننت) — همه‌چیز در دسترس است
 *
 * با بسته‌شدن تخته/اشتراک، RoomPage حالت را عوض می‌کند و چیدمان نرم برمی‌گردد.
 *
 * صدا: صدای هر نفر فقط از «یک» تایل پخش می‌شود (استیج اولویت دارد) تا هیچ‌وقت
 * دوبل پخش نشود؛ بقیه‌ی تایل‌های همان نفر playAudio=false دارند.
 */
export const ClassLayout = memo(function ClassLayout({ contentMode = false, whiteboardSlot = null, onStopShare, suppressVideo = false, portrait = false }) {
  const { participants, count } = useParticipants()
  const pinnedId = useMeetingStore((s) => s.pinnedParticipantId ?? null)
  const focusedId = useMeetingStore((s) => s.focusedParticipantId ?? null)
  const isRecording = useMeetingStore((s) => s.isRecording)

  const layout = useMemo(() => {
    const teacher = participants.find((p) => p.isTeacher) || null
    const sharer = participants.find((p) => p.isScreenSharing) || null
    // کارت مدرس همیشه اول (سمت راست شبکه در RTL)؛ بقیه به ترتیب ورود
    const gridOrder = teacher
      ? [teacher, ...participants.filter((p) => p.id !== teacher.id)]
      : participants

    // بودجه‌ی ویدیو: مدرس و استیج اول، بعد بقیه‌ی کسانی که تصویر زنده دارند
    const ordered = []
    const push = (p) => { if (p && !p.isLocal && hasLiveVideo(p) && !ordered.includes(p.id)) ordered.push(p.id) }

    if (!contentMode) {
      gridOrder.forEach(push)
      return {
        mode: 'grid',
        gridOrder,
        stage: null,
        stageIsOwnShare: false,
        rail: [],
        railTeacher: null,
        hiddenCount: 0,
        allowed: new Set(ordered.slice(0, PERF.maxRemoteVideos)),
        onStageIds: [],
      }
    }

    const stage = whiteboardSlot ? null : (sharer || null)
    const stageIsOwnShare = Boolean(stage?.isLocal && stage?.isScreenSharing)

    // ریل: کارت مدرس + سایرین (استیج از ریل حذف می‌شود تا تکراری نباشد)
    const railTeacher = teacher || null
    const rail = participants.filter((p) => p.id !== teacher?.id && p.id !== stage?.id)
    push(stage); push(teacher); rail.forEach(push)

    return {
      mode: 'content',
      gridOrder,
      stage,
      stageIsOwnShare,
      rail,
      railTeacher,
      hiddenCount: 0,
      allowed: new Set(ordered.slice(0, PERF.maxRemoteVideos)),
      onStageIds: stage && !stage.isLocal ? [stage.id] : [],
    }
  }, [participants, contentMode, whiteboardSlot])

  const { mode, gridOrder, stage, stageIsOwnShare, rail, railTeacher, allowed, onStageIds } = layout

  const paused = typeof document !== 'undefined' && document.hidden && !isRecording
  useEffect(() => {
    const visibleIds = mode === 'content' ? [...rail.map((p) => p.id), ...(railTeacher ? [railTeacher.id] : [])] : []
    const t = window.setTimeout(() => {
      jitsiController.setReceiverPriority({ onStageIds, visibleIds, paused })
    }, 400)
    return () => window.clearTimeout(t)
  }, [mode, onStageIds, rail, railTeacher, paused])

  if (count === 0) {
    return <div className="h-full flex items-center justify-center text-white/35 text-sm">در حال انتظار برای اتصال...</div>
  }

  const gridTiles = gridOrder.map((participant) => (
    <div className="cl-grid-tile" key={participant.id}>
      <VideoTile
        participantId={participant.id}
        variant="card"
        isLarge={gridOrder.length === 1}
        videoEnabled={participant.isLocal || allowed.has(participant.id)}
        forceVideoOff={suppressVideo}
        isPinned={participant.id === pinnedId}
        isFocused={participant.id === focusedId}
        badge={participant.isTeacher ? 'مدرس' : null}
      />
    </div>
  ))

  if (mode === 'grid') {
    return (
      <div className={`cl-root is-grid-mode ${portrait ? 'is-stacked' : ''}`}>
        <div className="cl-grid" aria-label="تصاویر شرکت‌کنندگان کلاس">{gridTiles}</div>
      </div>
    )
  }

  // ─── حالت محتوای آموزشی: تخته/اشتراک + مدرس و شرکت‌کنندگان ───
  const railAudioOwner = stage?.id || null

  const contentNode = (
    <>
      {whiteboardSlot ? (
        <div className="cl-content-fill">{whiteboardSlot}</div>
      ) : stage && stageIsOwnShare ? (
        <div className="cl-share">
          <div className="cl-share-preview">
            <VideoTile participantId={stage.id} variant="card" isLarge videoEnabled forceVideoOff={suppressVideo} />
          </div>
          <div className="cl-share-bar">
            <MonitorUp size={16} className="text-[var(--room-blue)] shrink-0" />
            <span className="cl-share-title">در حال اشتراک صفحه — دانش‌آموزان همین تصویر را می‌بینند</span>
            {onStopShare && <button type="button" className="cl-share-stop" onClick={onStopShare}>توقف</button>}
          </div>
        </div>
      ) : stage ? (
        <div className="cl-content-fill">
          <VideoTile
            participantId={stage.id}
            variant="card"
            isLarge
            videoEnabled={stage.isLocal || allowed.has(stage.id)}
            forceVideoOff={suppressVideo}
            badge={stage.isTeacher ? 'مدرس' : null}
          />
        </div>
      ) : (
        <div className="cl-content-empty">محتوای آموزشی در دسترس نیست</div>
      )}
    </>
  )

  // ─── عمودی موبایل: تخته تمام‌عرض بالا + مدرس شناور (PiP) + نوار افقی بقیه ───
  if (portrait) {
    // اگر مدرس خودش روی استیج است (اشتراک صفحه)، دیگر PiP تکراری نمی‌خواهد
    const pipTeacher = railTeacher && railTeacher.id !== stage?.id ? railTeacher : null
    return (
      <div className="cl-root is-content-mode is-stacked">
        <section aria-label="محتوای آموزشی کلاس" className="cl-content">
          {contentNode}
          {pipTeacher && (
            <div className="cl-pip">
              <VideoTile
                participantId={pipTeacher.id}
                variant="card"
                preferCamera
                videoEnabled={pipTeacher.isLocal || allowed.has(pipTeacher.id)}
                forceVideoOff={suppressVideo}
                playAudio={pipTeacher.id !== railAudioOwner}
                badge="مدرس"
              />
            </div>
          )}
        </section>
        <aside className="cl-strip" aria-label="سایر شرکت‌کنندگان کلاس">
          {rail.length > 0 ? rail.map((p) => (
            <div className="cl-strip-item" key={p.id}>
              <VideoTile
                participantId={p.id}
                variant="card"
                videoEnabled={p.isLocal || allowed.has(p.id)}
                forceVideoOff={suppressVideo}
                playAudio={p.id !== railAudioOwner}
              />
            </div>
          )) : (
            <div className="cl-strip-empty"><Users size={14} /><span>شرکت‌کننده‌ی دیگری آنلاین نیست</span></div>
          )}
        </aside>
      </div>
    )
  }

  return (
    <div className="cl-root is-content-mode">
      <section aria-label="محتوای آموزشی کلاس" className="cl-content">{contentNode}</section>

      <aside className="cl-rail" aria-label="تصاویر مدرس و شرکت‌کنندگان">
        {railTeacher && (
          <div className="cl-rail-teacher">
            <VideoTile
              participantId={railTeacher.id}
              variant="card"
              preferCamera
              videoEnabled={railTeacher.isLocal || allowed.has(railTeacher.id)}
              forceVideoOff={suppressVideo}
              playAudio={railTeacher.id !== railAudioOwner}
              badge="مدرس"
            />
          </div>
        )}

        {rail.length > 0 && (
          <div className="cl-rail-list" aria-label="سایر شرکت‌کنندگان">
            {rail.map((p) => (
              <div className="cl-rail-item" key={p.id}>
                <VideoTile
                  participantId={p.id}
                  variant="card"
                  videoEnabled={p.isLocal || allowed.has(p.id)}
                  forceVideoOff={suppressVideo}
                  playAudio={p.id !== railAudioOwner}
                />
              </div>
            ))}
          </div>
        )}

        {rail.length === 0 && !railTeacher && (
          <div className="cl-rail-empty"><Users size={16} /><span>شرکت‌کننده‌ای آنلاین نیست</span></div>
        )}
      </aside>
    </div>
  )
})
