import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarClock, CreditCard, History, Loader2, RefreshCw, ShieldCheck, Clock3, ReceiptText } from 'lucide-react'
import { paymentsService } from '../../services/payments'
import { formatIsoJalali } from '../../utils/jalali'
import { SubscriptionPlanCard, formatMoney, primaryButtonClass } from '../../components/shared/PlanCard'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const statuses = { pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق', canceled: 'لغوشده' }
const statusStyle = { paid: 'bg-[#dcf6ec] text-[#0b5f47]', pending: 'bg-[#fff0cf] text-[#7a4a05]', failed: 'bg-[#fde4e8] text-[#8f1627]', canceled: 'bg-[#e9edf4] text-[#34415a]' }
const date = (value) => (value ? formatIsoJalali(value) : '—')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'

function Tabs({ tabs, value, onChange }) {
  const refs = useRef({})
  const move = (event, index) => {
    const keys = { ArrowLeft: 1, ArrowRight: -1, Home: 'first', End: 'last' } // در RTL، فلش چپ = بعدی
    if (!(event.key in keys)) return
    event.preventDefault()
    const delta = keys[event.key]
    const next = delta === 'first' ? 0 : delta === 'last' ? tabs.length - 1 : (index + delta + tabs.length) % tabs.length
    onChange(tabs[next].id)
    refs.current[tabs[next].id]?.focus()
  }
  return (
    <div role="tablist" aria-label="بخش‌های اشتراک" className="flex gap-1 overflow-x-auto border-b-2 border-[#e5eaf2] p-2">
      {tabs.map(({ id, label, icon: Icon, count }, index) => (
        <button key={id} ref={(node) => { refs.current[id] = node }} role="tab" id={`tab-${id}`} type="button"
          aria-selected={value === id} aria-controls={`panel-${id}`} tabIndex={value === id ? 0 : -1}
          onClick={() => onChange(id)} onKeyDown={(event) => move(event, index)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${focusRing} ${value === id ? 'bg-[#edf2ff] text-[#3d66e8]' : 'text-[#34415a] hover:bg-[#f3f6fc]'}`}>
          <Icon size={18} aria-hidden="true" />{label}{count != null && <span className="rounded-full bg-white px-2 py-0.5 text-xs">{fa(count)}</span>}
        </button>
      ))}
    </div>
  )
}

export default function SubscriptionPage() {
  const [tab, setTab] = useState('history')
  const { data: me, isLoading: loadingMe, isError: meError, refetch, isFetching } = useQuery({ queryKey: ['my-subscription'], queryFn: () => paymentsService.me().then((r) => r.data) })
  const { data: orders = [], isLoading: loadingOrders } = useQuery({ queryKey: ['payment-orders'], queryFn: () => paymentsService.orders().then((r) => r.data) })
  const active = me?.active
  const reserved = me?.reserved || []
  useEffect(() => {
    if (reserved.length && tab === 'history' && !orders.length) setTab('reserved')
  }, [reserved.length, orders.length, tab])
  const daysLeft = active?.expires_at ? Math.max(0, Math.ceil((new Date(active.expires_at).getTime() - Date.now()) / 86400000)) : null
  const tabs = [
    { id: 'history', label: 'سوابق پرداخت', icon: History, count: orders.length },
    { id: 'reserved', label: 'رزروشده‌ها', icon: CalendarClock, count: reserved.length },
  ]
  const startReserved = useMutation({
    mutationFn: (id) => paymentsService.startReserved(id),
    onSuccess: () => { toast.success('پلن با موفقیت شروع شد.'); refetch() },
    onError: (error) => toast.error(error.response?.data?.detail || 'شروع پلن انجام نشد.'),
  })
  const refresh = () => { refetch() }

  return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
    <div className="mx-auto max-w-[1040px]">
      <header className="mb-5 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(20,35,65,.045)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-[#3d66e8]">مدیریت مالی حساب</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">اشتراک و پرداخت</h1>
          <p className="mt-2 text-sm leading-7 text-[#68758a]">وضعیت پلن، اعتبار، پرداخت‌ها و سفارش‌های خود را مدیریت کنید.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={refresh} disabled={isFetching} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e5eaf2] bg-white px-4 py-2.5 text-sm font-bold text-[#34415a] hover:bg-[#eef3ff] disabled:opacity-60 ${focusRing}`}><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />به‌روزرسانی</button>
          <Link to="/dashboard/pricing" className={`${primaryButtonClass} sm:w-auto`}>تمدید / خرید اشتراک</Link>
        </div>
      </div>
      </header>

      {loadingMe ? <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-[#e5eaf2] bg-white py-20"><Loader2 className="animate-spin text-[#4f7cff]" aria-hidden="true" /><span className="text-sm text-[#46536b]">در حال دریافت اشتراک…</span></div>
        : meError ? <div role="alert" className="rounded-2xl border-2 border-[#f0c3ca] bg-white p-6"><p className="font-bold">دریافت اطلاعات اشتراک ممکن نشد.</p><button type="button" onClick={refresh} className={`mt-4 ${primaryButtonClass} sm:w-auto`}>تلاش دوباره</button></div>
        : <>
          <section aria-label="خلاصه وضعیت اشتراک" className="mb-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[#4f7cff]"><ShieldCheck size={18} aria-hidden="true"/><span className="text-xs font-bold text-[#68758a]">وضعیت فعلی</span></div>
              <p className="mt-3 text-base font-extrabold text-[#101827]">{active ? 'اشتراک فعال' : reserved.length ? 'پلن رزروشده' : 'بدون اشتراک'}</p>
              <p className="mt-1 text-xs text-[#8d98aa]">{active?.plan?.name || reserved[0]?.plan?.name || 'برای شروع، پلن انتخاب کنید'}</p>
            </article>
            <article className="rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[#239b79]"><Clock3 size={18} aria-hidden="true"/><span className="text-xs font-bold text-[#68758a]">اعتبار باقی‌مانده</span></div>
              <p className="mt-3 text-base font-extrabold text-[#101827]">{daysLeft == null ? (reserved.length ? 'پس از شروع' : '—') : daysLeft === 0 ? 'پایان‌یافته' : `${fa(daysLeft)} روز`}</p>
              <p className="mt-1 text-xs text-[#8d98aa]">{active?.expires_at ? `تا ${date(active.expires_at)}` : 'بر اساس تاریخ اشتراک فعال'}</p>
            </article>
            <article className="rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[#8067d8]"><ReceiptText size={18} aria-hidden="true"/><span className="text-xs font-bold text-[#68758a]">سفارش‌ها و رزروها</span></div>
              <p className="mt-3 text-base font-extrabold text-[#101827]">{fa(orders.length)} سفارش · {fa(reserved.length)} رزرو</p>
              <p className="mt-1 text-xs text-[#8d98aa]">سوابق پرداخت و پلن‌های آینده</p>
            </article>
          </section>
          <section aria-labelledby="current-sub" className="mb-6">
            <h2 id="current-sub" className="mb-3 text-lg font-extrabold">اشتراک فعلی</h2>
            {active
              ? <SubscriptionPlanCard subscription={active} usage={me?.limits || {}} />
              : <div className="rounded-2xl border border-[#e5eaf2] border-r-8 border-r-[#4f7cff] bg-white p-5 sm:p-6">
                <h3 className="text-lg font-extrabold">اشتراک فعالی ندارید</h3>
                <p className="mt-2 text-sm leading-7 text-[#46536b]">برای ساخت جلسه و استفاده از امکانات میزبان، یک پلن تهیه کنید. اطلاعات و لینک جلسات قبلی شما حذف نمی‌شوند.</p>
                <Link to="/dashboard/pricing" className={`mt-4 ${primaryButtonClass} sm:w-auto`}>انتخاب پلن</Link>
              </div>}
            <p className="mt-3 text-sm leading-7 text-[#46536b]">خرید جدید در صورت داشتن اشتراک فعال، به‌صورت رزروشده ثبت می‌شود و پس از پایان اشتراک فعلی شروع می‌شود.</p>
          </section>

          <section aria-label="سوابق و اشتراک‌های رزروشده" className="overflow-hidden rounded-[22px] border border-[#e5eaf2] bg-white shadow-[0_8px_24px_rgba(20,35,65,.035)]">
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className={`p-4 sm:p-6 ${focusRing}`}>
              {tab === 'reserved' && (reserved.length
                ? <ul className="grid gap-4 md:grid-cols-2">{reserved.map((item) => <li key={item.id}>
                  <SubscriptionPlanCard subscription={item} reserved />
                  {item.status === 'reserved' && <button type="button" disabled={startReserved.isPending} onClick={() => startReserved.mutate(item.id)} className={`mt-2 min-h-11 w-full rounded-xl bg-[#4f7cff] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3d66e8] disabled:opacity-50 ${focusRing}`}>شروع این پلن</button>}
                </li>)}</ul>
                : <div className="py-10 text-center"><CalendarClock aria-hidden="true" className="mx-auto text-[#6b778c]" /><p className="mt-3 text-base font-bold">اشتراک رزروشده‌ای ندارید</p><p className="mt-2 text-sm text-[#46536b]">خرید بعدی در صورت داشتن اشتراک فعال، پس از پایان آن شروع می‌شود.</p></div>)}

              {tab === 'history' && (loadingOrders
                ? <div role="status" className="flex justify-center py-12"><Loader2 className="animate-spin text-[#4f7cff]" aria-hidden="true" /><span className="sr-only">در حال دریافت سوابق</span></div>
                : orders.length
                  ? <ul className="space-y-3">{orders.map((order) => <li key={order.id}>
                    <article aria-label={`سفارش ${order.plan?.name || 'پلن'}`} className="rounded-xl border border-[#e5eaf2] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-extrabold">{order.plan?.name || 'پلن'} · {fa(order.days)} روز</h3>
                          <p className="mt-1 text-[13px] text-[#46536b]">{date(order.created_at)} · کد سفارش: {String(order.id).slice(0, 8)}</p>
                        </div>
                        <div className="sm:text-left">
                          <p className="text-base font-extrabold">{formatMoney(order.total)}</p>
                          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[13px] font-bold ${statusStyle[order.status] || statusStyle.canceled}`}>{statuses[order.status] || order.status}</span>
                        </div>
                      </div>
                      {order.status === 'pending' && <p className="mt-3 text-sm text-[#7a4a05]">پرداخت این سفارش هنوز نهایی نشده است. <Link to={`/billing/result?order=${order.id}`} className="font-bold underline">پیگیری وضعیت</Link></p>}
                      <details className="mt-3 text-sm">
                        <summary className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg font-bold text-[#3d66e8] ${focusRing}`}>مشاهده جزئیات پیش‌فاکتور</summary>
                        <dl className="mt-2 space-y-2">
                          {(order.snapshot?.rows || []).map((row, i) => <div key={i} className="flex justify-between gap-3"><dt className="text-[#34415a]">{row.title}{row.quantity ? ` × ${fa(row.quantity)}` : ''}{row.percent ? ` (${fa(row.percent)}٪)` : ''}</dt><dd>{formatMoney(row.total)}</dd></div>)}
                          {order.snapshot?.breakdown && <div className="mt-3 space-y-2 rounded-xl bg-[#f6f8fc] p-3 text-xs">
                            <div className="flex justify-between"><dt>هزینه خام تصاویر</dt><dd>{formatMoney(order.snapshot.breakdown.raw_image_cost)}</dd></div>
                            <div className="flex justify-between"><dt>هزینه هر تصویر</dt><dd>{formatMoney(order.snapshot.breakdown.cost_per_image)}</dd></div>
                            <div className="flex justify-between"><dt>تعداد کاربران میکروفونی</dt><dd>{fa(order.snapshot.breakdown.microphone_user_count)}</dd></div>
                            <div className="flex justify-between"><dt>هزینه هر میکروفون</dt><dd>{formatMoney(order.snapshot.breakdown.cost_per_microphone)}</dd></div>
                            <div className="flex justify-between"><dt>هزینه خام میکروفون‌ها</dt><dd>{formatMoney(order.snapshot.breakdown.raw_microphone_cost)}</dd></div>
                            <div className="flex justify-between font-bold"><dt>مجموع هزینه خام ظرفیت</dt><dd>{formatMoney(order.snapshot.breakdown.raw_capacity_cost)}</dd></div>
                            <div className="flex justify-between"><dt>درصد افزایش پلکانی</dt><dd>{fa(order.snapshot.breakdown.tier_percent)}٪</dd></div>
                            <div className="flex justify-between"><dt>تخفیف مدت</dt><dd>{formatMoney(order.snapshot.breakdown.duration_discount_amount)}</dd></div>
                            <div className="flex justify-between"><dt>تخفیف مدرسه</dt><dd>{formatMoney(order.snapshot.breakdown.school_discount_amount)}</dd></div>
                            <div className="flex justify-between"><dt>تخفیف کد</dt><dd>{formatMoney(order.snapshot.breakdown.code_discount_amount)}</dd></div>
                            <div className="flex justify-between"><dt>هزینه قبل از مالیات</dt><dd>{formatMoney(order.snapshot.breakdown.cost_before_tax)}</dd></div>
                          </div>}
                          <div className="flex justify-between border-t-2 border-[#eef1f5] pt-2"><dt>جمع جزء</dt><dd>{formatMoney(order.subtotal)}</dd></div>
                          {Number(order.tax_amount) > 0 && <div className="flex justify-between"><dt>مالیات ({fa(order.tax_percent)}٪)</dt><dd>{formatMoney(order.tax_amount)}</dd></div>}
                          <div className="flex justify-between font-extrabold"><dt>مبلغ نهایی</dt><dd>{formatMoney(order.total)}</dd></div>
                          {order.billing_ref_id && <div className="text-[#34415a]">شماره پیگیری: {order.billing_ref_id}</div>}
                        </dl>
                      </details>
                    </article></li>)}</ul>
                  : <div className="py-10 text-center"><CreditCard aria-hidden="true" className="mx-auto text-[#6b778c]" /><p className="mt-3 text-base font-bold">هنوز سفارشی ثبت نشده است</p><p className="mt-2 text-sm text-[#46536b]">پس از خرید پلن، سوابق پرداخت در این بخش نمایش داده می‌شود.</p></div>)}
            </div>
          </section>
        </>}
    </div>
  </div>
}
