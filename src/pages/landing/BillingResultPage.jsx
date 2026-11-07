import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Loader2, LogIn, RefreshCw, XCircle } from 'lucide-react'
import { paymentsService } from '../../services/payments'
import { useAuthStore } from '../../store/authStore'
import { formatIsoJalali } from '../../utils/jalali'
import { formatMoney, primaryButtonClass, secondaryButtonClass } from '../../components/shared/PlanCard'

const POLL_MS = 2500
const POLL_LIMIT_MS = 60000
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2c55d4]/35'

const VIEWS = {
  paid: { tone: 'ok', title: 'پرداخت با موفقیت انجام شد', text: 'پرداخت شما تأیید و اشتراک ثبت شد.' },
  failed: { tone: 'bad', title: 'پرداخت انجام نشد', text: 'پرداخت ناموفق بود یا لغو شد. اگر مبلغی از حساب شما کسر شده، معمولاً تا چند ساعت به حساب شما برمی‌گردد.' },
  pending: { tone: 'wait', title: 'در حال بررسی پرداخت', text: 'نتیجه پرداخت در حال تأیید است. لطفاً این صفحه را نبندید.' },
  stalled: { tone: 'wait', title: 'هنوز نتیجه‌ای نرسیده است', text: 'تأیید پرداخت کمی طول کشیده است. اگر پرداخت را کامل کرده‌اید نگران نباشید؛ نتیجه خودکار ثبت می‌شود و در بخش «اشتراک و پرداخت» می‌بینید.' },
  unknown: { tone: 'bad', title: 'شناسه سفارش پیدا نشد', text: 'آدرس بازگشت ناقص است. برای خرید، از صفحه تعرفه‌ها دوباره شروع کنید.' },
  error: { tone: 'bad', title: 'دریافت وضعیت سفارش ممکن نشد', text: 'اتصال را بررسی و دوباره تلاش کنید. سفارش شما از بین نرفته است.' },
}
const TONES = {
  ok: { box: 'bg-[#dcf6ec]', icon: 'text-[#0b5f47]' },
  bad: { box: 'bg-[#fde4e8]', icon: 'text-[#8f1627]' },
  wait: { box: 'bg-[#e6edff]', icon: 'text-[#1f3f9c]' },
}

function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-[#46536b]">{label}</dt><dd className="font-extrabold text-[#101827]">{children}</dd></div>
}

