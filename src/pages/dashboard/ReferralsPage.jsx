import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, BadgeCheck, Check, CheckCircle2, Clock3, Copy, Gift, History, Percent, Share2, Sparkles, UserCheck, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { referralsService } from '../../services/referrals'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const money = (value) => `${fa(value)} ریال`
const dateText = (value) => (value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'

// رنگ و برچسب هر نوع رویداد در تاریخچه
const EVENT_STYLE = {
  credit_earned: { tone: 'green', label: 'اعتبار گرفتید' },
  wallet_charged: { tone: 'green', label: 'شارژ کیف پول' },
  credit_applied: { tone: 'blue', label: 'تخفیف اعمال شد' },
  wallet_used: { tone: 'blue', label: 'مصرف کیف پول' },
  referred_joined: { tone: 'violet', label: 'ثبت‌نام جدید' },
  referred_purchased: { tone: 'violet', label: 'خرید دوست شما' },
  code_used: { tone: 'violet', label: 'کد ثبت شد' },
  credit_capped: { tone: 'amber', label: 'باقی‌مانده نگه داشته شد' },
}
const TONES = {
  green: { dot: 'bg-[#1fa67a]', chip: 'bg-[#e8faf4] text-[#168260]', value: 'text-[#168260]' },
  blue: { dot: 'bg-[#4f7cff]', chip: 'bg-[#edf2ff] text-[#315bd5]', value: 'text-[#315bd5]' },
  violet: { dot: 'bg-[#8b6cf0]', chip: 'bg-[#f1edff] text-[#6a4ed0]', value: 'text-[#6a4ed0]' },
  amber: { dot: 'bg-[#e59a2f]', chip: 'bg-[#fff4df] text-[#9a6200]', value: 'text-[#9a6200]' },
  gray: { dot: 'bg-[#a9b4c6]', chip: 'bg-[#f2f4f8] text-[#64728a]', value: 'text-[#64728a]' },
}

function Section({ title, hint, children }) {
  return <section className="rounded-[22px] border border-[#e5eaf2] bg-white p-5 shadow-[0_12px_38px_rgba(20,35,65,.045)] sm:p-6">
    <div className="mb-4"><h2 className="text-base font-extrabold text-[#17233a]">{title}</h2>{hint && <p className="mt-1 text-xs leading-6 text-[#8d98aa]">{hint}</p>}</div>
    {children}
  </section>
}

function StatusCard({ icon: Icon, label, value, hint, accent = false }) {
  return <div className={`rounded-2xl border p-4 sm:p-5 ${accent ? 'border-[#bfeedd] bg-[#f1fbf7]' : 'border-[#e5eaf2] bg-white'}`}>
    <div className="flex items-center gap-2 text-[#748198]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-[#dcf6ec] text-[#168260]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon size={18} /></span>
      <span className="text-xs font-bold">{label}</span>
    </div>
    <p className="mt-3 text-2xl font-black tabular-nums text-[#17233a]">{value}</p>
    {hint && <p className="mt-1 text-[11px] leading-5 text-[#8d98aa]">{hint}</p>}
  </div>
}

function Step({ n, title, text }) {
  return <li className="flex gap-3 rounded-2xl bg-[#f6f8fc] p-4">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4f7cff] text-sm font-black text-white">{fa(n)}</span>
    <div><p className="text-sm font-extrabold text-[#17233a]">{title}</p><p className="mt-1 text-xs leading-6 text-[#64728a]">{text}</p></div>
  </li>
}

