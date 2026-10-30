import { memo, useEffect, useMemo, useState } from 'react'
import { Maximize2, Minimize2, MonitorUp, Users } from 'lucide-react'
import { useParticipants } from '../hooks/useParticipants'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useMeetingStore } from '../store/meeting-store'
import { jitsiController } from '../jitsi/JitsiController'
import { PERF } from '../jitsi/jitsi-config'
import { VideoTile } from './VideoTile'
import { DraggablePip } from './DraggablePip'
import { ChatPreview, MobileChatSheet } from './MobileChatSheet'
import './class-layout.css'

const hasLiveVideo = (p) => p.isScreenSharing || (p.hasVideo !== undefined ? p.hasVideo : !p.isVideoMuted)

/**
 * چیدمان «کلاس» (موبایل‌اول):
 *  • صحنه: اشتراک صفحه ← معلم ← گوینده‌ی فعال (Pin/Focus اولویت دارد)
 *  • دوربین معلم در کنار اشتراک صفحه می‌ماند؛ ارسال هم‌زمان دو منبع به پشتیبانی
 *    multi-stream در نسخه‌های Jitsi سمت سرور و کلاینت نیاز دارد.
 *  • موبایل: صحنه‌ی بالا (قابل بزرگ‌کردن) ← نوار کوچک صحبت‌کننده‌ها ← گفتگو
 *  • دسکتاپ/تبلت: صحنه + ستون کنار برای صحبت‌کننده‌ها؛ گفتگو در SidePanel
 *
 * صدا: صدای هر نفر از تایل خودش پخش می‌شود، پس هر کس میکروفونش روشن است یک تایل mount دارد.
 */
