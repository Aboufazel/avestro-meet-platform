import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Loader2, Minus, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsService } from '../../services/payments'
import { useAuthStore } from '../../store/authStore'
import { PlanCard, formatMoney, primaryButtonClass } from '../../components/shared/PlanCard'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2c55d4]/35'
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const defaultSelections = (plan) => Object.fromEntries((plan.pricing_items || []).map((item) => [String(item.id), item.min_qty || 0]))

/** مدیریت فوکوس دیالوگ: ورود، حبس Tab، Escape، قفل اسکرول و بازگشت فوکوس */
function useDialog(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('[data-autofocus]')?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !ref.current) return
      const nodes = [...ref.current.querySelectorAll(FOCUSABLE)]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous && previous.focus) previous.focus()
    }
  }, [open, onClose])
  return ref
}

function QuantityStepper({ item, value, onChange }) {
  const min = Number(item.min_qty || 0)
  const max = item.max_qty == null ? Number.MAX_SAFE_INTEGER : Number(item.max_qty)
  const step = Math.max(1, Number(item.step || 1))
  const set = (next) => {
    const clamped = Math.max(min, Math.min(max, Number(next) || 0))
    onChange(Math.max(min, Math.min(max, min + Math.round((clamped - min) / step) * step)))
  }
  const btn = `flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#c3cee2] bg-white text-[#101827] hover:bg-[#eef3ff] disabled:opacity-40 ${focusRing}`
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`کاهش ${item.title}`} disabled={value <= min} onClick={() => set(value - step)} className={btn}><Minus size={18} aria-hidden="true" /></button>
      <output aria-live="polite" aria-label={`${item.title}: ${fa(value)}`} className="min-w-12 text-center text-lg font-extrabold tabular-nums">{fa(value)}</output>
      <button type="button" aria-label={`افزایش ${item.title}`} disabled={value >= max} onClick={() => set(value + step)} className={btn}><Plus size={18} aria-hidden="true" /></button>
    </div>
  )
}