export default function ReferralsPage() {
  const [copied, setCopied] = useState('')
  const [tab, setTab] = useState('people')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-referral'],
    queryFn: () => referralsService.me().then((r) => r.data),
    staleTime: 15000,
  })

  async function copy(text, key, label) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1600)
      toast.success(`${label} کپی شد`)
    } catch {
      toast.error('کپی خودکار در این مرورگر در دسترس نیست.')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-[#748198]">در حال دریافت اطلاعات معرفی…</div>
  if (isError || !data) return <div className="p-8 text-center"><p className="text-sm text-[#a33b4b]">دریافت اطلاعات معرفی ناموفق بود.</p><button onClick={() => refetch()} className="mt-3 rounded-xl bg-[#315bd5] px-4 py-2 text-sm font-bold text-white">تلاش دوباره</button></div>

  const wallet = data.method === 'wallet_cashback'
  const percent = fa(data.percent)
  const depth = fa(data.chain_depth)
  const credit = Number(data.direct_credit_percent || 0)
  const walletBalance = Number(data.wallet_balance || 0)
  const hasBalance = credit > 0 || walletBalance > 0
  const pending = Number(data.pending_referrals || 0)
  const cap = data.cap || {}
  const events = data.events || []
  const people = data.referrals || []

  const inviteStep = ['کد یا لینک دعوت را بفرستید', 'کد اختصاصی شما بالای همین صفحه است. دوستتان می‌تواند هنگام ثبت‌نام یا قبل از اولین خرید خودش آن را وارد کند.']
  const friendStep = [`دوستتان ${percent}٪ تخفیف می‌گیرد`, 'وقتی او با کد شما پلن می‌خرد، همین مقدار از قیمت خریدش کم می‌شود.']
  const yourStep = wallet
    ? ['همان مبلغ به کیف پول شما واریز می‌شود', `بعد از خرید موفق دوستتان، مبلغ تخفیفِ او به کیف پول شما می‌آید و در خرید بعدی‌تان خودکار کم می‌شود. این مزیت برای ${depth} نفر قبل از خریدار هم برقرار است.`]
    : [`شما ${percent}٪ اعتبار تخفیف می‌گیرید`, `بعد از خرید موفق دوستتان، اعتبار به حساب شما اضافه می‌شود و در خرید بعدی‌تان خودکار اعمال می‌شود. این مزیت برای ${depth} نفر قبل از خریدار هم برقرار است.`]
  const steps = [inviteStep, friendStep, yourStep]

  let capRule
  if (wallet) capRule = cap.enabled ? `در هر خرید حداکثر تا ${money(cap.amount)} از کیف پول مصرف می‌شود و باقی‌مانده برای خریدهای بعدی می‌ماند.` : 'موجودی کیف پول در خرید بعدی از مبلغ پلن کم می‌شود و باقی‌مانده می‌ماند.'
  else capRule = cap.enabled ? `در هر خرید حداکثر ${fa(cap.percent)}٪ از قیمت با اعتبار معرفی کم می‌شود و باقی‌مانده برای خریدهای بعدی می‌ماند.` : 'اعتبار جمع‌شده تا سقف قیمت پلن مصرف می‌شود و باقی‌مانده برای خریدهای بعدی می‌ماند.'
  const rules = [
    'فقط خرید موفق و پرداخت‌شده حساب می‌شود؛ ثبت‌نام تنهایی اعتبار نمی‌سازد.',
    `هر خرید افرادِ معرفی‌شده دوباره حساب می‌شود، نه فقط خرید اول. دایره‌ی مشمولان هر بار خریدار و ${depth} نفر قبل از اوست؛ مثلاً اگر دوستِ دوستتان خرید کند، شما هم شامل می‌شوید.`,
    capRule,
    'اعتبار و موجودی کیف پول تاریخ انقضا ندارند.',
    'تخفیف‌های دیگر (مدت اشتراک، مدارس دولتی، کد تخفیف) اول حساب می‌شوند و تخفیف معرفی روی قیمت نهایی اعمال می‌شود.',
  ]

  const tabs = [
    { id: 'people', label: 'افراد معرفی‌شده', icon: Users, count: people.length },
    { id: 'history', label: 'تاریخچه فعالیت‌ها', icon: History, count: events.length },
  ]

  return <div dir="rtl" className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1100px] space-y-5">

      <header className="rounded-[26px] bg-[#101d3b] p-5 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9eb6ff]"><Gift size={14} />باشگاه معرفی اَوسترو</p>
            <h1 className="mt-2 text-2xl font-black">دوستانتان را دعوت کنید، هر دو تخفیف بگیرید</h1>
            <p className="mt-2 text-sm leading-7 text-[#cbd5eb]">با کد اختصاصی خودتان، هم دوستتان و هم شما از مزایای معرفی بهره‌مند می‌شوید. همه‌چیز در همین صفحه شفاف ثبت می‌شود.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 md:min-w-[290px]">
            <p className="text-[11px] text-[#b9c7e3]">کد اختصاصی شما</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <strong dir="ltr" className="text-2xl tracking-[.16em]">{data.code}</strong>
              <button type="button" onClick={() => copy(data.code, 'code', 'کد معرف')} aria-label="کپی کد معرف" className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 ${focusRing}`}>{copied === 'code' ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
            <button type="button" onClick={() => copy(data.referral_url, 'link', 'لینک دعوت')} className={`mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#4f7cff] px-3 text-xs font-bold text-white hover:bg-[#628aff] ${focusRing}`}>{copied === 'link' ? <Check size={15} /> : <Share2 size={15} />}کپی لینک دعوت</button>
          </div>
        </div>
        {!data.enabled && <p className="mt-4 rounded-xl bg-[#fff3e0] px-3 py-2 text-xs font-bold text-[#865b16]">سیستم معرفی در حال حاضر غیرفعال است؛ کد شما محفوظ می‌ماند.</p>}
      </header>

      {data.referred_by && <div className="flex items-start gap-3 rounded-2xl border border-[#cfe0ff] bg-[#f3f6ff] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dfe8ff] text-[#315bd5]"><BadgeCheck size={18} /></span>
        <div><p className="text-sm font-extrabold text-[#2b4fb8]">شما با کد «{data.referred_by.name}» معرفی شده‌اید</p><p className="mt-1 text-xs leading-6 text-[#5a6b8c]">در هر خرید پلن، {percent}٪ تخفیف معرفی خودکار روی قیمت شما اعمال می‌شود.</p></div>
      </div>}

      <Section title="وضعیت شما" hint="اعتبار فقط بعد از خرید موفق افراد معرفی‌شده ثبت می‌شود؛ ثبت‌نام آن‌ها به‌تنهایی اعتبار نمی‌سازد.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard icon={Percent} label="اعتبار تخفیف شما" value={`${fa(credit)}٪`} hint={credit > 0 ? 'در خرید بعدی خودکار اعمال می‌شود' : 'هنوز اعتباری ثبت نشده'} accent={credit > 0} />
          <StatusCard icon={Wallet} label="موجودی کیف پول" value={money(walletBalance)} hint={walletBalance > 0 ? 'در خرید بعدی از مبلغ کم می‌شود' : 'بدون تاریخ انقضا'} accent={walletBalance > 0} />
          <StatusCard icon={Clock3} label="در انتظار خرید" value={`${fa(pending)} نفر`} hint={pending > 0 ? 'با اولین خرید موفق آن‌ها اعتبار شما ثبت می‌شود' : 'ثبت‌نام‌شده‌هایی که هنوز نخریده‌اند'} />
          <StatusCard icon={UserCheck} label="خرید موفق معرفی‌شده‌ها" value={`${fa(data.paid_referrals)} از ${fa(data.total_referrals)}`} hint="افراد معرفی‌شده‌ای که خرید کرده‌اند" />
        </div>
        {hasBalance && <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl bg-[#101d3b] p-4 text-white sm:flex-row sm:items-center">
          <p className="text-sm leading-7"><Sparkles size={15} className="ml-1 inline text-[#7be7c7]" />اعتبار شما آماده مصرف است؛ هنگام ساخت پلن به‌صورت خودکار در پیش‌فاکتور اعمال می‌شود.</p>
          <Link to="/dashboard/pricing" className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-[#101d3b] hover:bg-[#eef2ff] ${focusRing}`}>خرید پلن با اعتبار<ArrowLeft size={15} /></Link>
        </div>}
      </Section>

      <Section title="چطور کار می‌کند؟" hint={`روش فعال: ${data.method_label} — ${percent}٪`}>
        <ol className="grid gap-3 lg:grid-cols-3">{steps.map(([title, text], index) => <Step key={title} n={index + 1} title={title} text={text} />)}</ol>
      </Section>

      <Section title="افراد و تاریخچه">
        <div role="tablist" aria-label="افراد و تاریخچه" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-[#f3f6fc] p-1">
          {tabs.map(({ id, label, icon: Icon, count }) => <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${focusRing} ${tab === id ? 'bg-white text-[#3d66e8] shadow-sm' : 'text-[#64728a] hover:text-[#34415a]'}`}><Icon size={16} />{label}<span className="rounded-full bg-[#edf2ff] px-2 py-0.5 text-[10px] text-[#3d66e8]">{fa(count)}</span></button>)}
        </div>

        {tab === 'people' && (people.length === 0
          ? <div className="py-10 text-center"><Users className="mx-auto text-[#b5c0d0]" size={30} /><p className="mt-3 text-sm font-bold text-[#34415a]">هنوز کسی با کد شما ثبت‌نام نکرده است</p><p className="mt-1 text-xs text-[#8d98aa]">لینک دعوت را برای دوستانتان بفرستید.</p><button type="button" onClick={() => copy(data.referral_url, 'link', 'لینک دعوت')} className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#4f7cff] px-4 text-xs font-bold text-white ${focusRing}`}><Share2 size={15} />کپی لینک دعوت</button></div>
          : <ul className="divide-y divide-[#edf0f5]">{people.map((person) => <li key={person.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf2ff] text-sm font-black text-[#3d66e8]">{(person.name || 'ک').slice(0, 1)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-[#34415a]">{person.name}</p><p dir="ltr" className="mt-0.5 text-right text-[11px] text-[#8d98aa]">{person.phone}</p></div></div>
            <div className="shrink-0 text-left"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${person.has_paid ? 'bg-[#e8faf4] text-[#168260]' : 'bg-[#f2f4f8] text-[#77849a]'}`}>{person.has_paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{person.has_paid ? 'خرید موفق' : 'منتظر خرید'}</span><p className="mt-1 text-[10px] text-[#9aa4b5]">{dateText(person.joined_at)}</p></div>
          </li>)}</ul>)}

        {tab === 'history' && (events.length === 0
          ? <p className="py-10 text-center text-sm text-[#8d98aa]">هنوز رویدادی ثبت نشده است.</p>
          : <ol>{events.map((event, index) => {
            const style = EVENT_STYLE[event.type] || { tone: 'gray', label: event.title }
            const tone = TONES[style.tone]
            const value = event.amount ? money(event.amount) : (event.percent ? `${fa(event.percent)}٪` : '')
            return <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              <div className="relative flex w-5 shrink-0 justify-center"><span className={`mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${tone.dot}`} />{index !== events.length - 1 && <span className="absolute bottom-0 top-5 w-px bg-[#e5eaf2]" />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>{style.label}</span><span className="text-[10px] text-[#9aa4b5]">{dateText(event.created_at)}</span></div>
                <p className="mt-1.5 text-xs leading-6 text-[#4a566c]">{event.message}</p>
              </div>
              {value && <div className={`shrink-0 text-left text-xs font-black tabular-nums ${tone.value}`}>{value}</div>}
            </li>
          })}</ol>)}
      </Section>

      <Section title="قوانین به زبان ساده">
        <ul className="space-y-2">{rules.map((rule) => <li key={rule} className="flex gap-2 text-xs leading-6 text-[#4a566c]"><AlertCircle size={15} className="mt-1 shrink-0 text-[#4f7cff]" /><span>{rule}</span></li>)}</ul>
      </Section>
    </div>
  </div>
}