export const ClassLayout = memo(function ClassLayout({ showChat = true, onStopShare, suppressVideo = false, chatOpen = false, onOpenChat, onCloseChat, contentMode = false }) {
  const { participants, count } = useParticipants()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [expanded, setExpanded] = useState(false)
  const activeSpeakerId = useMeetingStore((s) => s.activeSpeakerId ?? null)
  const pinnedId = useMeetingStore((s) => s.pinnedParticipantId ?? null)
  const focusedId = useMeetingStore((s) => s.focusedParticipantId ?? null)
  const isRecording = useMeetingStore((s) => s.isRecording)

  const { stage, pip, strip, hiddenCount, allowed, onStageIds } = useMemo(() => {
    const byId = (id) => (id ? participants.find((p) => p.id === id) || null : null)
    const teacher = participants.find((p) => p.isTeacher) || null
    const sharer = participants.find((p) => p.isScreenSharing) || null
    const speaker = byId(activeSpeakerId)

    const stageP =
      (contentMode ? sharer || teacher : null) || byId(pinnedId) || byId(focusedId) || sharer || teacher ||
      (speaker && !speaker.isLocal ? speaker : null) ||
      participants.find((p) => !p.isLocal) || participants[0] || null

    // کادر دوربین معلم باید حتی هنگام اشتراک صفحه هم باقی بماند.
    // در این حالت stage تصویر desktop را نشان می‌دهد و PiP همان شرکت‌کننده
    // را با preferCamera=true به‌عنوان دوربین مستقل رندر می‌کند.
    const pipP =
      teacher && stageP && !teacher.isVideoMuted &&
      (stageP.id !== teacher.id || teacher.isScreenSharing)
        ? teacher
        : null

    // در حالت محتوای آموزشی همه‌ی افراد در نوار کناری می‌مانند؛
    // حتی اگر دوربین/میکروفون خاموش باشد، تایل آواتارشان قابل مشاهده است.
    const stripList = participants.filter(
      (p) => p.id !== stageP?.id && p.id !== pipP?.id
    )
    const tileIds = new Set([stageP?.id, pipP?.id, ...stripList.map((p) => p.id)])
    const hidden = participants.filter((p) => !p.isLocal && !tileIds.has(p.id)).length

    // بودجه‌ی ویدیو (مثل VideoGrid)
    const ordered = []
    const push = (p) => { if (p && !p.isLocal && hasLiveVideo(p) && !ordered.includes(p.id)) ordered.push(p.id) }
    push(stageP); push(pipP); stripList.forEach(push)

    return {
      stage: stageP,
      pip: pipP,
      strip: stripList,
      hiddenCount: hidden,
      allowed: new Set(ordered.slice(0, PERF.maxRemoteVideos)),
      onStageIds: stageP && !stageP.isLocal ? [stageP.id] : [],
    }
  }, [participants, activeSpeakerId, pinnedId, focusedId, contentMode])

  const paused = typeof document !== 'undefined' && document.hidden && !isRecording
  useEffect(() => {
    const t = window.setTimeout(() => {
      jitsiController.setReceiverPriority({ onStageIds, visibleIds: [...allowed], paused })
    }, 400)
    return () => window.clearTimeout(t)
  }, [onStageIds, allowed, paused])

  if (count === 0) {
    return <div className="h-full flex items-center justify-center text-white/35 text-sm">در حال انتظار برای اتصال...</div>
  }

  const stageIsOwnShare = Boolean(stage?.isLocal && stage?.isScreenSharing)
  const mobileChat = !isDesktop && showChat && !contentMode

  if (!contentMode) {
    return (
      <div className="cl-root is-grid-mode">
        <div className="cl-grid" aria-label="تصاویر شرکت‌کنندگان کلاس">
          {participants.map((participant) => (
            <div className="cl-grid-tile" key={participant.id}>
              <VideoTile
                participantId={participant.id}
                isLarge
                videoEnabled={participant.isLocal || allowed.has(participant.id)}
                forceVideoOff={suppressVideo}
                isPinned={participant.id === pinnedId}
                isFocused={participant.id === focusedId}
              />
            </div>
          ))}
        </div>
        {mobileChat && !chatOpen && <ChatPreview onOpen={onOpenChat} />}
        {mobileChat && <MobileChatSheet open={chatOpen} onClose={onCloseChat} />}
      </div>
    )
  }

  return (
    <div className="cl-root is-content-mode">
      <section aria-label="محتوای آموزشی و تصویر اصلی کلاس" className={`cl-stage ${expanded ? 'is-expanded' : ''}`}>
        {stage && !stageIsOwnShare && (
          <div className="cl-fill">
            <VideoTile
              participantId={stage.id}
              isLarge
              videoEnabled={stage.isLocal || allowed.has(stage.id)}
              forceVideoOff={suppressVideo}
              isPinned={stage.id === pinnedId}
              isFocused={stage.id === focusedId}
            />
          </div>
        )}

        {stageIsOwnShare && (
          <div className="cl-share">
            <div className="cl-share-preview">
              <VideoTile participantId={stage.id} isLarge videoEnabled forceVideoOff={suppressVideo} />
            </div>
            <div className="cl-share-bar">
              <MonitorUp size={16} className="text-[var(--room-blue)] shrink-0" />
              <span className="cl-share-title">در حال اشتراک صفحه — دانش‌آموزان همین تصویر را می‌بینند</span>
              {onStopShare && <button type="button" className="cl-share-stop" onClick={onStopShare}>توقف</button>}
            </div>
          </div>
        )}

        {pip && (
          <DraggablePip initialCorner="bl" label="دوربین معلم">
            <VideoTile participantId={pip.id} preferCamera playAudio videoEnabled={pip.isLocal || allowed.has(pip.id)} forceVideoOff={suppressVideo} />
          </DraggablePip>
        )}

        <button type="button" className="cl-expand" onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'کوچک‌کردن صحنه' : 'بزرگ‌کردن صحنه'}>
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </section>

      {(strip.length > 0 || hiddenCount > 0) && (
        <div className="cl-strip">
          {strip.map((p) => (
            <div key={p.id} className="cl-tile">
              <VideoTile participantId={p.id} videoEnabled={p.isLocal || allowed.has(p.id)} forceVideoOff={suppressVideo} />
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="cl-more">
              <Users size={16} />
              <span>+{hiddenCount} نفر</span>
            </div>
          )}
        </div>
      )}

      {mobileChat && !chatOpen && <ChatPreview onOpen={onOpenChat} />}
      {mobileChat && <MobileChatSheet open={chatOpen} onClose={onCloseChat} />}
    </div>
  )
})
