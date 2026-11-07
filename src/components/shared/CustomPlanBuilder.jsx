import {useMemo, useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    Check,
    Loader2,
    Minus,
    Plus,
    ShieldCheck,
    Users,
    Video
} from 'lucide-react'
import toast from 'react-hot-toast'
import {useNavigate} from 'react-router-dom'
import {useAuthStore} from '../../store/authStore'
import {paymentsService} from '../../services/payments'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const money = (value) => `${fa(value)} ریال`
const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2c55d4]/30'

function Stepper({label, value, min = 10, max, stepUntil100 = 10, stepOver100 = 50, onChange, hint}) {
    const update = (next) => onChange(Math.max(min, Math.min(max, next)))
    return <div className="rounded-2xl border border-[#dce4f1] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
            <div><p className="font-extrabold">{label}</p>{hint &&
                <p className="mt-1 text-xs text-[#68758a]">{hint}</p>}</div>
            <output aria-live="polite" className="text-2xl font-black tabular-nums text-[#2347b4]">{fa(value)}</output>
        </div>
        <div className="mt-4 flex items-center gap-2">
            <button type="button" aria-label={`کاهش${label}`}
                    disabled={value <= min}
                    onClick={() => update(value - (value > 100 ? stepOver100 : stepUntil100))}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#c8d3e5] disabled:opacity-40 ${ring}`}>
                        <Minus size={17}/>
                        </button>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e9eef8]"><div className="h-full rounded-full bg-[#315bd5] transition-all" style={{width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`}}/>
        </div>
        <button type="button" aria-label={`افزایش ${label}`} disabled={value >= max}
                onClick={() => update(value + (value >= 100 ? stepOver100 : stepUntil100))} className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#c8d3e5] disabled:opacity-40 ${ring}`}><Plus size={17}/></button>
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-[#7b879b]"><span>{fa(min)} حداقل
    </span>
    <span>{fa(max)} حداکثر</span>
</div>
</div>
}

export default function CustomPlanBuilder() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const authenticated = useAuthStore((s) => Boolean(s.token))
    const [planKind, setPlanKind] = useState('webinar')
    const [institutionKind, setInstitutionKind] = useState('government')
    const [users, setUsers] = useState(100)
    const [images, setImages] = useState(50)
    const [duration, setDuration] = useState('month')
    const [startMode, setStartMode] = useState('now')

    const {data: config, isLoading, isError} = useQuery({
        queryKey: ['custom-plan-config'],
        queryFn: () => paymentsService.customConfig().then((r) => r.data),
    })
    const payload = useMemo(() => ({
        plan_kind: planKind,
        institution_kind: planKind === 'class' ? institutionKind : null,
        users, images, duration, start_mode: startMode,
    }), [planKind, institutionKind, users, images, duration, startMode])
    const {data: quote, isFetching: quoteLoading, isError: quoteError, error: quoteErrorData} = useQuery({
        queryKey: ['custom-plan-quote', payload],
        queryFn: () => paymentsService.customQuote(payload).then((r) => r.data),
        enabled: Boolean(config?.enabled && users && images),
        staleTime: 0,
    })
    const checkout = useMutation({
        mutationFn: () => paymentsService.customCheckout(payload),
        onSuccess: ({data}) => {
            queryClient.invalidateQueries({queryKey: ['my-subscription']})
            queryClient.invalidateQueries({queryKey: ['payment-orders']})
            if (data.payment_url) window.location.assign(data.payment_url)
            else navigate(data.order_id ? `/billing/result?order=${data.order_id}` : '/dashboard/subscription')
        },
        onError: (error) => toast.error(error.response?.data?.detail || 'ثبت سفارش انجام نشد.'),
    })

    const setUsersSafe = (next) => {
        const value = Math.max(10, Math.min(config?.max_users || 3000, next))
        setUsers(value)
        if (images > value) {
            const step = value <= 100 ? (config?.step_until_100 || 10) : (config?.step_over_100 || 50)
            setImages(Math.max(10, Math.floor(value / step) * step))
        }
    }
    const setImagesSafe = (next) => {
        const value = Math.max(10, Math.min(config?.max_images || 500, users, next))
        const step = value <= 100 ? (config?.step_until_100 || 10) : (config?.step_over_100 || 50)
        setImages(Math.max(10, Math.floor(value / step) * step))
    }
    const changeDuration = (value) => setDuration(value)

    if (isLoading) return <div
        className="rounded-3xl border border-[#dce4f1] bg-white p-12 text-center text-sm text-[#68758a]">در حال دریافت
        تنظیمات پلن‌ساز…</div>
    if (isError || !config?.enabled) return <div role="alert"
                                                 className="rounded-3xl border border-[#ead6a9] bg-white p-8 text-center">
        <AlertCircle className="mx-auto text-[#9a6700]"/><p className="mt-3 font-bold">پلن‌ساز در حال حاضر در دسترس
        نیست.</p></div>

    const durations = [
        {id: 'day', title: 'یک‌روزه', caption: 'برای رویداد کوتاه'},
        {id: 'month', title: 'یک‌ماهه', caption: '۳۰ روز'},
        {id: 'quarter', title: 'سه‌ماهه', caption: '۹۰ روز'},
        {id: 'half_year', title: 'شش‌ماهه', caption: `۶٪ تخفیف`},
    ]

    return <section
        className="overflow-hidden rounded-[28px] border border-[#dce4f1] bg-white shadow-[0_18px_60px_rgba(24,46,91,.08)]">
        <div className="relative overflow-hidden bg-[#101d3b] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="absolute -left-12 -top-24 h-64 w-64 rounded-full bg-[#315bd5]/30 blur-3xl"/>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><span
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold"><Check
                    size={14}/> پلن‌ساز اختصاصی</span>
                    <h2 className="mt-4 text-2xl font-black sm:text-3xl">ظرفیت موردنیازت را خودت بساز</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#d3ddf5]">تعداد کاربران و تصاویر را مشخص کن؛
                        قیمت و جزئیات پلن به‌صورت لحظه‌ای محاسبه می‌شود.</p>
                </div>
                <div className="flex gap-3 text-xs text-[#d3ddf5]"><span
                    className="rounded-xl bg-white/10 px-3 py-2">حداکثر {fa(config.max_users)} کاربر</span><span
                    className="rounded-xl bg-white/10 px-3 py-2">حداکثر {fa(config.max_images)} تصویر</span></div>
            </div>
        </div>

        <div className="grid gap-6 p-4 sm:p-7 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
                <div>
                    <p className="mb-3 text-sm font-extrabold">نوع پلن را انتخاب کن</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[{
                            id: 'webinar',
                            title: 'وبینار',
                            desc: 'برای رویدادها و ارائه آنلاین',
                            Icon: Video
                        }, {
                            id: 'class',
                            title: 'کلاس آموزشی',
                            desc: 'برای مدارس و مراکز آموزشی',
                            Icon: Users
                        }].map(({id, title, desc, Icon}) =>
                            <button key={id} type="button" aria-pressed={planKind === id}
                                    onClick={() => setPlanKind(id)}
                                    className={`rounded-2xl border-2 p-4 text-right transition ${ring} ${planKind === id ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0] hover:border-[#aabbe6]'}`}>
                                <Icon className={planKind === id ? 'text-[#315bd5]' : 'text-[#7b879b'}/>
                                <p className="mt-3 font-extrabold">{title}</p><p
                                className="mt-1 text-xs leading-6 text-[#68758a]">{desc}</p>
                            </button>)}
                    </div>
                </div>

                {planKind === 'class' && <div className="rounded-2xl border border-[#dce4f1] p-4">
                    <p className="mb-3 text-sm font-extrabold">نوع مرکز آموزشی</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => setInstitutionKind('government')}
                                aria-pressed={institutionKind === 'government'}
                                className={`min-h-12 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${institutionKind === 'government' ? 'border-[#315bd5] bg-[#f1f5ff] text-[#2347b4]' : 'border-[#e1e7f0]'}`}>مدرسه
                            دولتی
                        </button>
                        <button type="button" onClick={() => setInstitutionKind('nonprofit')}
                                aria-pressed={institutionKind === 'nonprofit'}
                                className={`min-h-12 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${institutionKind === 'nonprofit' ? 'border-[#315bd5] bg-[#f1f5ff] text-[#2347b4]' : 'border-[#e1e7f0]'}`}>مؤسسه
                            غیرانتفاعی / آموزشی
                        </button>
                    </div>
                    {institutionKind === 'government' &&
                        <p className="mt-3 rounded-xl bg-[#fff8e8] p-3 text-xs leading-6 text-[#77551b]">تخفیف مدارس
                            دولتی در محاسبه لحاظ می‌شود. پس از خرید، یادآوری بارگذاری مدارک در داشبورد نمایش داده خواهد
                            شد.</p>}
                </div>}

                <div>
                    <p className="mb-3 text-sm font-extrabold">ظرفیت پلن</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Stepper label="تعداد کاربران" value={users} max={config.max_users}
                                 stepUntil100={config.step_until_100} stepOver100={config.step_over_100}
                                 onChange={setUsersSafe} hint="تعداد کل کاربران مجاز در پلن"/>
                        <Stepper label="تعداد تصاویر هم‌زمان" value={images} max={Math.min(config.max_images, users)}
                                 stepUntil100={config.step_until_100} stepOver100={config.step_over_100}
                                 onChange={setImagesSafe} hint="تعداد تصویرهای مجاز هم‌زمان"/>
                    </div>
                    {users > 200 && <p role="status"
                                       className="mt-3 flex items-start gap-2 rounded-xl border border-[#dce4f1] bg-[#f6f8fc] p-3 text-xs leading-6 text-[#46536b]">
                        <AlertCircle size={16} className="mt-0.5 shrink-0"/>ظرفیت انتخابی شما بیش از ۲۰۰ کاربر است؛ این
                        خرید با ظرفیت بالاتر به‌صرفه‌تر می‌شود. انتخاب شما اشتباه نیست و می‌توانید ادامه دهید.</p>}
                </div>

                <div>
                    <p className="mb-3 text-sm font-extrabold">مدت اعتبار پلن</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {durations.map((item) => <button key={item.id} type="button"
                                                         onClick={() => changeDuration(item.id)}
                                                         aria-pressed={duration === item.id}
                                                         className={`rounded-xl border-2 p-3 text-right ${ring} ${duration === item.id ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>
                            <span className="block text-sm font-extrabold">{item.title}</span><span
                            className="mt-1 block text-[11px] text-[#68758a]">{item.caption}</span>
                        </button>)}
                    </div>
                    {duration === 'half_year' &&
                        <p className="mt-3 rounded-xl bg-[#edf8f3] p-3 text-sm font-bold text-[#176447]">تخفیف {fa(config.discount_6_month_percent)}٪
                            شش‌ماهه در مبلغ بالا محاسبه و نمایش داده می‌شود.</p>}
                </div>

                <div className="rounded-2xl border border-[#dce4f1] p-4">
                    <p className="mb-3 text-sm font-extrabold">زمان شروع پلن</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setStartMode('now')} aria-pressed={startMode === 'now'}
                                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${startMode === 'now' ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>شروع
                            از امروز
                        </button>
                        <button type="button" onClick={() => setStartMode('reserved')}
                                aria-pressed={startMode === 'reserved'}
                                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${startMode === 'reserved' ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>رزرو
                            برای شروع بعدی
                        </button>
                    </div>
                </div>
            </div>

            <aside className="h-fit rounded-2xl border border-[#dce4f1] bg-[#f7f9fd] p-4 sm:p-5 lg:sticky lg:top-24">
                <div className="flex items-center gap-2"><CalendarDays size={18} className="text-[#315bd5]"/><h3
                    className="font-extrabold">خلاصه پلن و پیش‌فاکتور</h3></div>
                <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span
                        className="text-[#68758a]">نوع پلن</span><b>{planKind === 'webinar' ? 'وبینار' : 'کلاس آموزشی'}</b>
                    </div>
                    <div className="flex justify-between"><span
                        className="text-[#68758a]">کاربران</span><b>{fa(users)}</b></div>
                    <div className="flex justify-between"><span
                        className="text-[#68758a]">تصاویر</span><b>{fa(images)}</b></div>
                    <div className="flex justify-between"><span
                        className="text-[#68758a]">مدت</span><b>{durations.find((x) => x.id === duration)?.title}</b>
                    </div>
                </div>
                <div className="my-4 border-t border-[#dce4f1]"/>
                {quoteLoading ? <p role="status" className="py-4 text-center text-xs text-[#68758a]"><Loader2
                        className="mx-auto mb-2 animate-spin"/>در حال محاسبه…</p>
                    : quoteError ? <p role="alert"
                                      className="text-xs leading-6 text-[#a3182b]">{quoteErrorData?.response?.data?.detail || 'محاسبه قیمت ممکن نشد.'}</p>
                        : quote ? <>
                            {duration === 'half_year' &&
                                <div className="mb-3 flex justify-between text-sm text-[#176447]">
                                    <span>تخفیف شش‌ماهه ({fa(quote.discount_6_month_percent)}٪)</span><b>{money(quote.discount_amount)}</b>
                                </div>}
                            {quote.government_discount_amount > 0 &&
                                <div className="mb-3 flex justify-between text-sm text-[#176447]"><span>تخفیف مدارس دولتی ({fa(quote.government_discount_percent)}٪)</span><b>{money(quote.government_discount_amount)}</b>
                                </div>}
                            {quote.tax_enabled &&
                                <div className="mb-3 flex justify-between text-xs"><span className="text-[#68758a]">مالیات ({fa(quote.tax_percent)}٪)</span><b>{money(quote.tax_amount)}</b>
                                </div>}
                            <div className="rounded-xl bg-[#101d3b] p-4 text-white"><p
                                className="text-xs text-[#d3ddf5]">مبلغ قابل پرداخت</p><p
                                className="mt-2 text-2xl font-black tabular-nums">{money(quote.total)}</p><p
                                className="mt-1 text-[10px] text-[#c4d0eb]">قیمت نهایی بر اساس تنظیمات سامانه</p></div>
                        </> : <p className="text-xs text-[#68758a]">برای محاسبه پیش‌فاکتور ظرفیت را انتخاب کنید.</p>}
                <button type="button" disabled={!quote || quoteLoading || checkout.isPending || quoteError}
                        onClick={() => {
                            if (!authenticated) {
                                navigate(`/login?next=${encodeURIComponent('/pricing')}`);
                                return
                            }
                            checkout.mutate()
                        }}
                        className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#315bd5] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#2347b4] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`}>
                    {checkout.isPending ? <Loader2 size={17} className="animate-spin"/> : <><ShieldCheck
                        size={17}/> ادامه و پرداخت <ArrowLeft size={16}/></>}
                </button>
                {!authenticated &&
                    <p className="mt-2 text-center text-[11px] text-[#68758a]">برای ادامه خرید ابتدا وارد حساب
                        شوید.</p>}
                <p className="mt-3 text-center text-[10px] leading-5 text-[#7b879b]">مالیات و تخفیف‌ها مطابق تنظیمات
                    سامانه محاسبه می‌شوند.</p>
            </aside>
        </div>
    </section>
}
