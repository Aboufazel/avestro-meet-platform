import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, Clock3, CreditCard, History, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { paymentsService } from '../../services/payments'
import { formatIsoJalali } from '../../utils/jalali'

const money = (value) => `${Number(value || 0).toLocaleString('fa-IR')} ریال`
const statuses = { pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق', canceled: 'لغوشده' }
const date = (value) => value ? formatIsoJalali(value) : '—'

function SubscriptionCard({ item, reserved = false }) {
  return <article className="rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div><p className="text-[11px] text-[#4f7cff] font-semibold">{reserved ? 'اشتراک رزروشده' : 'اشتراک فعال'}</p><h3 className="font-bold text-base mt-1">{item.plan?.name || 'پلن'}</h3><p className="text-xs text-[#8d98aa] mt-1">{item.plan?.plan_type?.name || ''}</p></div>
      <span className={`rounded-lg px-3 py-1.5 text-[11px] ${reserved ? 'bg-[#edf2ff] text-[#4f7cff]' : 'bg-[#e8faf4] text-[#228b70]'}`}>{reserved ? 'شروع در آینده' : 'معتبر'}</span>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-5">
      <div className="rounded-xl bg-[#f7f9fc] p-3"><p className="text-[10px] text-[#8d98aa]">شروع</p><p className="text-xs font-semibold mt-1">{date(item.starts_at)}</p></div>
      <div className="rounded-xl bg-[#f7f9fc] p-3"><p className="text-[10px] text-[#8d98aa]">پایان</p><p className="text-xs font-semibold mt-1">{date(item.expires_at)}</p></div>
    </div>
    {!reserved && item.plan?.description && <p className="text-xs text-[#68758a] leading-6 mt-4">{item.plan.description}</p>}
  </article>
}

export default function SubscriptionPage() {
  const [tab, setTab] = useState('active')
  const { data: me, isLoading: loadingMe, refetch } = useQuery({ queryKey: ['my-subscription'], queryFn: () => paymentsService.me().then((r) => r.data) })
  const { data: orders = [], isLoading: loadingOrders } = useQuery({ queryKey: ['payment-orders'], queryFn: () => paymentsService.orders().then((r) => r.data) })
  const active = me?.active
  const reserved = me?.reserved || []
  const tabs = [{ id: 'active', label: 'اشتراک من', icon: ShieldCheck }, { id: 'reserved', label: 'رزروشده‌ها', icon: CalendarClock }, { id: 'history', label: 'سوابق پرداخت', icon: History }]

  return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div><p className="text-xs text-[#4f7cff] font-medium mb-2">مدیریت مالی حساب</p><h1 className="text-2xl sm:text-3xl font-bold">اشتراک و پرداخت</h1><p className="text-sm text-[#68758a] mt-2">وضعیت اشتراک، تمدید و جزئیات سفارش‌های خود را مدیریت کنید.</p></div>
        <div className="flex gap-2"><button onClick={() => refetch()} className="rounded-xl border border-[#e5eaf2] bg-white px-3 py-2.5 text-xs text-[#68758a] inline-flex items-center gap-2"><RefreshCw size={14}/> به‌روزرسانی</button><Link to="/pricing" className="meet-primary-btn rounded-xl px-4 py-2.5 text-xs font-semibold">تمدید / خرید اشتراک</Link></div>
      </div>

      {loadingMe ? <div className="meet-card py-20 flex justify-center"><Loader2 className="animate-spin text-[#4f7cff]"/></div> : <>
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <div className="meet-card p-4"><p className="text-[11px] text-[#8d98aa]">وضعیت اشتراک</p><p className="font-bold mt-2">{active ? 'فعال' : 'بدون اشتراک فعال'}</p></div>
          <div className="meet-card p-4"><p className="text-[11px] text-[#8d98aa]">پلن فعلی</p><p className="font-bold mt-2 truncate">{active?.plan?.name || '—'}</p></div>
          <div className="meet-card p-4"><p className="text-[11px] text-[#8d98aa]">اشتراک رزروشده</p><p className="font-bold mt-2">{reserved.length.toLocaleString('fa-IR')} مورد</p></div>
          <div className="meet-card p-4"><p className="text-[11px] text-[#8d98aa]">سفارش‌ها</p><p className="font-bold mt-2">{orders.length.toLocaleString('fa-IR')} مورد</p></div>
        </section>

        {!active && <div className="meet-card p-5 sm:p-6 mb-5 border-r-4 border-r-[#4f7cff]"><h2 className="font-bold">اشتراک فعالی ندارید</h2><p className="text-xs text-[#68758a] leading-6 mt-2">برای ساخت جلسه و استفاده از امکانات میزبان، یک پلن تهیه کنید. اطلاعات و لینک جلسات قبلی شما حذف نمی‌شوند.</p><Link to="/pricing" className="meet-primary-btn inline-flex mt-4 rounded-xl px-4 py-2.5 text-xs">انتخاب پلن</Link></div>}
        {active && <div className="mb-5"><SubscriptionCard item={active}/></div>}

        <section className="meet-card overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-[#e5eaf2] overflow-x-auto" role="tablist" aria-label="بخش‌های اشتراک">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 rounded-xl px-4 py-3 text-xs inline-flex items-center gap-2 ${tab === id ? 'bg-[#edf2ff] text-[#315fd5] font-semibold' : 'text-[#68758a] hover:bg-[#f7f9fc]'}`}><Icon size={15}/>{label}</button>)}
          </div>
          <div className="p-4 sm:p-6">
            {tab === 'active' && <>
              <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-bold text-sm">مصرف و سقف‌های پلن</h2><span className="text-[10px] text-[#8d98aa]">مقادیر مؤثر حساب</span></div>
              {Object.keys(me?.limits || {}).length ? <div className="grid sm:grid-cols-2 gap-3">{Object.entries(me.limits).map(([key, limit]) => <div key={key} className="rounded-xl border border-[#e5eaf2] p-4"><div className="flex justify-between gap-3"><span className="text-xs text-[#68758a]">{limit.title || key}</span><strong className="text-xs">{limit.value == null ? 'نامحدود' : Number(limit.value).toLocaleString('fa-IR')}</strong></div>{limit.used != null && <p className="text-[11px] text-[#8d98aa] mt-2">مصرف‌شده: {Number(limit.used).toLocaleString('fa-IR')} · باقی‌مانده: {limit.remaining == null ? 'نامحدود' : Number(limit.remaining).toLocaleString('fa-IR')}</p>}</div>)}</div> : <p className="text-xs text-[#8d98aa]">اطلاعات سقف‌ها در دسترس نیست.</p>}
            </>}
            {tab === 'reserved' && (reserved.length ? <div className="grid md:grid-cols-2 gap-3">{reserved.map((item) => <SubscriptionCard key={item.id} item={item} reserved/>)}</div> : <div className="py-12 text-center"><CalendarClock className="mx-auto text-[#b5bfce]"/><p className="font-semibold text-sm mt-3">اشتراک رزروشده‌ای ندارید</p><p className="text-xs text-[#8d98aa] mt-2">خرید بعدی در صورت داشتن اشتراک فعال، پس از پایان آن شروع می‌شود.</p></div>)}
            {tab === 'history' && (loadingOrders ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-[#4f7cff]"/></div> : orders.length ? <div className="space-y-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-[#e5eaf2] p-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p className="font-semibold text-sm">{order.plan?.name || 'پلن'} · {Number(order.days).toLocaleString('fa-IR')} روز</p><p className="text-[10px] text-[#8d98aa] mt-1">{date(order.created_at)} · کد سفارش: {order.id.slice(0, 8)}</p></div><div className="sm:text-left"><p className="font-bold text-sm">{money(order.total)}</p><span className={`inline-flex mt-1 rounded-md px-2 py-1 text-[10px] ${order.status === 'paid' ? 'bg-[#e8faf4] text-[#228b70]' : order.status === 'pending' ? 'bg-[#fff6e5] text-[#a16b13]' : 'bg-[#fff0f1] text-[#c34b5b]'}`}>{statuses[order.status] || order.status}</span></div></div><details className="mt-3 text-xs"><summary className="cursor-pointer text-[#4f7cff]">مشاهده جزئیات پیش‌فاکتور</summary><div className="mt-3 space-y-2">{(order.snapshot?.rows || []).map((row, i) => <div key={i} className="flex justify-between gap-3"><span className="text-[#68758a]">{row.title} × {row.quantity}</span><span>{money(row.total)}</span></div>)}<div className="border-t border-[#eef1f5] pt-2 flex justify-between"><span>جمع جزء</span><span>{money(order.subtotal)}</span></div>{Number(order.tax_amount) > 0 && <div className="flex justify-between"><span>مالیات ({order.tax_percent}٪)</span><span>{money(order.tax_amount)}</span></div>}<div className="flex justify-between font-bold"><span>مبلغ نهایی</span><span>{money(order.total)}</span></div>{order.billing_ref_id && <p className="text-[#8d98aa]">شماره پیگیری: {order.billing_ref_id}</p>}</div></details></article>)}</div> : <div className="py-12 text-center"><CreditCard className="mx-auto text-[#b5bfce]"/><p className="font-semibold text-sm mt-3">هنوز سفارشی ثبت نشده است</p><p className="text-xs text-[#8d98aa] mt-2">پس از خرید پلن، سوابق پرداخت در این بخش نمایش داده می‌شود.</p></div>)}
          </div>
        </section>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-[#8d98aa]"><Clock3 size={14}/> خرید جدید در صورت داشتن اشتراک فعال، به‌صورت رزروشده و پس از پایان اشتراک فعلی اعمال می‌شود.</div>
      </>}
    </div>
  </div>
}
