import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Copy, Gift, Users, Wallet, Percent, Check, Clock3, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { referralsService } from '../../services/referrals'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const money = (value) => `${fa(value)} ریال`
const dateText = (value) => value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function Metric({ icon: Icon, label, value, hint }) {
  return <div className="rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
    <div className="flex items-center gap-2 text-[#748198]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Icon size={18}/></span><span className="text-xs font-semibold">{label}</span></div>
    <p className="mt-3 text-2xl font-black tabular-nums text-[#17233a]">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-[#8d98aa]">{hint}</p>}
  </div>
}

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-referral'],
    queryFn: () => referralsService.me().then(r => r.data),
    staleTime: 15000,
  })

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      toast.success(`${label} کپی شد`)
    } catch {
      toast.error('کپی خودکار در این مرورگر در دسترس نیست.')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-[#748198]">در حال دریافت اطلاعات معرفی…</div>
  if (isError || !data) return <div className="p-8 text-center"><p className="text-sm text-[#a33b4b]">دریافت اطلاعات معرفی ناموفق بود.</p><button onClick={() => refetch()} className="mt-3 rounded-xl bg-[#315bd5] px-4 py-2 text-sm font-bold text-white">تلاش دوباره</button></div>

  const direct = data.method === 'direct_discount'
  return <div dir="rtl" className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1250px] space-y-5">
      <header className="rounded-[26px] bg-[#101d3b] p-5 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div><p className="text-xs font-bold text-[#9eb6ff]">باشگاه معرفی اَوسترو</p><h1 className="mt-2 text-2xl font-black">معرفی دیگران</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[#cbd5eb]">کد اختصاصی خود را برای دیگران بفرستید و رویدادها، اعتبارها و پاداش‌های معرفی را در همین صفحه پیگیری کنید.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 md:min-w-[280px]">
            <p className="text-[11px] text-[#b9c7e3]">کد اختصاصی شما</p><div className="mt-2 flex items-center justify-between gap-3"><strong dir="ltr" className="text-2xl tracking-[.16em]">{data.code}</strong><button type="button" onClick={() => copy(data.code, 'کد معرف')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="کپی کد معرف">{copied ? <Check size={18}/> : <Copy size={18}/>}</button></div>
            <button type="button" onClick={() => copy(data.referral_url, 'لینک معرفی')} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#4f7cff] px-3 text-xs font-bold text-white hover:bg-[#628aff]"><Share2 size={15}/>کپی لینک دعوت</button>
          </div>
        </div>
        {!data.enabled && <p className="mt-4 rounded-xl bg-[#fff3e0] px-3 py-2 text-xs font-bold text-[#865b16]">سیستم معرفی در حال حاضر غیرفعال است؛ کد شما محفوظ می‌ماند.</p>}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="افراد معرفی‌شده" value={fa(data.total_referrals)} hint={`${fa(data.paid_referrals)} خرید قطعی`}/>
        <Metric icon={Percent} label="اعتبار تخفیف" value={`${fa(data.direct_credit_percent)}٪`} hint="قابل استفاده در خریدهای پلن"/>
        <Metric icon={Wallet} label="موجودی کیف پول" value={money(data.wallet_balance)} hint="بدون تاریخ انقضا"/>
        <Metric icon={Gift} label="درصد فعال معرفی" value={`${fa(data.percent)}٪`} hint={data.method_label}/>
      </div>

      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-[#e5eaf2] bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#17233a]">قوانین سیستم معرفی</h2><span className="rounded-full bg-[#edf2ff] px-3 py-1 text-[10px] font-bold text-[#315bd5]">{data.method_label}</span></div>
          <p className="mt-3 text-sm leading-7 text-[#64728a]">{direct ? data.rules.direct_discount : data.rules.wallet_cashback}</p>
          <div className="mt-3 rounded-xl bg-[#f6f8fc] p-3 text-xs leading-6 text-[#64728a]"><b className="text-[#34415a]">قانون زنجیره: </b>{data.rules.chain}</div>
          <div className="mt-2 rounded-xl bg-[#f6f8fc] p-3 text-xs leading-6 text-[#64728a]">{data.rules.credit_expiry}</div>
        </div>
        <div className="rounded-2xl border border-[#e5eaf2] bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-extrabold text-[#17233a]">افرادی که معرفی کرده‌اید</h2><span className="text-xs text-[#8d98aa]">{fa(data.referrals.length)} نفر</span></div>
          {data.referrals.length === 0 ? <div className="py-10 text-center"><Users className="mx-auto text-[#b5c0d0]" size={28}/><p className="mt-3 text-sm text-[#748198]">هنوز کسی با کد شما ثبت‌نام نکرده است.</p></div>
            : <div className="mt-3 divide-y divide-[#edf0f5]">{data.referrals.map(person => <div key={person.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#34415a]">{person.name}</p><p dir="ltr" className="mt-1 text-right text-[11px] text-[#8d98aa]">{person.phone}</p></div><div className="shrink-0 text-left"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${person.has_paid ? 'bg-[#e8faf4] text-[#168260]' : 'bg-[#f2f4f8] text-[#77849a]'}`}>{person.has_paid ? 'خرید قطعی' : 'ثبت‌نام‌شده'}</span><p className="mt-1 text-[10px] text-[#9aa4b5]">{dateText(person.joined_at)}</p></div></div>)}</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e5eaf2] bg-white p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-extrabold text-[#17233a]">تاریخچه فعالیت‌ها</h2><p className="mt-1 text-xs text-[#8d98aa]">تمام رویدادهای ثبت‌شده در سیستم معرفی</p></div><Clock3 size={18} className="text-[#8d98aa]"/></div>
        {data.events.length === 0 ? <p className="py-8 text-center text-sm text-[#8d98aa]">هنوز رویدادی ثبت نشده است.</p>
          : <div className="space-y-0">{data.events.map((event, index) => <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            <div className="relative flex w-5 shrink-0 justify-center"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#4f7cff]"/>{index !== data.events.length - 1 && <span className="absolute top-5 bottom-0 w-px bg-[#e5eaf2]"/>}</div>
            <div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-[#34415a]">{event.title}</p><p className="mt-1 text-xs leading-6 text-[#64728a]">{event.message}</p><p className="mt-1 text-[10px] text-[#9aa4b5]">{dateText(event.created_at)}</p></div>
            {(event.amount || event.percent) && <div className="shrink-0 text-left text-xs font-bold tabular-nums text-[#168260]">{event.amount ? money(event.amount) : `${fa(event.percent)}٪`}</div>}
          </div>)}</div>}
      </section>
    </div>
  </div>
}
