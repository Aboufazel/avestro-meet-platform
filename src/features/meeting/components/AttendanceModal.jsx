import { memo, useMemo, useState } from 'react'
import { FileText, Loader2, Plus, X } from 'lucide-react'
import { roomsService } from '../../../services/rooms'
import { useAttendance } from '../../../hooks/useAttendance'
import { formatIsoJalali, formatIsoTime } from '../../../utils/jalali'
import { pdfFilename } from '../../../utils/pdfFilename'

const STATUSES = [
  { value: 'present', label: 'حاضر', color: 'var(--room-mint)' },
  { value: 'late', label: 'تأخیر', color: 'var(--room-warning)' },
  { value: 'excused', label: 'موجه', color: 'var(--room-blue-2)' },
  { value: 'absent', label: 'غایب', color: 'var(--room-danger)' },
]
const LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]))

const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

/**
 * حضور و غیاب دستی. سیستم فقط «اطلاعات» می‌دهد (ساعت ورود، مدت حضور، آنلاین بودن)
 * و وضعیت را فقط مدیر ثبت می‌کند؛ تا ثبت نشود «ثبت‌نشده» می‌ماند.
 */
export const AttendanceModal = memo(function AttendanceModal({ slug, open, onClose }) {
  const { report, isLoading, isError, mark, isSaving } = useAttendance(slug, { enabled: open })
  const [openNote, setOpenNote] = useState(null)
  const [newName, setNewName] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(false)

  const rows = report?.rows || []
  const counts = useMemo(() => {
    const c = { present: 0, late: 0, excused: 0, absent: 0, none: 0 }
    rows.forEach((r) => { c[r.mark?.status || 'none'] += 1 })
    return c
  }, [rows])

  if (!open) return null

  const markAllUnmarkedPresent = () => {
    rows.filter((r) => !r.mark).forEach((r) => mark(r.key, 'present'))
  }

  const addAbsent = () => {
    const name = newName.trim()
    if (!name) return
    mark(`g:${name.toLowerCase()}`, 'absent').then(() => setNewName(''))
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    setPdfError(false)
    try {
      const res = await roomsService.attendancePdf(slug)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFilename(res.headers?.['content-disposition']) || `attendance-${slug}-${formatIsoJalali(report?.reference_time || new Date().toISOString()).replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setPdfError(true)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/65 p-0 md:p-6" onClick={onClose}>
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-2xl max-h-[88vh] flex flex-col rounded-t-[26px] md:rounded-[26px] border room-border room-surface text-white shadow-2xl"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b room-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">حضور و غیاب</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              {report?.reference_time ? `جلسه‌ی ${formatIsoJalali(report.reference_time)}` : 'جلسه‌ی امروز'} · وضعیت را شما ثبت می‌کنید
            </p>
          </div>
          <button type="button" onClick={downloadPdf} disabled={!rows.length || pdfLoading}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl bg-[var(--room-blue)] text-white font-medium hover:brightness-110 disabled:opacity-40">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            گزارش PDF
          </button>
          <button type="button" onClick={onClose} aria-label="بستن"
            className="room-control w-9 h-9 rounded-xl bg-white/[.045] text-white/50 hover:text-white flex items-center justify-center">
            <X size={17} />
          </button>
        </div>

        {pdfError && <p className="px-4 py-2 text-[11px] text-[var(--room-danger)] border-b room-border">ساخت گزارش PDF ناموفق بود. دوباره تلاش کنید.</p>}

        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b room-border shrink-0 text-[11px]">
          {STATUSES.map((s) => (
            <span key={s.value} className="px-2 py-1 rounded-lg bg-white/[.04]" style={{ color: s.color }}>
              {s.label}: {faNum(counts[s.value])}
            </span>
          ))}
          <span className="px-2 py-1 rounded-lg bg-white/[.04] text-white/50">ثبت‌نشده: {faNum(counts.none)}</span>
          {counts.none > 0 && (
            <button type="button" onClick={markAllUnmarkedPresent}
              className="mr-auto px-2.5 py-1 rounded-lg bg-[var(--room-mint-soft)] text-[var(--room-mint)] hover:brightness-125">
              ثبت همه‌ی ثبت‌نشده‌ها «حاضر»
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 min-h-[160px]">
          {isLoading && <p className="text-center text-sm text-white/40 mt-8">در حال بارگذاری…</p>}
          {isError && <p className="text-center text-sm text-[var(--room-danger)] mt-8">دریافت فهرست ناموفق بود. حضور و غیاب برای این اتاق فعال است؟</p>}
          {!isLoading && !isError && rows.length === 0 && (
            <p className="text-center text-sm text-white/40 mt-8">هنوز کسی وارد نشده است.</p>
          )}

          {rows.map((r) => {
            const current = r.mark?.status
            return (
              <div key={r.key} className="rounded-xl bg-white/[.04] px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.online ? 'bg-[var(--room-mint)]' : 'bg-white/20'}`} title={r.online ? 'آنلاین' : 'آفلاین'} />
                  <button type="button" onClick={() => setOpenNote(openNote === r.key ? null : r.key)}
                    className="flex-1 min-w-[100px] text-right truncate text-sm text-white/90">
                    {r.name}
                  </button>
                  <span className="text-[10px] text-white/35">
                    {r.first_join ? `ورود ${formatIsoTime(r.first_join)}` : 'وارد نشده'}
                    {r.minutes > 0 && ` · ${faNum(r.minutes)} دقیقه`}
                    {r.auto_status === 'late' && r.first_join && ' · دیر وارد شد'}
                  </span>
                  <div className="flex gap-1">
                    {STATUSES.map((s) => (
                      <button key={s.value} type="button" disabled={isSaving}
                        onClick={() => mark(r.key, s.value, r.mark?.note || '')}
                        className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                        style={current === s.value
                          ? { background: s.color, color: '#0b1220', fontWeight: 600 }
                          : { background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.55)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {openNote === r.key && (
                  <NoteField initial={r.mark?.note || ''} disabled={!current}
                    placeholder={current ? 'یادداشت (مثلاً دلیل غیبت)' : 'اول وضعیت را ثبت کنید'}
                    onSave={(note) => mark(r.key, current, note)} />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t room-border shrink-0">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAbsent()}
            placeholder="افزودن غایبِ وارد‌نشده (نام)"
            className="flex-1 bg-white/[.05] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-[var(--room-blue)]/50" />
          <button type="button" onClick={addAbsent} disabled={!newName.trim()}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl bg-white/[.06] text-white/70 hover:bg-white/10 disabled:opacity-40">
            <Plus size={14} /> غایب
          </button>
        </div>
      </div>
    </div>
  )
})

function NoteField({ initial, onSave, disabled, placeholder }) {
  const [value, setValue] = useState(initial)
  return (
    <input value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== initial && onSave(value)}
      placeholder={placeholder}
      className="mt-2 w-full bg-white/[.05] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none disabled:opacity-50" />
  )
}
