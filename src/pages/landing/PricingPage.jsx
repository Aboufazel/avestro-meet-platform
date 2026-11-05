import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, CreditCard, Loader2, Minus, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsService } from '../../services/payments'
import { useAuthStore } from '../../store/authStore'

const money = (value) => `${Number(value || 0).toLocaleString('fa-IR')} ریال`
const limitValue = (limit) => {
  if (limit.value == null) return 'نامحدود'
  const unit = limit.unit === 'mb' ? 'مگابایت' : limit.key === 'max_participants' ? 'نفر' : limit.key === 'max_video_streams' ? 'دوربین' : limit.key === 'max_live_sessions' ? 'جلسه هم‌زمان' : 'واحد'
  return `${Number(limit.value).toLocaleString('fa-IR')} ${unit}`
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
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const { data: plans = [], isLoading, isError } = useQuery({ queryKey: ['public-plans'], queryFn: () => paymentsService.plans().then((r) => r.data) })
  const types = useMemo(() => [...new Map(plans.map((p) => [p.plan_type?.id, p.plan_type]).filter(([id, type]) => id && type)).values()], [plans])
  const visiblePlans = plans.filter((p) => activeType === 'all' || p.plan_type?.id === activeType)
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null
  const custom = Boolean(selectedPlan?.is_custom_priced)
  useEffect(() => {
    if (!invoiceOpen) return
    const onKeyDown = (event) => { if (event.key === 'Escape') setInvoiceOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [invoiceOpen])
  const quotePayload = selectedPlan ? { plan_id: selectedPlan.id, ...(custom ? { days, selections } : {}) } : null
  const { data: quote, isFetching: quoteLoading, isError: quoteError, error: quoteErrorDetail } = useQuery({
    queryKey: ['plan-quote', quotePayload],
    queryFn: () => paymentsService.quote(quotePayload).then((r) => r.data),
    enabled: Boolean(selectedPlan),
    staleTime: 0,
  })

  const selectPlan = (plan) => {
    setSelectedPlanId(plan.id)
    setInvoiceOpen(true)
    setDays(plan.default_days || 1)
    setSelections(Object.fromEntries((plan.pricing_items || []).map((item) => [String(item.id), item.min_qty || 0])))
  }

  useEffect(() => {
    const requestedSlug = params.get('plan')
    if (!requestedSlug || !plans.length || selectedPlanId) return
    const requestedPlan = plans.find((plan) => plan.slug === requestedSlug)
    if (requestedPlan) {
      setSelectedPlanId(requestedPlan.id)
      setInvoiceOpen(true)
      setDays(requestedPlan.default_days || 1)
      setSelections(Object.fromEntries((requestedPlan.pricing_items || []).map((item) => [String(item.id), item.min_qty || 0])))
    }
  }, [params, plans, selectedPlanId])

  const startCheckout = async (plan) => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/pricing?plan=${plan.slug}`)}`)
      return
    }
    if (plan.is_custom_priced && selectedPlanId !== plan.id) selectPlan(plan)
    const payload = plan.is_custom_priced
      ? { plan_id: plan.id, days, selections }
      : { plan_id: plan.id }
    setBuying(true)
    try {
      const { data } = await paymentsService.checkout(payload)
      if (data.payment_url) window.location.assign(data.payment_url)
      else navigate('/dashboard/subscription?checkout=success')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'شروع فرایند خرید انجام نشد.')
    } finally {
      setBuying(false)
    }
  }

  const updateQty = (item, next) => {
    const min = Number(item.min_qty || 0)
    const max = item.max_qty == null ? Number.MAX_SAFE_INTEGER : Number(item.max_qty)
    const step = Math.max(1, Number(item.step || 1))
    const value = Math.max(min, Math.min(max, Number(next) || 0))
    const snapped = min + Math.round((value - min) / step) * step
    setSelections((current) => ({ ...current, [String(item.id)]: Math.max(min, Math.min(max, snapped)) }))
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827]" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[#e5eaf2] bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5"><img src="/avestro-logo.png" alt="اَوسترو" className="w-9 h-9" /><span className="font-bold text-sm">اَوسترو میت</span></Link>
          <nav aria-label="ناوبری اصلی" className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <Link to="/" className="text-[#68758a] hover:text-[#101827] px-2 py-2">صفحه اصلی</Link>
            {isAuthenticated ? <Link to="/dashboard" className="meet-primary-btn rounded-xl px-3 sm:px-4 py-2.5">داشبورد</Link> : <Link to="/login" className="meet-primary-btn rounded-xl px-3 sm:px-4 py-2.5">ورود</Link>}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <section className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
          <div className="meet-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs mb-4"><Sparkles size={14}/> تعرفه‌های اَوسترو میت</div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">پلنی متناسب با شیوه برگزاری شما</h1>
          <p className="text-sm sm:text-base leading-7 text-[#68758a] mt-3">محدودیت‌ها، امکانات و هزینه هر پلن را شفاف ببینید. مبلغ نهایی و مالیات پیش از پرداخت در پیش‌فاکتور نمایش داده می‌شود.</p>
        </section>

        {isLoading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-[#4f7cff]"/></div> : isError ? <div className="meet-card p-8 text-center text-sm">دریافت تعرفه‌ها ممکن نشد. صفحه را دوباره بارگذاری کنید.</div> : plans.length === 0 ? <div className="meet-card p-8 text-center">در حال حاضر پلنی برای نمایش منتشر نشده است.</div> : <>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-5" role="tablist" aria-label="دسته‌بندی پلن‌ها">
            <button role="tab" aria-selected={activeType === 'all'} onClick={() => setActiveType('all')} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm border ${activeType === 'all' ? 'bg-[#101827] text-white border-[#101827]' : 'bg-white text-[#68758a] border-[#e5eaf2]'}`}>همه پلن‌ها</button>
            {types.map((type) => <button key={type.id} role="tab" aria-selected={activeType === type.id} onClick={() => setActiveType(type.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm border ${activeType === type.id ? 'bg-[#101827] text-white border-[#101827]' : 'bg-white text-[#68758a] border-[#e5eaf2]'}`}>{type.name}</button>)}
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-start">
            {visiblePlans.map((plan) => (
              <article key={plan.id} className={`meet-card p-5 sm:p-6 flex flex-col h-full ${selectedPlanId === plan.id ? 'ring-2 ring-[#4f7cff]' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[11px] text-[#4f7cff] font-semibold">{plan.plan_type?.name || 'پلن'}</p><h2 className="text-lg font-bold mt-2">{plan.name}</h2></div>
                  {plan.is_custom_priced && <span className="rounded-lg bg-[#e8faf4] text-[#228b70] text-[10px] px-2.5 py-1">قیمت‌گذاری انتخابی</span>}
                </div>
                {plan.description && <p className="text-xs leading-6 text-[#68758a] mt-3">{plan.description}</p>}
                <div className="mt-5 pb-5 border-b border-[#eef1f5]">
                  <p className="text-2xl font-bold">{plan.is_custom_priced ? 'بر اساس انتخاب شما' : money(plan.price)}</p>
                  <p className="text-[11px] text-[#8d98aa] mt-1">{plan.is_custom_priced ? `از ${Number(plan.min_days || 1).toLocaleString('fa-IR')} روز` : `${Number(plan.duration_days).toLocaleString('fa-IR')} روز اعتبار`}</p>
                </div>
                <div className="py-4 space-y-3 flex-1">
                  <p className="text-xs font-bold">محدودیت‌ها</p>
                  {(plan.limits || []).map((limit) => <div key={limit.key} className="flex justify-between gap-3 text-xs"><span className="text-[#68758a]">{limit.title}</span><span className="font-semibold text-left">{limitValue(limit)}</span></div>)}
                  {plan.features?.length > 0 && <><p className="text-xs font-bold pt-2">امکانات</p>{plan.features.filter((f) => f.enabled).map((f) => <div key={f.key} className="flex items-start gap-2 text-xs text-[#68758a]"><Check size={14} className="text-[#2eaf89] shrink-0 mt-0.5"/>{f.title}</div>)}</>}
                  {plan.tax_enabled && <p className="text-[11px] text-[#8d98aa]">مالیات {Number(plan.tax_percent).toLocaleString('fa-IR')}٪ در پیش‌فاکتور محاسبه می‌شود.</p>}
                </div>
                <button onClick={() => selectPlan(plan)} className={`w-full rounded-xl py-3 text-sm font-semibold ${plan.is_custom_priced ? 'border border-[#4f7cff] text-[#4f7cff] hover:bg-[#edf2ff]' : 'meet-primary-btn'}`}>{plan.is_custom_priced ? 'ساخت پلن اختصاصی' : 'مشاهده پیش‌فاکتور'} <ArrowLeft size={16} className="inline mr-1"/></button>
              </article>
            ))}
          </div>

          {selectedPlan && invoiceOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101827]/65 backdrop-blur-sm p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setInvoiceOpen(false) }}>
            <section role="dialog" aria-modal="true" aria-labelledby="custom-plan-title" className="meet-card w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white p-5 sm:p-7 shadow-2xl text-[#101827]">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6"><div><p className="text-xs text-[#4f7cff] font-semibold">{custom ? 'سازنده پلن' : 'بررسی خرید'}</p><h2 id="custom-plan-title" className="text-xl font-bold mt-1">{custom ? `تنظیم پلن ${selectedPlan.name}` : `پیش‌فاکتور ${selectedPlan.name}`}</h2><p className="text-xs text-[#68758a] mt-2">{custom ? 'مقدار هر گزینه را مشخص کنید؛ مبلغ بر اساس قیمت ثبت‌شده در سامانه محاسبه می‌شود.' : `اعتبار این پلن ${Number(selectedPlan.duration_days).toLocaleString('fa-IR')} روز است. مبلغ نهایی را پیش از پرداخت بررسی کنید.`}</p></div><button onClick={() => { setInvoiceOpen(false); setSelectedPlanId(null) }} className="rounded-lg border border-[#e5eaf2] px-3 py-2 text-xs text-[#475569] hover:bg-[#f7f9fc] self-start">بستن</button></div>
            {custom && <div className="grid md:grid-cols-2 gap-4">
              {(selectedPlan.pricing_items || []).map((item) => <div key={item.id} className="rounded-2xl border border-[#e5eaf2] p-4">
                <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="text-[11px] text-[#8d98aa] mt-1">{money(item.unit_price_per_day)} برای هر واحد در روز</p></div><span className="text-xs text-[#68758a]">{item.feature_key ? 'امکان' : 'محدودیت'}</span></div>
                <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-[#68758a]">مقدار انتخابی</span><div className="flex items-center gap-2"><button aria-label={`کاهش ${item.title}`} onClick={() => updateQty(item, Number(selections[String(item.id)] ?? item.min_qty) - item.step)} className="w-9 h-9 rounded-lg border border-[#e5eaf2] flex items-center justify-center"><Minus size={14}/></button><output className="min-w-8 text-center font-bold tabular-nums">{Number(selections[String(item.id)] ?? item.min_qty).toLocaleString('fa-IR')}</output><button aria-label={`افزایش ${item.title}`} onClick={() => updateQty(item, Number(selections[String(item.id)] ?? item.min_qty) + item.step)} className="w-9 h-9 rounded-lg border border-[#e5eaf2] flex items-center justify-center"><Plus size={14}/></button></div></div>
              </div>)}
            </div>}
            {custom && <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3"><label className="text-xs text-[#68758a]" htmlFor="plan-days">مدت اشتراک (روز)</label><input id="plan-days" type="number" min={selectedPlan.min_days || 1} max={selectedPlan.max_days || undefined} value={days} onChange={(e) => { const min = Number(selectedPlan.min_days || 1); const max = selectedPlan.max_days == null ? Number.MAX_SAFE_INTEGER : Number(selectedPlan.max_days); setDays(Math.max(min, Math.min(max, Number(e.target.value) || min))) }} className="w-full sm:w-36 rounded-xl border border-[#e5eaf2] bg-white px-3 py-2.5 text-sm"/><span className="text-[11px] text-[#8d98aa]">پیش‌فرض: یک روز</span></div>}
            <div className="mt-6 rounded-2xl bg-[#f7f9fc] border border-[#e5eaf2] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4"><CreditCard size={17} className="text-[#4f7cff]"/><h3 className="font-bold text-sm">پیش‌فاکتور</h3></div>
              {quoteLoading ? <p className="text-xs text-[#8d98aa]">در حال محاسبه مبلغ...</p> : quoteError ? <p className="text-xs text-[#c34b5b]">{quoteErrorDetail.response?.data?.detail || 'محاسبه پیش‌فاکتور با خطا مواجه شد. مقادیر را بررسی کنید.'}</p> : quote ? <>
                {(quote.rows || []).map((row, index) => <div key={`${row.item_id || index}`} className="flex justify-between gap-3 text-xs py-1.5"><span className="text-[#68758a]">{row.title} × {Number(row.quantity || 1).toLocaleString('fa-IR')}</span><span>{money(row.total)}</span></div>)}
                <div className="border-t border-[#e5eaf2] mt-3 pt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-[#68758a]">جمع جزء</span><span>{money(quote.subtotal)}</span></div>{quote.tax_enabled && <div className="flex justify-between"><span className="text-[#68758a]">مالیات ({Number(quote.tax_percent).toLocaleString('fa-IR')}٪)</span><span>{money(quote.tax_amount)}</span></div>}<div className="flex justify-between font-bold text-base pt-2"><span>مبلغ نهایی</span><span>{money(quote.total)}</span></div></div>
              </> : <p className="text-xs text-[#8d98aa]">برای مشاهده مبلغ، گزینه‌های موردنظر را تنظیم کنید.</p>}
              <button disabled={buying || quoteLoading || quoteError || !quote} onClick={() => startCheckout(selectedPlan)} className="meet-primary-btn w-full rounded-xl py-3 mt-5 text-sm font-semibold disabled:opacity-50">{!isAuthenticated ? 'ورود و ادامه خرید' : buying ? 'در حال ثبت سفارش...' : 'تأیید پیش‌فاکتور و ادامه پرداخت'}</button>
              {!isAuthenticated && <p className="text-center text-[11px] text-[#8d98aa] mt-3">پس از ورود به حساب، می‌توانید خرید را نهایی کنید.</p>}
            </div>
            </section>
          </div>}
        </>}

        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-[#8d98aa]"><ShieldCheck size={17} className="text-[#2eaf89]"/><span>قیمت نهایی فقط در سرور محاسبه می‌شود و پیش از پرداخت، جزئیات مبلغ و مالیات به شما نمایش داده خواهد شد.</span></div>
      </main>
    </div>
  )
}
