import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Archive, ArrowRight, CalendarDays, Clock3, Download, Loader2, Users } from 'lucide-react'
import { JalaliDateTimePicker } from '../../components/ui/JalaliDateTimePicker'
import { classReportsService } from '../../services/reports'
import { formatLocal, formatIsoTime } from '../../utils/jalali'
import { pdfFilename } from '../../utils/pdfFilename'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'
const STATUS = {
  present: { label: 'حاضر', cls: 'bg-[#e5f8f1] text-[#16815f]' },
  late: { label: 'تأخیر', cls: 'bg-[#fff3df] text-[#9a5b06]' },
  excused: { label: 'موجه', cls: 'bg-[#e8f0ff] text-[#2f55c8]' },
  absent: { label: 'غایب', cls: 'bg-[#fde8eb] text-[#b8283d]' },
}
const duration = (minutes) => {
  const m = Number(minutes || 0)
  if (m <= 0) return '—'
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return `${fa(h)} ساعت و ${fa(r)} دقیقه`
  return h ? `${fa(h)} ساعت` : `${fa(r)} دقیقه`
}
const todayValue = () => formatLocal(new Date()).slice(0, 10)

function Stat({ label, value, tone = 'text-[#101827]' }) {
  return <div className="rounded-2xl border border-[#e5eaf2] bg-white px-4 py-3 text-center">
    <p className="text-xs text-[#8d98aa]">{label}</p>
    <p className={`mt-1 text-xl font-extrabold tabular-nums ${tone}`}>{fa(value)}</p>
  </div>
}

