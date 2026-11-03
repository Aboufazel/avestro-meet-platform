import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Circle, Loader2, Power } from 'lucide-react'
import { roomsService } from '../../../services/rooms'
import { leaveMeeting, stopPresenceHeartbeat } from '../store/meeting-actions'
import { pdfFilename } from '../../../utils/pdfFilename'

/**
 * پایان جلسه برای همه (فقط میزبان) — لینک کلاس باقی می‌ماند و برای جلسه‌ی بعد قابل استفاده است:
 *   ۱) جلسه‌ی فعلی پایان می‌یابد و همه‌ی شرکت‌کنندگان بیرون می‌روند
 *   ۲) گزارش PDF حضور و غیاب ساخته و دانلود می‌شود
 *   ۳) فقط بعد از دانلود موفق، علامت‌های حضور و غیاب این کلاس پاک می‌شوند
 * اگر دانلود شکست بخورد، چیزی پاک نمی‌شود و میزبان می‌تواند دوباره تلاش کند.
 */
export function EndClassModal({ slug, open, withReport = true, onClose }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [phase, setPhase] = useState('confirm') // confirm | working | done | error
  const [steps, setSteps] = useState({ end: 'idle', pdf: 'idle', clear: 'idle' }) // idle | run | ok | fail | skip
  const [errorText, setErrorText] = useState('')
  const endedRef = useRef(false)

  if (!open) return null

  const set = (k, v) => setSteps((s) => ({ ...s, [k]: v }))

  const downloadPdf = async () => {
    const res = await roomsService.attendancePdf(slug)
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename(res.headers?.['content-disposition']) || `attendance-${slug}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const run = async () => {
    setPhase('working')
    setErrorText('')
    stopPresenceHeartbeat() // پاسخ ۴۱۰ بعد از پایان کلاس نباید صفحه‌ی خطا را جایگزین این پنجره کند

    if (!endedRef.current) {
      set('end', 'run')
      try {
        await roomsService.end(slug)
        endedRef.current = true
        set('end', 'ok')
        qc.invalidateQueries({ queryKey: ['rooms'] })
      } catch {
        set('end', 'fail')
        setErrorText('پایان جلسه انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.')
        setPhase('error')
        return
      }
    }

    if (!withReport) {
      setSteps((s) => ({ ...s, pdf: 'skip', clear: 'skip' }))
      setPhase('done')
      return
    }

    set('pdf', 'run')
    try {
      await downloadPdf()
      set('pdf', 'ok')
    } catch {
      set('pdf', 'fail')
      setErrorText('ساخت یا دانلود گزارش حضور و غیاب انجام نشد. هنوز چیزی پاک نشده است.')
      setPhase('error')
      return
    }

    set('clear', 'run')
    try {
      await roomsService.clearAttendance(slug)
      set('clear', 'ok')
    } catch {
      set('clear', 'fail') // گزارش دانلود شده؛ پاک‌نشدن علامت‌ها مانع خروج نیست
    }
    setPhase('done')
  }

  const finish = async () => {
    await leaveMeeting()
    navigate('/dashboard', { replace: true })
  }

  const items = [
    { k: 'end', label: 'پایان جلسه و خروج شرکت‌کنندگان' },
    ...(withReport ? [
      { k: 'pdf', label: 'ساخت و دانلود گزارش حضور و غیاب (PDF)' },
      { k: 'clear', label: 'پاک‌کردن اطلاعات حضور و غیاب این جلسه' },
    ] : []),
  ]

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="w-[min(440px,100%)] rounded-[28px] border room-border bg-[var(--room-surface)] px-7 py-7 text-white shadow-[0_24px_70px_rgba(0,0,0,.4)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--room-danger)]/10 text-[var(--room-danger)] mx-auto flex items-center justify-center">
          {phase === 'done' ? <CheckCircle2 size={22} /> : phase === 'error' ? <AlertTriangle size={22} /> : <Power size={22} />}
        </div>
        <h2 className="text-lg font-bold text-center mt-4">
          {phase === 'done' ? 'جلسه پایان یافت' : phase === 'error' ? 'خطا در پایان جلسه' : 'پایان جلسه برای همه؟'}
        </h2>

        {phase === 'confirm' && (
          <p className="text-white/55 text-sm leading-7 text-center mt-2">
            جلسه‌ی فعلی برای همه تمام می‌شود، ولی لینک کلاس سر جایش می‌ماند و جلسه‌ی بعد با همان لینک شروع می‌شود.
            {withReport && ' گزارش حضور و غیاب به‌صورت PDF دانلود می‌شود و بعد از آن علامت‌های حضور و غیاب این جلسه پاک می‌شوند.'}
          </p>
        )}

        {phase !== 'confirm' && (
          <ul className="mt-5 space-y-3">
            {items.map(({ k, label }) => {
              const st = steps[k]
              return (
                <li key={k} className="flex items-center gap-3 text-sm">
                  {st === 'run' ? <Loader2 size={17} className="animate-spin text-[var(--room-blue)]" />
                    : st === 'ok' ? <CheckCircle2 size={17} className="text-[var(--room-mint)]" />
                    : st === 'fail' ? <AlertTriangle size={17} className="text-[var(--room-danger)]" />
                    : <Circle size={17} className="text-white/25" />}
                  <span className={st === 'idle' ? 'text-white/40' : 'text-white/85'}>{label}</span>
                  {k === 'clear' && st === 'fail' && <span className="text-[11px] text-white/40">(بعداً پاک می‌شود)</span>}
                </li>
              )
            })}
          </ul>
        )}

        {phase === 'error' && <p className="text-[var(--room-danger)] text-sm leading-7 mt-4">{errorText}</p>}
        {phase === 'done' && withReport && (
          <p className="text-white/45 text-xs leading-6 mt-4">گزارش در پوشه‌ی دانلودهای شما ذخیره شد. اگر دانلود شروع نشد، مرورگر را برای اجازه‌ی دانلود بررسی کنید.</p>
        )}

        <div className="mt-6 flex gap-2 justify-center">
          {phase === 'confirm' && (<>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border room-border text-sm text-white/80 hover:bg-white/5">انصراف</button>
            <button onClick={run} className="px-5 py-2.5 rounded-xl bg-[var(--room-danger)] text-white text-sm font-medium">پایان جلسه</button>
          </>)}
          {phase === 'error' && (<>
            <button onClick={finish} className="px-5 py-2.5 rounded-xl border room-border text-sm text-white/80 hover:bg-white/5">خروج بدون دانلود</button>
            <button onClick={run} className="px-5 py-2.5 rounded-xl bg-[var(--room-blue)] text-white text-sm font-medium">تلاش دوباره</button>
          </>)}
          {phase === 'done' && (
            <button onClick={finish} className="px-5 py-2.5 rounded-xl bg-[var(--room-blue)] text-white text-sm font-medium">بازگشت به داشبورد</button>
          )}
        </div>
      </div>
    </div>
  )
}