function FeatureToggle({ item, value, onChange }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-[#c3cee2] bg-white px-3 py-2 ${value ? 'border-[#2c55d4] bg-[#eef3ff]' : ''}`}>
      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked ? 1 : 0)} className="h-5 w-5 accent-[#2c55d4]" />
      <span className="text-sm font-bold">{value ? 'شامل می‌شود' : 'شامل نمی‌شود'}</span>
    </label>
  )
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isAuthenticated = useAuthStore((s) => Boolean(s.token))
  const [activeType, setActiveType] = useState('all')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [days, setDays] = useState(1)
  const [selections, setSelections] = useState({})
  const [buying, setBuying] = useState(false)
  const { data: plans = [], isLoading, isError, refetch } = useQuery({ queryKey: ['public-plans'], queryFn: () => paymentsService.plans().then((r) => r.data) })
  const types = useMemo(() => [...new Map(plans.map((p) => [p.plan_type?.id, p.plan_type]).filter(([id, type]) => id && type)).values()], [plans])
  const visiblePlans = plans.filter((p) => activeType === 'all' || p.plan_type?.id === activeType)
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null
  const custom = Boolean(selectedPlan?.is_custom_priced)
  const closeDialog = useCallback(() => setSelectedPlanId(null), [])
  const dialogRef = useDialog(Boolean(selectedPlan), closeDialog)

  const quotePayload = selectedPlan ? { plan_id: selectedPlan.id, ...(custom ? { days, selections } : {}) } : null
  const { data: quote, isFetching: quoteLoading, isError: quoteError, error: quoteErrorDetail } = useQuery({
    queryKey: ['plan-quote', quotePayload],
    queryFn: () => paymentsService.quote(quotePayload).then((r) => r.data),
    enabled: Boolean(selectedPlan),
    staleTime: 0,
  })

  const openPlan = useCallback((plan) => {
    setSelectedPlanId(plan.id)
    setDays(plan.default_days || 1)
    setSelections(defaultSelections(plan))
  }, [])

  const handledSlug = useRef(null)
  useEffect(() => {
    // بازگشت از ورود: پلن انتخاب‌شده فقط یک‌بار خودکار باز می‌شود (بستن دیالوگ آن را دوباره باز نکند)
    const requestedSlug = params.get('plan')
    if (!requestedSlug || !plans.length || handledSlug.current === requestedSlug) return
    const requested = plans.find((plan) => plan.slug === requestedSlug)
    if (requested) { handledSlug.current = requestedSlug; openPlan(requested) }
  }, [params, plans, openPlan])

  const startCheckout = async () => {
    if (!selectedPlan) return
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/pricing?plan=${selectedPlan.slug}`)}`)
      return
    }
    setBuying(true)
    try {
      const { data } = await paymentsService.checkout(custom ? { plan_id: selectedPlan.id, days, selections } : { plan_id: selectedPlan.id })
      if (data.payment_url) window.location.assign(data.payment_url)
      else navigate(data.order_id ? `/billing/result?order=${data.order_id}` : '/dashboard/subscription')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'شروع فرایند خرید انجام نشد. دوباره تلاش کنید.')
    } finally {
      setBuying(false)
    }
  }

  const typeButton = (active) => `min-h-11 shrink-0 rounded-xl border-2 px-4 py-2 text-sm font-bold ${focusRing} ${active ? 'border-[#101827] bg-[#101827] text-white' : 'border-[#c3cee2] bg-white text-[#34415a] hover:bg-[#eef3ff]'}`

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827]" dir="rtl">
      <a href="#plans" className="sr-only focus:not-sr-only focus:fixed focus:right-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold">پرش به فهرست پلن‌ها</a>
      <header className="sticky top-0 z-40 border-b border-[#e5eaf2] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}><img src="/avestro-logo.png" alt="" className="h-9 w-9" /><span className="text-sm font-bold">اَوسترو میت</span></Link>
          <nav aria-label="ناوبری اصلی" className="flex items-center gap-2 text-sm sm:gap-4">
            <Link to="/" className={`min-h-11 rounded-lg px-3 py-2.5 text-[#34415a] hover:text-[#101827] ${focusRing}`}>صفحه اصلی</Link>
            {isAuthenticated
              ? <Link to="/dashboard" className={`min-h-11 rounded-xl bg-[#2c55d4] px-4 py-2.5 font-bold text-white ${focusRing}`}>داشبورد</Link>
              : <Link to="/login" className={`min-h-11 rounded-xl bg-[#2c55d4] px-4 py-2.5 font-bold text-white ${focusRing}`}>ورود</Link>}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
        <section className="mx-auto mb-8 max-w-3xl text-center sm:mb-12">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e6edff] px-3.5 py-1.5 text-sm font-bold text-[#1f3f9c]"><Sparkles size={16} aria-hidden="true" /> تعرفه‌های اَوسترو میت</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">پلنی متناسب با شیوه برگزاری شما</h1>
          <p className="mt-3 text-base leading-8 text-[#46536b]">محدودیت‌ها، امکانات و هزینه هر پلن را شفاف ببینید. مبلغ نهایی و مالیات، پیش از پرداخت در پیش‌فاکتور نمایش داده می‌شود.</p>
        </section>

        {isLoading ? <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-24"><Loader2 className="animate-spin text-[#2c55d4]" aria-hidden="true" /><span className="text-sm text-[#46536b]">در حال دریافت تعرفه‌ها…</span></div>
          : isError ? <div role="alert" className="mx-auto max-w-lg rounded-2xl border-2 border-[#f0c3ca] bg-white p-8 text-center"><p className="text-base font-bold">دریافت تعرفه‌ها ممکن نشد.</p><p className="mt-2 text-sm text-[#46536b]">اتصال اینترنت را بررسی و دوباره تلاش کنید.</p><button type="button" onClick={() => refetch()} className={`mt-5 ${primaryButtonClass} sm:w-auto`}>تلاش دوباره</button></div>
          : plans.length === 0 ? <div className="mx-auto max-w-lg rounded-2xl border-2 border-[#d9e1ee] bg-white p-8 text-center text-base">در حال حاضر پلنی برای نمایش منتشر نشده است.</div>
          : <>
            {types.length > 1 && <div role="group" aria-label="فیلتر پلن‌ها بر اساس نوع" className="mb-6 flex gap-2 overflow-x-auto pb-2">
              <button type="button" aria-pressed={activeType === 'all'} onClick={() => setActiveType('all')} className={typeButton(activeType === 'all')}>همه پلن‌ها</button>
              {types.map((type) => <button type="button" key={type.id} aria-pressed={activeType === type.id} onClick={() => setActiveType(type.id)} className={typeButton(activeType === type.id)}>{type.name}</button>)}
            </div>}
            <p className="sr-only" role="status" aria-live="polite">{fa(visiblePlans.length)} پلن نمایش داده می‌شود</p>
            <ul id="plans" className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePlans.map((plan) => <li key={plan.id} className="flex"><div className="flex w-full"><PlanCard plan={plan} selected={selectedPlanId === plan.id} onSelect={openPlan} /></div></li>)}
            </ul>
          </>}

        <p className="mt-8 flex items-start gap-3 text-sm leading-7 text-[#46536b]"><ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0f7a5c]" />قیمت نهایی فقط در سرور محاسبه می‌شود و پیش از پرداخت، جزئیات مبلغ و مالیات به شما نمایش داده خواهد شد.</p>
      </main>

      {selectedPlan && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#101827]/70 p-0 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invoice-title" aria-describedby="invoice-desc" dir="rtl" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 text-[#101827] shadow-2xl sm:rounded-3xl sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2347b4]">{custom ? 'سازنده پلن' : 'بررسی خرید'}</p>
              <h2 id="invoice-title" tabIndex={-1} className="mt-1 text-xl font-extrabold">{custom ? `تنظیم پلن ${selectedPlan.name}` : `پیش‌فاکتور ${selectedPlan.name}`}</h2>
              <p id="invoice-desc" className="mt-2 text-sm leading-7 text-[#46536b]">{custom ? 'مقدار هر گزینه را مشخص کنید؛ مبلغ بر اساس قیمت ثبت‌شده در سامانه محاسبه می‌شود.' : `اعتبار این پلن ${fa(selectedPlan.duration_days)} روز است. مبلغ نهایی را پیش از پرداخت بررسی کنید.`}</p>
            </div>
            <button type="button" data-autofocus onClick={closeDialog} aria-label="بستن پنجره" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#c3cee2] hover:bg-[#eef3ff] ${focusRing}`}><X size={20} aria-hidden="true" /></button>
          </div>

          {custom && <>
            <ul className="grid gap-4 md:grid-cols-2">
              {(selectedPlan.pricing_items || []).map((item) => {
                const value = Number(selections[String(item.id)] ?? item.min_qty ?? 0)
                const setValue = (next) => setSelections((current) => ({ ...current, [String(item.id)]: next }))
                return <li key={item.id} className="rounded-2xl border-2 border-[#d9e1ee] p-4">
                  <p className="text-base font-extrabold">{item.title}</p>
                  <p className="mt-1 text-[13px] text-[#46536b]">{formatMoney(item.unit_price_per_day)} برای هر واحد در روز</p>
                  <div className="mt-4">{item.feature_key ? <FeatureToggle item={item} value={value} onChange={setValue} /> : <QuantityStepper item={item} value={value} onChange={setValue} />}</div>
                </li>
              })}
            </ul>
            <div className="mt-5 rounded-2xl border-2 border-[#d9e1ee] p-4">
              <label htmlFor="plan-days" className="block text-sm font-extrabold">مدت اشتراک (روز)</label>
              <input id="plan-days" type="number" inputMode="numeric" min={selectedPlan.min_days || 1} max={selectedPlan.max_days || undefined} value={days}
                onChange={(e) => { const min = Number(selectedPlan.min_days || 1); const max = selectedPlan.max_days == null ? Number.MAX_SAFE_INTEGER : Number(selectedPlan.max_days); setDays(Math.max(min, Math.min(max, Number(e.target.value) || min))) }}
                aria-describedby="days-help" className={`mt-2 min-h-11 w-full rounded-xl border-2 border-[#c3cee2] bg-white px-3 py-2 text-base sm:w-40 ${focusRing}`} />
              <p id="days-help" className="mt-2 text-[13px] text-[#46536b]">حداقل {fa(selectedPlan.min_days || 1)} روز{selectedPlan.max_days ? ` و حداکثر ${fa(selectedPlan.max_days)} روز` : ''}</p>
            </div>
          </>}

          <div className="mt-6 rounded-2xl border-2 border-[#d9e1ee] bg-[#f8faff] p-4 sm:p-5" aria-live="polite" aria-busy={quoteLoading}>
            <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold"><CreditCard size={18} aria-hidden="true" className="text-[#2c55d4]" />پیش‌فاکتور</h3>
            {quoteLoading && !quote ? <p className="text-sm text-[#46536b]">در حال محاسبه مبلغ…</p>
              : quoteError ? <p role="alert" className="text-sm font-bold text-[#a3182b]">{quoteErrorDetail?.response?.data?.detail || 'محاسبه پیش‌فاکتور با خطا مواجه شد. مقادیر را بررسی کنید.'}</p>
              : quote ? <dl className="text-sm">
                {(quote.rows || []).map((row, index) => <div key={row.item_id || index} className="flex justify-between gap-3 py-1.5"><dt className="text-[#34415a]">{row.title} × {fa(row.quantity || 1)}</dt><dd className="font-bold">{formatMoney(row.total)}</dd></div>)}
                <div className="mt-3 space-y-2 border-t-2 border-[#d9e1ee] pt-3">
                  <div className="flex justify-between"><dt className="text-[#34415a]">جمع جزء</dt><dd className="font-bold">{formatMoney(quote.subtotal)}</dd></div>
                  {quote.tax_enabled && <div className="flex justify-between"><dt className="text-[#34415a]">مالیات ({fa(quote.tax_percent)}٪)</dt><dd className="font-bold">{formatMoney(quote.tax_amount)}</dd></div>}
                  <div className="flex justify-between pt-2 text-lg font-extrabold"><dt>مبلغ نهایی</dt><dd>{formatMoney(quote.total)}</dd></div>
                </div>
              </dl> : <p className="text-sm text-[#46536b]">برای مشاهده مبلغ، گزینه‌های موردنظر را تنظیم کنید.</p>}
            <button type="button" disabled={buying || quoteLoading || quoteError || !quote} onClick={startCheckout} className={`mt-5 ${primaryButtonClass}`}>
              {buying && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {!isAuthenticated ? 'ورود و ادامه خرید' : buying ? 'در حال ثبت سفارش…' : 'تأیید پیش‌فاکتور و ادامه پرداخت'}
            </button>
            {!isAuthenticated && <p className="mt-3 text-center text-[13px] text-[#46536b]">پس از ورود به حساب، می‌توانید خرید را نهایی کنید.</p>}
          </div>
        </section>
      </div>}
    </div>
  )
}