export default function ClassReportDetailPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const date = params.get('date')
  const [pdfLoading, setPdfLoading] = useState(false)

  const daysQuery = useQuery({
    queryKey: ['class-report-days', slug],
    queryFn: () => classReportsService.days(slug).then((r) => r.data),
  })
  const days = daysQuery.data?.days || []

  // بدون تاریخ در آدرس: آخرین روز برگزاری (یا امروز)
  useEffect(() => {
    if (!date && daysQuery.isSuccess) setParams({ date: days[0]?.date || todayValue() }, { replace: true })
  }, [date, daysQuery.isSuccess, days, setParams])

  const dayQuery = useQuery({
    queryKey: ['class-report-day', slug, date],
    queryFn: () => classReportsService.day(slug, date).then((r) => r.data),
    enabled: Boolean(date),
  })
  const report = dayQuery.data
  const room = report?.room || daysQuery.data?.room
  const rows = report?.rows || []
  const summary = report?.summary

  const pickDate = (value) => { if (value) setParams({ date: value.slice(0, 10) }) }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await classReportsService.pdf(slug, date)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFilename(res.headers?.['content-disposition']) || `attendance-${slug}-${date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('دریافت PDF انجام نشد؛ دوباره تلاش کنید.')
    } finally {
      setPdfLoading(false)
    }
  }

  if (daysQuery.isError) return <div className="meet-light-page min-h-full p-8" dir="rtl"><div role="alert" className="meet-card mx-auto max-w-md p-8 text-center"><p className="font-bold">این کلاس پیدا نشد یا دسترسی ندارید.</p><Link to="/dashboard/reports" className={`mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-bold text-[#4f7cff] ${focusRing}`}>بازگشت به گزارش‌ها</Link></div></div>

  return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl"><div className="mx-auto max-w-[1100px]">
    <div className="mb-5 flex items-start gap-3">
      <Link to="/dashboard/reports" aria-label="بازگشت به گزارش‌ها" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#8d98aa] hover:bg-[#edf2ff] hover:text-[#4f7cff] ${focusRing}`}><ArrowRight size={20} aria-hidden="true" /></Link>
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold text-[#101827]">{room?.title || '…'}{room?.archived && <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f7] px-2.5 py-1 text-xs font-bold text-[#68758a]"><Archive size={12} aria-hidden="true" />بایگانی</span>}</h1>
        <p className="mt-1 text-sm text-[#68758a]">{room?.teacher ? `معلم: ${room.teacher}` : 'گزارش برگزاری کلاس'}</p>
      </div>
    </div>

    <section aria-label="انتخاب روز" className="meet-card mb-5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <JalaliDateTimePicker id="report-date" label="تاریخ گزارش" withTime={false} placeholder="انتخاب تاریخ شمسی" value={date ? `${date}T00:00` : ''} onChange={pickDate} />
        </div>
        <button type="button" onClick={downloadPdf} disabled={pdfLoading || !rows.length} title={rows.length ? 'دریافت گزارش این روز' : 'برای این روز فهرستی وجود ندارد'}
          className={`meet-primary-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
          {pdfLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}دانلود PDF
        </button>
      </div>
      {days.length > 0 && <div className="mt-4"><p className="mb-2 text-xs text-[#8d98aa]">روزهای برگزاری</p>
        <div className="flex flex-wrap gap-2">{days.slice(0, 8).map((d) => (
          <button key={d.date} type="button" onClick={() => setParams({ date: d.date })} aria-pressed={d.date === date}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${focusRing} ${d.date === date ? 'border-[#4f7cff] bg-[#edf2ff] text-[#3d66e8]' : 'border-[#e5eaf2] bg-white text-[#46536b] hover:bg-[#f4f7fb]'}`}>
            {d.jalali}<span className="rounded-full bg-white px-1.5 tabular-nums text-[#8d98aa]">{fa(d.attendees)} نفر</span>
          </button>))}</div>
        {days.length > 8 && <p className="mt-2 text-[11px] text-[#8d98aa]">برای روزهای قدیمی‌تر، تاریخ را از انتخابگر بالا بزنید.</p>}
      </div>}
    </section>

    {dayQuery.isLoading || !date ? <div role="status" className="flex justify-center py-20"><Loader2 className="animate-spin text-[#4f7cff]" aria-hidden="true" /><span className="sr-only">در حال دریافت گزارش</span></div>
      : dayQuery.isError ? <div role="alert" className="meet-card p-8 text-center"><p className="font-bold">دریافت گزارش این روز انجام نشد.</p><button type="button" onClick={() => dayQuery.refetch()} className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold text-[#4f7cff] ${focusRing}`}>تلاش دوباره</button></div>
      : <>
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#46536b]" aria-live="polite">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#101827]"><CalendarDays size={16} aria-hidden="true" />{report.jalali_date}</span>
          {report.start && <span className="inline-flex items-center gap-1.5"><Clock3 size={15} aria-hidden="true" />شروع {formatIsoTime(report.start)}{report.online ? ' · در جریان' : report.end ? ` · پایان ${formatIsoTime(report.end)}` : ''}</span>}
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Stat label="وارد‌شده" value={summary.joined} />
          <Stat label="حاضر" value={summary.present} tone="text-[#16815f]" />
          <Stat label="تأخیر" value={summary.late} tone="text-[#9a5b06]" />
          {summary.excused > 0 && <Stat label="موجه" value={summary.excused} tone="text-[#2f55c8]" />}
          {summary.absent > 0 && <Stat label="غایب" value={summary.absent} tone="text-[#b8283d]" />}
        </div>

        <section className="meet-card overflow-hidden" aria-label="فهرست حاضران">
          <div className="flex items-center gap-2 border-b border-[#e5eaf2] px-5 py-4"><Users size={17} className="text-[#4f7cff]" aria-hidden="true" /><h2 className="font-bold">فهرست حاضران ({fa(rows.length)} نفر)</h2></div>
          {rows.length === 0 ? <div className="px-5 py-14 text-center"><p className="font-bold text-[#101827]">در این روز کسی وارد کلاس نشده است.</p><p className="mt-2 text-sm text-[#8d98aa]">روز دیگری را انتخاب کنید{days.length ? ' یا از روزهای برگزاری بالا استفاده کنید' : ''}.</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">حاضران کلاس در {report.jalali_date}</caption>
              <thead className="bg-[#f8faff] text-xs text-[#68758a]"><tr>
                <th scope="col" className="w-12 px-3 py-3 text-center font-bold">ردیف</th>
                <th scope="col" className="px-3 py-3 text-right font-bold">نام</th>
                <th scope="col" className="px-3 py-3 text-center font-bold">ورود</th>
                <th scope="col" className="px-3 py-3 text-center font-bold">خروج</th>
                <th scope="col" className="px-3 py-3 text-center font-bold">مدت حضور</th>
                <th scope="col" className="px-3 py-3 text-center font-bold">وضعیت</th>
                <th scope="col" className="px-3 py-3 text-right font-bold">یادداشت</th>
              </tr></thead>
              <tbody className="divide-y divide-[#eef1f5]">{rows.map((r, i) => {
                const st = STATUS[r.status] || { label: 'ثبت‌نشده', cls: 'bg-[#f1f3f7] text-[#68758a]' }
                return <tr key={r.key} className="even:bg-[#fafbfe]">
                  <td className="px-3 py-3 text-center tabular-nums text-[#8d98aa]">{fa(i + 1)}</td>
                  <th scope="row" className="px-3 py-3 text-right font-bold text-[#101827]">{r.name}{r.is_guest && <small className="mr-1.5 text-[11px] font-normal text-[#9aa4b4]">مهمان</small>}</th>
                  <td className="px-3 py-3 text-center tabular-nums">{r.first_join ? formatIsoTime(r.first_join) : '—'}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{r.online ? 'هنوز آنلاین' : r.last_left ? formatIsoTime(r.last_left) : '—'}</td>
                  <td className="px-3 py-3 text-center">{duration(r.minutes)}</td>
                  <td className="px-3 py-3 text-center"><span className={`inline-flex min-w-[56px] justify-center rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span></td>
                  <td className="px-3 py-3 text-right text-xs text-[#4b5563]">{r.mark?.note || ''}</td>
                </tr>
              })}</tbody>
            </table></div>}
        </section>
        <p className="mt-3 text-[11px] leading-6 text-[#8d98aa]">وضعیت‌ها از روی زمان ورود محاسبه می‌شوند: ورودِ بیش از {fa(report.late_after_minutes)} دقیقه پس از اولین ورود آن روز، «تأخیر» حساب می‌شود. این گزارش فقط نمایش است و حضور و غیاب کلاس را تغییر نمی‌دهد.</p>
      </>}
  </div></div>
}
