import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Archive, ChevronLeft, ClipboardList, GraduationCap, Loader2 } from 'lucide-react'
import { classReportsService } from '../../services/reports'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'
const TABS = [
  { id: 'active', label: 'کلاس‌ها', icon: GraduationCap },
  { id: 'archive', label: 'بایگانی', icon: Archive },
]

export default function ClassReportsPage() {
  const [tab, setTab] = useState('active')
  const archived = tab === 'archive'
  const { data: classes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['class-reports', archived],
    queryFn: () => classReportsService.list(archived).then((r) => r.data),
  })

  return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl"><div className="mx-auto max-w-[1100px]">
    <header className="mb-6 rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_12px_38px_rgba(20,35,65,.05)] sm:p-7">
      <p className="mb-2 text-xs font-bold text-[#4f7cff]">گزارش‌ها</p>
      <h1 className="text-2xl font-extrabold text-[#101827]">گزارش برگزاری کلاس‌ها</h1>
      <p className="mt-2 text-sm leading-7 text-[#68758a]">یک کلاس را باز کنید، روز موردنظر را انتخاب کنید و فهرست حاضران همان روز را ببینید یا به‌صورت PDF بگیرید.</p>
    </header>

    <section className="meet-card overflow-hidden">
      <div role="tablist" aria-label="نوع کلاس‌ها" className="flex gap-1 border-b border-[#e5eaf2] p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" id={`reports-tab-${id}`} aria-selected={tab === id} aria-controls="reports-panel" onClick={() => setTab(id)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${focusRing} ${tab === id ? 'bg-[#edf2ff] text-[#3d66e8]' : 'text-[#46536b] hover:bg-[#f3f6fc]'}`}>
            <Icon size={16} aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      <div id="reports-panel" role="tabpanel" aria-labelledby={`reports-tab-${tab}`}>
        {isLoading ? <div role="status" className="flex justify-center py-20"><Loader2 className="animate-spin text-[#4f7cff]" aria-hidden="true" /><span className="sr-only">در حال دریافت کلاس‌ها</span></div>
          : isError ? <div role="alert" className="p-10 text-center"><p className="font-bold">دریافت کلاس‌ها انجام نشد.</p><button type="button" onClick={() => refetch()} className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold text-[#4f7cff] ${focusRing}`}>تلاش دوباره</button></div>
          : classes.length === 0 ? <div className="px-5 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff]">{archived ? <Archive aria-hidden="true" /> : <ClipboardList aria-hidden="true" />}</span>
            <h2 className="mt-4 font-bold">{archived ? 'بایگانی خالی است' : 'هنوز کلاسی ندارید'}</h2>
            <p className="mt-2 text-sm text-[#8d98aa]">{archived ? 'کلاس‌هایی که حذف می‌کنید، همراه با گزارش‌هایشان اینجا نگهداری می‌شوند.' : 'پس از ساخت و برگزاری کلاس، گزارش آن در این جدول نمایش داده می‌شود.'}</p>
          </div>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">{archived ? 'کلاس‌های بایگانی‌شده' : 'فهرست کلاس‌ها'}</caption>
              <thead className="bg-[#f8faff] text-xs text-[#68758a]">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3 text-center font-bold">ردیف</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">کلاس</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">معلم</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">روزهای برگزاری</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">{archived ? 'تاریخ حذف' : 'آخرین برگزاری'}</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">گزارش</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f5]">
                {classes.map((item, index) => (
                  <tr key={item.slug} className="hover:bg-[#f9fbff]">
                    <td className="px-4 py-3.5 text-center tabular-nums text-[#8d98aa]">{fa(index + 1)}</td>
                    <th scope="row" className="px-4 py-3.5 text-right font-bold text-[#101827]">{item.title}{archived && <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-[#f1f3f7] px-2 py-0.5 text-[11px] font-bold text-[#68758a]"><Archive size={11} aria-hidden="true" />بایگانی</span>}</th>
                    <td className="px-4 py-3.5 text-right text-[#46536b]">{item.teacher || '—'}</td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-[#101827]">{item.days_count ? `${fa(item.days_count)} روز` : '—'}</td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-[#46536b]">{archived ? (item.deleted_jalali || '—') : (item.last_held_jalali || 'برگزار نشده')}</td>
                    <td className="px-4 py-3.5 text-left">
                      <Link to={`/dashboard/reports/${encodeURIComponent(item.slug)}`} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#dbe4f6] px-3 text-xs font-bold text-[#3d66e8] hover:bg-[#edf2ff] ${focusRing}`}>مشاهده گزارش<ChevronLeft size={14} aria-hidden="true" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </div>
    </section>
  </div></div>
}
