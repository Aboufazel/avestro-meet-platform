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
    ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import {useNavigate} from 'react-router-dom'
import {useAuthStore} from '../../store/authStore'
import {paymentsService} from '../../services/payments'
import InlineOtpDialog from './InlineOtpDialog'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const money = (value) => `${fa(value)} ریال`
const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'

/**
 * مقدارهای مجاز ظرفیت (هم‌راستا با اعتبارسنجی سرور):
 * از حداقل تا قبل از `single_step_below` یکی‌یکی، بعد گام تا ۱۰۰ و بالای ۱۰۰ گام بزرگ‌تر.
 */
function buildOptions(min, max, cfg) {
    const stepLow = cfg.step_until_100 || 10
    const stepHigh = cfg.step_over_100 || 50
    const singleBelow = cfg.single_step_below ?? 10
    const out = []
    for (let v = min; v < singleBelow && v <= max; v += 1) out.push(v)
    for (let v = Math.ceil(Math.max(singleBelow, min) / stepLow) * stepLow; v <= Math.min(100, max); v += stepLow) out.push(v)
    for (let v = 100 + stepHigh; v <= max; v += stepHigh) out.push(v)
    return out.length ? out : [min]
}

const snapDown = (options, value) => {
    let best = options[0]
    for (const option of options) if (option <= value) best = option
    return best
}

