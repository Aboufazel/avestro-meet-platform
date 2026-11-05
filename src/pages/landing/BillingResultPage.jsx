import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle, ShieldAlert } from 'lucide-react'
import { paymentsService } from '../../services/payments'

const money = (value) => `${Number(value || 0).toLocaleString('fa-IR')} ریال`

export default function BillingResultPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order')
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setExpired(true), 60000)
    return () => window.clearTimeout(timer)
  }, [orderId])
  const { data: order, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['payment-order-result', orderId],
    queryFn: () => paymentsService.order(orderId).then((r) => r.data),
    enabled: Boolean(orderId),
    refetchInterval: (query) => !expired && (!query.state.data || query.state.data?.status === 'pending') ? 2500 : false,
    refetchOnWindowFocus: true,
    retry: 2,
  })
  const state = order?.status || 'pending'
  const paid = state === 'paid'
  const failed = ['failed', 'canceled'].includes(state)
  const unknownOrder = !orderId
  return <main className="min-h-screen bg-gradient-to-br from-[#eef3ff] via-[#f5f7fb] to-[#edf2f8] flex items-center justify-center p-4 sm:p-6" dir="rtl">
    <section className="w-full max-w-xl rounded-[28px] border border-[#dfe7f3] bg-white shadow-[0_24px_80px_rgba(25,48,91,.12)] p-6 sm:p-9 text-center text-[#101827]">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${paid ? 'bg-[#e8f8f1]' : failed || unknownOrder ? 'bg-[#fff0f1]' : 'bg-[#edf2ff]'}`}>
        {isLoading ? <Loader2 className="w-9 h-9 animate-spin text-[#416df5]"/> : paid ? <CheckCircle2 className="w-10 h-10 text-[#15966c]"/> : failed || unknownOrder ? <XCircle className="w-10 h-10 text-[#d14353]"/> : <Clock3 className="w-10 h-10 text-[#416df5]"/>}
      </div>
      <p className="mt-5 text-xs font-bold tracking-wide text-[#416df5]">اَوسترو میت · وضعیت سفارش</p>
      <h1 className="mt-2 text-xl sm:text-2xl font-extrabold text-[#101827]">{paid ? 'پرداخت با موفقیت تأیید شد' : failed ? 'پرداخت ناموفق بود' : unknownOrder ? 'شناسه سفارش دریافت نشد' : 'در انتظار تأیید پرداخت'}</h1>
      <p className="mt-3 text-sm leading-8 text-[#52627a]">{paid ? 'پرداخت شما توسط سامانه تأیید شده و اشتراک ثبت شده است. جزئیات را در پنل اشتراک ببینید.' : failed ? 'وضعیت سفارش ناموفق ثبت شده است. برای خرید مجدد می‌توانید به صفحه تعرفه‌ها برگردید.' : unknownOrder ? 'آدرس بازگشت، شناسه سفارش ندارد. از صفحه تعرفه‌ها دوباره فرایند خرید را آغاز کنید.' : isError ? 'دریافت وضعیت سفارش با خطا مواجه شد. ممکن است API محلی در دسترس نباشد یا شناسه سفارش پیدا نشده باشد.' : 'هنوز تأیید نهایی به این صفحه نرسیده است. وضعیت سفارش به‌صورت خودکار بررسی می‌شود.'}</p>
      {order && <div className="mt-6 rounded-2xl border border-[#e4eaf3] bg-[#f7f9fd] p-4 text-sm text-[#334155] space-y-3">
        <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">مبلغ سفارش</span><strong className="text-[#101827]">{money(order.total)}</strong></div>
        <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">وضعیت</span><strong className={paid ? 'text-[#12835f]' : failed ? 'text-[#c24150]' : 'text-[#315fce]'}>{paid ? 'پرداخت‌شده' : failed ? 'ناموفق' : 'در انتظار'}</strong></div>
        <div className="border-t border-[#e2e8f0] pt-3 text-[11px] text-[#64748b] break-all">شناسه سفارش: {order.id || orderId}</div>
      </div>}
      {!paid && !failed && !unknownOrder && <div className="mt-5 rounded-xl border border-[#f0d9a8] bg-[#fff9e9] p-4 text-right text-xs leading-7 text-[#805b17]">
        <div className="flex items-center gap-2 font-bold"><ShieldAlert size={16}/> نکته مهم برای تست روی localhost</div>
        <p className="mt-1">آدرس FRONTEND می‌تواند localhost باشد؛ اما BACKEND_BASE_URL که به‌عنوان callback به Billing ارسال می‌شود باید از سرور Billing قابل دسترسی باشد. آدرس http://localhost:8000 فقط به همان دستگاهی اشاره می‌کند که Billing روی آن اجرا شده و به بک‌اند شما در رایانه توسعه‌دهنده نمی‌رسد.</p>
        <p>برای تست واقعی، بک‌اند را با یک آدرس عمومی HTTPS موقت (مانند تونل توسعه) در دسترس قرار دهید و همان آدرس را در BACKEND_BASE_URL بگذارید. FRONTEND_BASE_URL را می‌توانید روی http://localhost:5173 نگه دارید.</p>
      </div>}
      {expired && !paid && !failed && <p className="mt-4 text-xs leading-6 text-[#9a6411]">پس از ۶۰ ثانیه هنوز نتیجه قطعی دریافت نشده است. ممکن است callback به سرور محلی نرسیده باشد؛ لاگ بک‌اند و وضعیت سفارش را بررسی کنید.</p>}
      {isError && <p className="mt-3 text-xs text-[#b54755]">{error?.response?.data?.detail || error?.message || 'خطای نامشخص در دریافت سفارش'}</p>}
      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/dashboard/subscription" className="rounded-xl bg-gradient-to-l from-[#416df5] to-[#6489ff] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:brightness-105">مشاهده اشتراک و پرداخت</Link>
        <Link to="/pricing" className="rounded-xl border border-[#dce4f0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#f7f9fc]">بازگشت به تعرفه‌ها</Link>
      </div>
      {!paid && !failed && !unknownOrder && <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#315fce] hover:bg-[#edf2ff] disabled:opacity-60"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/> بررسی دوباره وضعیت</button>}
    </section>
  </main>
}
