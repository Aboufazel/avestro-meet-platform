import { memo, useContext, useMemo } from 'react'
import { Hand, Mic, MicOff, Video, VideoOff, X } from 'lucide-react'
import { ClassAccessContext } from '../ClassAccessContext'

/**
 * پنل میزبان: صف دست‌بلندکرده‌ها، مجازها و سایر حاضران.
 * همه‌چیز لحظه‌ای از سرور می‌آید و هر اکشن مستقیم به سرور می‌رود.
 */
export const HandQueue = memo(function HandQueue() {
  const access = useContext(ClassAccessContext)
  const roster = access?.roster
  const { raised, allowed, others } = useMemo(() => {
    const items = roster || []
    const raisedList = items
      .filter((p) => p.hand_at)
      .sort((a, b) => new Date(a.hand_at) - new Date(b.hand_at))
    const allowedList = items.filter((p) => !p.hand_at && (p.audio_granted || p.video_granted))
    const rest = items.filter((p) => !p.hand_at && !p.audio_granted && !p.video_granted)
    return { raised: raisedList, allowed: allowedList, others: rest }
  }, [roster])

  if (!access) return null

  return (
    <div dir="rtl" className="border-b room-border px-3 py-2.5 text-right shrink-0 max-h-[46%] overflow-y-auto">
      <Section title="دست‌بلندکرده‌ها" count={raised.length} accent>
        {raised.length === 0 && <Empty text="کسی دست بلند نکرده" />}
        {raised.map((p, i) => (
          <Row key={p.key} name={p.name} badge={i + 1} isNew={isRecent(p.hand_at)}>
            <button type="button" onClick={() => access.grant(p.key, true, true)}
              className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--room-mint-soft)] text-[var(--room-mint)] hover:brightness-125">
              اجازه بده
            </button>
            <button type="button" title="پایین‌آوردن دست" onClick={() => access.lowerHand(p.key)}
              aria-label="رد درخواست" className="p-1.5 rounded-md text-white/55 hover:bg-white/10"><X size={16} /></button>
          </Row>
        ))}
      </Section>

      {allowed.length > 0 && (
        <Section title="مجاز به صحبت" count={allowed.length}>
          {allowed.map((p) => (
            <Row key={p.key} name={p.name}>
              <Toggle on={p.audio_granted} title="میکروفون" onIcon={<Mic size={14} />} offIcon={<MicOff size={14} />}
                onClick={() => access.grant(p.key, !p.audio_granted, p.video_granted)} />
              <Toggle on={p.video_granted} title="دوربین" onIcon={<Video size={14} />} offIcon={<VideoOff size={14} />}
                onClick={() => access.grant(p.key, p.audio_granted, !p.video_granted)} />
              <button type="button" onClick={() => access.revoke(p.key)}
                className="text-[11px] px-2 py-1 rounded-lg bg-[var(--room-danger)]/10 text-[var(--room-danger)] hover:brightness-125">
                پس‌گرفتن
              </button>
            </Row>
          ))}
        </Section>
      )}

      {others.length > 0 && (
        <Section title="سایر حاضران" count={others.length}>
          {others.map((p) => (
            <Row key={p.key} name={p.name}>
              <button type="button" onClick={() => access.grant(p.key, true, true)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[.06] text-white/70 hover:bg-white/10">
                اجازه
              </button>
            </Row>
          ))}
        </Section>
      )}
    </div>
  )
})

function Section({ title, count, accent = false, children }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-white/45">
        {accent && <Hand size={12} className="text-[var(--room-warning)]" />}
        <span>{title}</span>
        <span className="text-white/30">({count})</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

const NEW_WINDOW_MS = 30000
const isRecent = (iso) => Date.now() - new Date(iso).getTime() < NEW_WINDOW_MS

function Row({ name, badge, isNew = false, children }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${isNew ? 'bg-[var(--room-warning)]/10 ring-1 ring-[var(--room-warning)]/40' : 'bg-white/[.04]'}`}>
      {badge != null && <span className="w-5 h-5 rounded-full bg-[var(--room-warning)]/15 text-[var(--room-warning)] text-[10px] flex items-center justify-center shrink-0">{badge}</span>}
      <span className="flex-1 min-w-0 truncate text-xs text-white/85">{name}</span>
      {isNew && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--room-warning)] text-[#2a1c00] font-semibold">جدید</span>}
      <div className="flex items-center gap-1 shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ on, title, onIcon, offIcon, onClick }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`p-1.5 rounded-md ${on ? 'bg-[var(--room-mint-soft)] text-[var(--room-mint)]' : 'bg-white/[.06] text-white/40'}`}>
      {on ? onIcon : offIcon}
    </button>
  )
}

const Empty = ({ text }) => <p className="text-[11px] text-white/30 py-1">{text}</p>