export default function BillingResultPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order')
  const isAuthenticated = useAuthStore((s) => Boolean(s.token))
  const queryClient = useQueryClient()
  const [stalled, setStalled] = useState(false)
  const headingRef = useRef(null)

  useEffect(() => {
    setStalled(false)
    const timer = window.setTimeout(() => setStalled(true), POLL_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [orderId])

  const { data: order, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['payment-order-result', orderId],
    queryFn: () => paymentsService.order(orderId).then((r) => r.data),
    enabled: Boolean(orderId) && isAuthenticated,
    refetchInterval: (query) => (!stalled && (!query.state.data || query.state.data.status === 'pending') ? POLL_MS : false),
    refetchOnWindowFocus: true,
    retry: 2,
  })

  const status = order?.status
  useEffect(() => {
    if (status === 'paid') {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] })
    }
  }, [status, queryClient])

  const needLogin = Boolean(orderId) && !isAuthenticated
  const key = !orderId ? 'unknown'
    : needLogin ? null
    : status === 'paid' ? 'paid'
    : status === 'failed' || status === 'canceled' ? 'failed'
    : isError && !order ? 'error'
    : stalled ? 'stalled'
    : 'pending'
  const view = key ? VIEWS[key] : null
  const tone = TONES[view?.tone || 'wait']

  useEffect(() => { if (!isLoading) headingRef.current?.focus() }, [key, isLoading])

  const sub = order?.subscription_info
  const subLine = sub ? (sub.status === 'scheduled'
    ? `اشتراک شما رزرو شد و از ${formatIsoJalali(sub.starts_at)} شروع می‌شود.`
    : `اشتراک شما فعال است و تا ${formatIsoJalali(sub.expires_at)} اعتبار دارد.`) : ''
  const waiting = key === 'pending' || isLoading

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4 sm:p-6" dir="rtl">
    <section aria-labelledby="result-title" className="w-full max-w-xl rounded-3xl border-2 border-[#d9e1ee] bg-white p-6 text-center text-[#101827] shadow-[0_24px_80px_rgba(25,48,91,.12)] sm:p-9">
      <div aria-hidden="true" className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${needLogin ? 'bg-[#e6edff]' : tone.box}`}>
        {waiting ? <Loader2 className="h-9 w-9 animate-spin text-[#1f3f9c]" />
          : needLogin ? <LogIn className="h-9 w-9 text-[#1f3f9c]" />
          : view.tone === 'ok' ? <CheckCircle2 className={`h-10 w-10 ${tone.icon}`} />
          : view.tone === 'bad' ? <XCircle className={`h-10 w-10 ${tone.icon}`} />
          : <Clock3 className={`h-10 w-10 ${tone.icon}`} />}
      </div>
      <p className="mt-5 text-sm font-bold text-[#2347b4]">اَوسترو میت · نتیجه پرداخت</p>
      <div role="status" aria-live="polite">
        <h1 id="result-title" ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-extrabold outline-none">
          {needLogin ? 'برای دیدن نتیجه وارد شوید' : isLoading ? 'در حال دریافت نتیجه' : view.title}
        </h1>
        <p className="mt-3 text-base leading-8 text-[#34415a]">
          {needLogin ? 'برای حفظ امنیت، نتیجه سفارش فقط پس از ورود به حساب نمایش داده می‌شود. پرداخت شما از ورود‌نکردن تأثیر نمی‌پذیرد.' : isLoading ? 'لطفاً چند لحظه صبر کنید…' : view.text}
        </p>
        {key === 'paid' && subLine && <p className="mt-2 text-base font-bold leading-8 text-[#0b5f47]">{subLine}</p>}
      </div>

      {order && !needLogin && <dl className="mt-6 space-y-3 rounded-2xl border-2 border-[#e5eaf2] bg-[#f8faff] p-4 text-start text-sm">
        {order.plan?.name && <Row label="پلن">{order.plan.name} · {Number(order.days).toLocaleString('fa-IR')} روز</Row>}
        <Row label="مبلغ">{formatMoney(order.total)}</Row>
        <Row label="وضعیت">{{ paid: 'پرداخت‌شده', pending: 'در انتظار تأیید', failed: 'ناموفق', canceled: 'لغوشده' }[order.status] || order.status}</Row>
        {order.billing_ref_id && <Row label="شماره پیگیری"><span dir="ltr">{order.billing_ref_id}</span></Row>}
        <div className="border-t-2 border-[#e5eaf2] pt-3 text-[13px] text-[#46536b]">کد سفارش: <span dir="ltr" className="break-all">{order.id}</span></div>
      </dl>}

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {needLogin
          ? <Link to={`/login?next=${encodeURIComponent(`/billing/result?order=${orderId}`)}`} className={primaryButtonClass}>ورود و دیدن نتیجه</Link>
          : key === 'paid' ? <Link to="/dashboard/subscription" className={primaryButtonClass}>مشاهده اشتراک</Link>
          : key === 'failed' || key === 'unknown' ? <Link to="/pricing" className={primaryButtonClass}>بازگشت به تعرفه‌ها</Link>
          : <Link to="/dashboard/subscription" className={primaryButtonClass}>رفتن به اشتراک و پرداخت</Link>}
        {key === 'paid' ? <Link to="/dashboard" className={secondaryButtonClass}>رفتن به داشبورد</Link>
          : key === 'failed' || key === 'unknown' ? <Link to="/dashboard/subscription" className={secondaryButtonClass}>اشتراک و پرداخت</Link>
          : <Link to="/pricing" className={secondaryButtonClass}>بازگشت به تعرفه‌ها</Link>}
      </div>

      {(key === 'pending' || key === 'stalled' || key === 'error') && <button type="button" onClick={() => { setStalled(false); refetch() }} disabled={isFetching}
        className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#1f3f9c] hover:bg-[#e6edff] disabled:opacity-60 ${focusRing}`}>
        <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" /> بررسی دوباره وضعیت
      </button>}
    </section>
  </main>
}
