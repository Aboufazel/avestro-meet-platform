import { useEffect } from 'react'
import { LogOut, Power, RefreshCw, ShieldCheck } from 'lucide-react'

/**
 * مودالِ «مطمئنی؟» برای میزبان، وقتی می‌خواهد خارج شود یا صفحه را رفرش کند.
 *   reason = 'exit'   → دکمه‌ی خروج
 *   reason = 'reload' → F5 / Ctrl+R / ⌘R
 * هر گزینه روشن می‌گوید «کلاس تمام می‌شود یا ادامه دارد». بستن تب و دکمه‌ی رفرش خودِ مرورگر
 * قابل رهگیری نیستند؛ برای آن‌ها فقط هشدار پیش‌فرض مرورگر می‌آید.
 */
export function HostExitGuardModal({ reason, onStay, onReload, onLeaveOnly, onEnd }) {
  useEffect(() => {
    if (!reason) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onStay() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reason, onStay])

  if (!reason) return null
  const isReload = reason === 'reload'

  const options = [
    isReload
      ? {
          key: 'reload', onClick: onReload, tone: 'primary', icon: <RefreshCw size={20} />,
          title: 'رفرش کن، کلاس ادامه دارد',
          desc: 'چند ثانیه از جلسه خارج می‌شوی و دوباره وارد می‌شوی. شاگردها سر جایشان می‌مانند.',
        }
      : {
          key: 'leave', onClick: onLeaveOnly, tone: 'primary', icon: <LogOut size={20} />,
          title: 'فقط خارج شو، کلاس باز بماند',
          desc: 'شاگردها در کلاس می‌مانند و بعداً می‌توانی با همان لینک برگردی. گزارش حضور و غیاب ساخته نمی‌شود.',
        },
    {
      key: 'end', onClick: onEnd, tone: 'danger', icon: <Power size={20} />,
      title: 'پایان جلسه برای همه',
      desc: 'جلسه تمام می‌شود و گزارش حضور و غیاب دانلود می‌شود. لینک کلاس برای جلسه‌ی بعد سر جایش می‌ماند.',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-3 sm:p-4"
      dir="rtl" role="dialog" aria-modal="true" aria-labelledby="host-guard-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onStay() }}
    >
      <div className="room-rise w-[min(460px,100%)] rounded-[28px] border room-border bg-[var(--room-surface)] p-6 sm:p-7 text-white shadow-[0_30px_90px_rgba(0,0,0,.5)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-[var(--room-blue)]/15 text-[var(--room-blue)] flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div className="min-w-0">
            <h2 id="host-guard-title" className="text-[17px] font-bold leading-7">
              {isReload ? 'صفحه رفرش شود؟' : 'از کلاس خارج می‌شوی؟'}
            </h2>
            <p className="text-white/55 text-[13px] leading-6 mt-1">
              کلاس هنوز در جریان است. می‌خواهی چه کار کنی؟
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {options.map((o) => (
            <button
              key={o.key} type="button" onClick={o.onClick}
              className={`group w-full text-right flex items-start gap-3.5 rounded-2xl border p-3.5 transition
                ${o.tone === 'danger'
                  ? 'border-[var(--room-danger)]/25 bg-[var(--room-danger)]/[.06] hover:bg-[var(--room-danger)]/[.12]'
                  : 'border-[var(--room-blue)]/30 bg-[var(--room-blue)]/[.09] hover:bg-[var(--room-blue)]/[.16]'}`}
            >
              <span className={`mt-0.5 w-10 h-10 shrink-0 rounded-xl flex items-center justify-center
                ${o.tone === 'danger' ? 'bg-[var(--room-danger)]/15 text-[var(--room-danger)]' : 'bg-[var(--room-blue)]/20 text-[var(--room-blue)]'}`}>
                {o.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-white/50 leading-5 mt-0.5">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button" onClick={onStay} autoFocus
          className="mt-4 w-full rounded-2xl border room-border py-3 text-sm font-medium text-white/85 hover:bg-white/5 transition"
        >
          ماندن در کلاس
        </button>
      </div>
    </div>
  )
}