function Stepper({label, value, options, onChange, hint}) {
    const min = options[0]
    const max = options[options.length - 1]
    const index = Math.max(0, options.indexOf(value))
    return <div className="rounded-2xl border border-[#dce4f1] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
            <div><p className="font-extrabold">{label}</p>{hint &&
                <p className="mt-1 text-xs text-[#68758a]">{hint}</p>}</div>
            <output aria-live="polite" className="text-2xl font-black tabular-nums text-[#3d66e8]">{fa(value)}</output>
        </div>
        <div className="mt-4 flex items-center gap-2">
            <button type="button" aria-label={`کاهش ${label}`} disabled={index <= 0}
                    onClick={() => onChange(options[index - 1])}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#c8d3e5] disabled:opacity-40 ${ring}`}>
                <Minus size={17}/></button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e9eef8]">
                <div className="h-full rounded-full bg-[#315bd5] transition-all"
                     style={{width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`}}/>
            </div>
            <button type="button" aria-label={`افزایش ${label}`} disabled={index >= options.length - 1}
                    onClick={() => onChange(options[index + 1])}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#c8d3e5] disabled:opacity-40 ${ring}`}>
                <Plus size={17}/></button>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[#7b879b]">
            <span>{fa(min)} حداقل</span><span>{fa(max)} حداکثر</span></div>
    </div>
}

export default function CustomPlanBuilder() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const authenticated = useAuthStore((s) => Boolean(s.token))
    const [governmentSchool, setGovernmentSchool] = useState(false)
    const [rawUsers, setUsers] = useState(100)
    const [rawImages, setImages] = useState(50)
    const [otpOpen, setOtpOpen] = useState(false)
    const setAuth = useAuthStore((s) => s.setAuth)
    const [duration, setDuration] = useState('month')
    const [requestedStartMode, setStartMode] = useState('now')
    const [promoCode, setPromoCode] = useState('')
    const [referralCode, setReferralCode] = useState('')

    // با اشتراک فعال فقط «رزرو» ممکن است؛ بدون اشتراک فعال، شروع از امروز هم مجاز است.
    const {data: subscriptionInfo, isLoading: subscriptionLoading} = useQuery({
        queryKey: ['my-subscription'],
        queryFn: () => paymentsService.me().then((r) => r.data),
        enabled: authenticated,
    })
    const hasActivePlan = Boolean(subscriptionInfo?.active)
    const startMode = hasActivePlan ? 'reserved' : requestedStartMode
    const waitingForSubscription = authenticated && subscriptionLoading

    const {data: config, isLoading, isError} = useQuery({
        queryKey: ['custom-plan-config'],
        queryFn: () => paymentsService.customConfig().then((r) => r.data),
    })
    const cfg = config || {}
    const minUsers = cfg.min_users ?? 2
    const minImages = cfg.min_images ?? 1
    const userOptions = useMemo(() => buildOptions(minUsers, cfg.max_users || 3000, cfg), [config]) // eslint-disable-line react-hooks/exhaustive-deps
    const users = userOptions.includes(rawUsers) ? rawUsers : snapDown(userOptions, rawUsers)
    const imageOptions = useMemo(() => buildOptions(minImages, Math.min(cfg.max_images || 500, users), cfg), [config, users]) // eslint-disable-line react-hooks/exhaustive-deps
    const images = imageOptions.includes(rawImages) ? rawImages : snapDown(imageOptions, rawImages)
    const payload = useMemo(() => ({
        government_school: governmentSchool,
        users,
        images,
        duration,
        start_mode: startMode,
        promo_code: promoCode.trim(),
        referral_code: referralCode.trim(),
    }), [governmentSchool, users, images, duration, startMode, promoCode, referralCode])
    const {data: quote, isFetching: quoteLoading, isError: quoteError, error: quoteErrorData} = useQuery({
        queryKey: ['custom-plan-quote', payload],
        queryFn: () => paymentsService.customQuote(payload).then((r) => r.data),
        enabled: Boolean(config?.enabled && users && images && !waitingForSubscription),
        staleTime: 0,
    })
    const checkout = useMutation({
        mutationFn: (override) => paymentsService.customCheckout({...payload, ...(override || {})}),
        onSuccess: ({data}) => {
            queryClient.invalidateQueries({queryKey: ['my-subscription']})
            queryClient.invalidateQueries({queryKey: ['payment-orders']})
            if (data.payment_url) window.location.assign(data.payment_url)
            else navigate(data.order_id ? `/billing/result?order=${data.order_id}` : '/dashboard/subscription')
        },
        onError: (error) => toast.error(error.response?.data?.detail || 'ثبت سفارش انجام نشد.'),
    })

    const setUsersSafe = (next) => setUsers(snapDown(userOptions, next))
    const setImagesSafe = (next) => setImages(snapDown(imageOptions, next))

    // بعد از تأیید شماره: ورود، سپس مستقیم ثبت سفارش و رفتن به درگاه
    const onOtpVerified = async (data) => {
        setAuth(data.access, data.user, data.refresh)
        queryClient.invalidateQueries({queryKey: ['free-plans']})
        let override = {}
        try {
            const {data: info} = await paymentsService.me()
            if (info?.active) override = {start_mode: 'reserved'} // با اشتراک فعال فقط رزرو ممکن است
        } catch { /* نادیده: سرور پیام مناسب می‌دهد */ }
        setOtpOpen(false)
        checkout.mutate(override)
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
        {id: 'quarter', title: 'سه‌ماهه', caption: `۹۰ روز · ${fa(config.discount_quarter_percent ?? 6)}٪ تخفیف`},
    ]

    return <section
        className="overflow-hidden rounded-[28px] border border-[#dce4f1] bg-white shadow-[0_18px_60px_rgba(24,46,91,.08)]">
        <div className="relative overflow-hidden bg-[#101d3b] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div className="absolute -left-12 -top-24 h-64 w-64 rounded-full bg-[#315bd5]/30 blur-3xl"/>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><span
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold"><Check
                    size={14}/> ساخت پلن اختصاصی</span>
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
                <div className="rounded-2xl border border-[#dce4f1] p-4">
                    <p className="mb-1 text-sm text-[#68758a]">این پلن هم برای جلسه آنلاین و هم برای کلاس آموزشی قابل استفاده است.</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                        <div>
                            <p id="gov-school-label" className="text-sm font-extrabold">مدرسه دولتی هستم</p>
                            <p className="mt-1 text-xs leading-6 text-[#68758a]">
                                {Number(config.government_school_discount_percent) > 0
                                    ? `با فعال‌سازی، ${fa(config.government_school_discount_percent)}٪ تخفیف مدارس دولتی اعمال می‌شود.`
                                    : 'مخصوص مدارس دولتی'}
                            </p>
                        </div>
                        <button type="button" role="switch" aria-checked={governmentSchool} aria-labelledby="gov-school-label"
                                onClick={() => setGovernmentSchool((v) => !v)}
                                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${ring} ${governmentSchool ? 'bg-[#315bd5]' : 'bg-[#c8d3e5]'}`}>
                            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${governmentSchool ? 'right-1' : 'right-7'}`}/>
                        </button>
                    </div>
                    {governmentSchool &&
                        <p className="mt-3 rounded-xl bg-[#fff8e8] p-3 text-xs leading-6 text-[#77551b]">
                            در صورت انتخاب این گزینه تخفیف مدارس
                            دولتی در محاسبه لحاظ می‌شود. پس از خرید، نیاز است که مدارک در اسرع وقت در کارتابل شما بارگزاری شود
                        </p>
                    }
                </div>

                <div>
                    <p className="mb-3 text-md font-extrabold">۱- ظرفیت پلن</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Stepper label="تعداد کاربران" value={users} options={userOptions}
                                 onChange={setUsersSafe} hint="تعداد کاربران هم‌زمان"/>
                        <Stepper label="تعداد تصاویر هم‌زمان" value={images} options={imageOptions}
                                 onChange={setImagesSafe} hint="تعداد تصاویر هم‌زمان"/>
                    </div>
                    {users > 200 && <p role="status"
                                       className="mt-3 flex items-start gap-2 rounded-xl border border-[#dce4f1] bg-[#f6f8fc] p-3 text-xs leading-6 text-[#46536b]">
                        <AlertCircle size={16} className="mt-0.5 shrink-0"/>ظرفیت انتخابی شما بیش از ۲۰۰ کاربر است؛ این
                        خرید با ظرفیت بالاتر به‌صرفه‌تر می‌شود. انتخاب شما اشتباه نیست و می‌توانید ادامه دهید.</p>}
                </div>

                <div>
                    <p className="mb-3 text-md font-extrabold">۲- بازه اشتراک</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {durations.map((item) => <button key={item.id} type="button"
                                                         onClick={() => changeDuration(item.id)}
                                                         aria-pressed={duration === item.id}
                                                         className={`rounded-xl border-2 p-3 text-right ${ring} ${duration === item.id ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>
                            <span className="block text-sm font-extrabold">{item.title}</span><span
                            className="mt-1 block text-[11px] text-[#68758a]">{item.caption}</span>
                        </button>)}
                    </div>
                    {duration === 'quarter' &&
                        <p className="mt-3 rounded-xl bg-[#edf8f3] p-3 text-sm font-bold text-[#176447]">تخفیف {fa(config.discount_quarter_percent ?? 6)}٪
                            سه‌ماهه در پیش‌فاکتور اعمال شده است.</p>}
                </div>

                <div className="rounded-2xl border border-[#dce4f1] p-4">
                    <p className="mb-3 text-md font-extrabold">کد تخفیف یا کد معرف</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold text-[#46536b]">کد تخفیف
                            <input value={promoCode} onChange={(e) => {
                                setPromoCode(e.target.value.toUpperCase());
                                if (e.target.value) setReferralCode('')
                            }} placeholder="مثلاً AV-XXXX"
                                   className="mt-2 min-h-11 w-full rounded-xl border border-[#dce4f1] px-3 text-sm outline-none focus:border-[#315bd5]"/>
                        </label>
                        <label className="block text-xs font-bold text-[#46536b]">کد معرف
                            <input value={referralCode} onChange={(e) => {
                                setReferralCode(e.target.value.toUpperCase());
                                if (e.target.value) setPromoCode('')
                            }} placeholder="کد معرف"
                                   className="mt-2 min-h-11 w-full rounded-xl border border-[#dce4f1] px-3 text-sm outline-none focus:border-[#315bd5]"/>
                        </label>
                    </div>
                    <p className="mt-2 text-[11px] text-[#7b879b]">فقط یکی از این دو کد را می‌توانید در هر سفارش استفاده
                        کنید.</p>
                </div>

                <div className="rounded-2xl border border-[#dce4f1] p-4">
                    <p className="mb-3 text-md font-extrabold">زمان شروع پلن</p>
                    {hasActivePlan ? <>
                        <button type="button" aria-pressed="true" disabled
                                className={`min-h-11 w-full rounded-xl border-2 border-[#315bd5] bg-[#f1f5ff] px-3 text-sm font-bold ${ring}`}>رزرو
                            برای شروع بعدی
                        </button>
                        <p className="mt-3 text-xs leading-6 text-[#68758a]">اشتراک فعال دارید؛ پلن جدید رزرو می‌شود و پس از پایان اشتراک فعلی از بخش «اشتراک و پرداخت» شروع می‌کنید.</p>
                    </> : <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setStartMode('now')} aria-pressed={startMode === 'now'}
                                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${startMode === 'now' ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>شروع
                            از امروز
                        </button>
                        <button type="button" onClick={() => setStartMode('reserved')}
                                aria-pressed={startMode === 'reserved'}
                                className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold ${ring} ${startMode === 'reserved' ? 'border-[#315bd5] bg-[#f1f5ff]' : 'border-[#e1e7f0]'}`}>رزرو
                            برای شروع بعدی
                        </button>
                    </div>}
                </div>
            </div>

            <aside className="h-fit rounded-2xl border border-[#dce4f1] bg-[#f7f9fd] p-4 sm:p-5 lg:sticky lg:top-24">
                <div className="flex items-center gap-2"><CalendarDays size={18} className="text-[#315bd5]"/><h3
                    className="font-extrabold">خلاصه پلن و پیش‌فاکتور</h3></div>
                <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span
                        className="text-[#68758a]">کاربرد</span><b>جلسه آنلاین و کلاس</b>
                    </div>
                    {governmentSchool && <div className="flex justify-between"><span
                        className="text-[#68758a]">مدرسه دولتی</span><b>بله</b></div>}
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
                            {duration === 'quarter' &&
                                <div className="mb-3 flex justify-between text-sm text-[#176447]">
                                    <span>تخفیف سه‌ماهه ({fa(quote.duration_discount_percent)}٪)</span><b>{money(quote.duration_discount_amount)}</b>
                                </div>}
                            {quote.code_discount_amount > 0 &&
                                <div className="mb-3 flex justify-between text-sm text-[#176447]">
                                    <span>تخفیف کد {quote.code || ''}</span><b>{money(quote.code_discount_amount)}</b>
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
                                setOtpOpen(true)
                                return
                            }
                            checkout.mutate()
                        }}
                        className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#315bd5] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#3d66e8] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`}>
                    {checkout.isPending ? <Loader2 size={17} className="animate-spin"/> : <><ShieldCheck
                        size={17}/> {authenticated ? 'ادامه و پرداخت' : 'تأیید شماره و پرداخت'} <ArrowLeft size={16}/></>}
                </button>
                {!authenticated &&
                    <p className="mt-2 text-center text-[11px] text-[#68758a]">برای ادامه فقط شماره موبایل شما با کد پیامکی
                        تأیید می‌شود؛ نیازی به ساخت جداگانه حساب نیست.</p>}
                <p className="mt-3 text-center text-[10px] leading-5 text-[#7b879b]">مالیات و تخفیف‌ها مطابق تنظیمات
                    سامانه محاسبه می‌شوند.</p>
            </aside>
        </div>
        <InlineOtpDialog open={otpOpen} onClose={() => setOtpOpen(false)} onVerified={onOtpVerified}/>
    </section>
}
