import {Link} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {
    CalendarDays,
    Users,
    Video,
    CreditCard,
    Settings,
    Plus,
    ArrowLeft,
    Activity,
    Sparkles,
    Loader2,
    Image as ImageIcon,
    Clock3,
    Gauge
} from 'lucide-react'
import {useAuthStore} from '../../store/authStore'
import {useRooms} from '../../hooks/useRooms'
import {paymentsService} from '../../services/payments'

function Shortcut({to, icon: Icon, title, description, tone = 'blue'}) {
    return <Link to={to} className="group meet-card meet-card-hover flex min-h-[156px] flex-col justify-between p-5">
        <div className="flex items-start justify-between"><span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === 'mint' ? 'bg-[#e8faf4] text-[#2eaf89]' : tone === 'violet' ? 'bg-[#f1edff] text-[#8067d8]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon
            size={20}/></span><ArrowLeft size={16}
                                         className="text-[#b2bdcd] transition group-hover:-translate-x-1 group-hover:text-[#4f7cff]"/>
        </div>
        <div><h2 className="text-sm font-extrabold text-[#101827]">{title}</h2><p
            className="mt-1 text-xs leading-6 text-[#8d98aa]">{description}</p></div>
    </Link>
}

function Metric({value, label, icon: Icon, tone}) {
    return <div className="meet-card flex items-center gap-4 p-4 sm:p-5"><span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === 'mint' ? 'bg-[#e8faf4] text-[#2eaf89]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon
        size={19}/></span>
        <div><p className="text-2xl font-extrabold text-[#101827]">{value}</p><p
            className="mt-1 text-xs text-[#8d98aa]">{label}</p></div>
    </div>
}

const fa = (value) => Number(value ?? 0).toLocaleString('fa-IR')
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '')
const deriveUsed = (used, total, remaining) => firstDefined(used, total != null && remaining != null ? Math.max(0, Number(total) - Number(remaining)) : undefined)
const remainingDays = (expiresAt) => {
    if (!expiresAt) return null
    const time = new Date(expiresAt).getTime()
    return Number.isNaN(time) ? null : Math.max(0, Math.ceil((time - Date.now()) / 86400000))
}

function UsageMeter({icon: Icon, title, used, remaining, total, tone = 'blue'}) {
    const hasNumbers = used !== null && used !== undefined && remaining !== null && remaining !== undefined && Number.isFinite(Number(used)) && Number.isFinite(Number(remaining))
    const max = Number.isFinite(Number(total)) ? Number(total) : Number(used || 0) + Number(remaining || 0)
    const percent = hasNumbers && max > 0 ? Math.min(100, Math.round((Number(used) / max) * 100)) : 0
    return <div className="rounded-2xl border border-[#e8edf5] bg-white/85 p-4">
        <div className="flex items-center gap-2"><span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === 'mint' ? 'bg-[#e8faf4] text-[#239b79]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon
            size={18} aria-hidden="true"/></span><h3 className="text-sm font-bold text-[#34415a]">{title}</h3></div>
        <div className="mt-3 flex items-end justify-between gap-3">
            <div><p className="text-xs text-[#8d98aa]">مصرف‌شده</p><p
                className="mt-1 text-xl font-extrabold tabular-nums text-[#101827]">{used == null ? '—' : fa(used)}</p>
            </div>
            <div className="text-left"><p className="text-xs text-[#8d98aa]">باقی‌مانده</p><p
                className="mt-1 text-lg font-extrabold tabular-nums text-[#239b79]">{remaining == null ? '—' : fa(remaining)}</p>
            </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf1f7]" role="progressbar"
             aria-label={`مصرف ${title}`} aria-valuemin={0} aria-valuemax={max || 100}
             aria-valuenow={hasNumbers ? Number(used) : 0}>
            <div className={`h-full rounded-full ${tone === 'mint' ? 'bg-[#35b992]' : 'bg-[#4f7cff]'}`}
                 style={{width: `${percent}%`}}/>
        </div>
        {total != null && <p className="mt-2 text-[11px] text-[#8d98aa]">از مجموع {fa(total)}</p>}
    </div>
}

export default function DashboardPage() {
    const user = useAuthStore(s => s.user);
    const {data: rooms = [], isLoading} = useRooms()
    const {data: sub, isLoading: subLoading} = useQuery({
        queryKey: ['my-subscription'],
        queryFn: () => paymentsService.me().then(r => r.data)
    })
    const live = rooms.filter(r => r.status === 'live').length;
    const scheduled = rooms.filter(r => r.status === 'scheduled' && !r.ended_at).length
    const active = sub?.active
    const reserved = sub?.reserved?.[0]
    const allocations = sub?.room_allocations || sub?.allocations || {}
    const limits = sub?.limits || {}
    const userUsage = limits.max_users || limits.users || limits.allocated_users || {}
    const imageUsage = limits.max_video_streams || limits.max_images || limits.images || {}
    const usersRemaining = firstDefined(allocations.users_remaining, allocations.remaining_users, userUsage.remaining)
    const usersTotal = firstDefined(allocations.users_total, allocations.users_limit, userUsage.value)
    const usersUsed = deriveUsed(firstDefined(allocations.users_used, allocations.users_consumed, allocations.users_allocated, userUsage.used), usersTotal, usersRemaining)
    const imagesRemaining = firstDefined(allocations.images_remaining, allocations.remaining_images, imageUsage.remaining)
    const imagesTotal = firstDefined(allocations.images_total, allocations.images_limit, imageUsage.value)
    const imagesUsed = deriveUsed(firstDefined(allocations.images_used, allocations.images_consumed, allocations.images_allocated, imageUsage.used), imagesTotal, imagesRemaining)
    const days = remainingDays(active?.expires_at)
    const statusTitle = active ? (days === 0 ? 'اعتبار پلن به پایان رسیده' : 'اشتراک فعال') : reserved ? 'پلن شما رزرو شده' : 'بدون اشتراک فعال'
    return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="mx-auto max-w-[1450px]">
            <header
                className="dashboard-hero mb-5 flex flex-col gap-5 rounded-[26px] p-5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div><p className="mb-2 text-xs font-bold text-[#4f7cff]">نمای کلی فضای کاری</p><h1
                    className="text-2xl font-extrabold tracking-tight text-[#101827] sm:text-3xl">{user?.display_name || user?.username || 'کاربر'}،
                    خوش آمدید</h1><p className="mt-2 text-sm text-[#68758a]">مدیریت جلسات و اتاق‌های آنلاین از یک فضای
                    ساده و یکپارچه.</p></div>
                <Link to="/dashboard/create"
                      className="meet-primary-btn inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-xl px-5 text-sm font-bold sm:self-start"><Plus
                    size={18}/>ساخت اتاق جدید</Link></header>
            <div className="mb-6 grid gap-3 sm:grid-cols-3"><Metric
                value={isLoading ? '—' : live.toLocaleString('fa-IR')} label="اتاق در حال برگزاری" icon={Video}/><Metric
                value={isLoading ? '—' : scheduled.toLocaleString('fa-IR')} label="اتاق زمان‌بندی‌شده"
                icon={CalendarDays} tone="mint"/><Metric value={isLoading ? '—' : rooms.length.toLocaleString('fa-IR')}
                                                         label="مجموع اتاق‌ها" icon={Users}/></div>
            {/*<section aria-labelledby="subscription-overview"*/}
            {/*         className="mb-6 overflow-hidden rounded-[24px] border border-[#dfe8f5] bg-gradient-to-l from-white via-white to-[#eef4ff] p-4 shadow-[0_12px_32px_rgba(35,61,105,.05)] sm:p-6">*/}
            {/*    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">*/}
            {/*        <div className="flex items-start gap-3"><span*/}
            {/*            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf0ff] text-[#4f7cff]"><Gauge*/}
            {/*            size={21}/></span>*/}
            {/*            <div>*/}
            {/*                <div className="flex flex-wrap items-center gap-2"><h2 id="subscription-overview"*/}
            {/*                                                                       className="text-base font-extrabold text-[#101827]">وضعیت*/}
            {/*                    پلن و ظرفیت حساب</h2>{!subLoading && <span*/}
            {/*                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? 'bg-[#e5f8f1] text-[#16815f]' : reserved ? 'bg-[#edf2ff] text-[#3d66e8]' : 'bg-[#f1f3f7] text-[#68758a]'}`}>{statusTitle}</span>}*/}
            {/*                </div>*/}
            {/*                {subLoading ?*/}
            {/*                    <p role="status" className="mt-2 flex items-center gap-2 text-xs text-[#8d98aa]">*/}
            {/*                        <Loader2 size={14} className="animate-spin"/>در حال دریافت اطلاعات پلن…</p> : <><p*/}
            {/*                        className="mt-1 text-sm font-bold text-[#34415a]">{active?.plan?.name || reserved?.plan?.name || 'پلنی انتخاب نشده است'}</p>*/}
            {/*                        <p className="mt-1 text-xs text-[#7c899e]">{active ? (days == null ? 'تاریخ پایان در دسترس نیست' : days === 0 ? 'اعتبار پلن تمام شده است' : `${fa(days)} روز تا پایان اعتبار`) : reserved ? 'این پلن پس از شروع، محاسبه اعتبار را آغاز می‌کند.' : 'برای فعال‌سازی ظرفیت و ساخت اتاق، یک پلن انتخاب کنید.'}</p></>}*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*        <div className="flex flex-wrap gap-2"><Link to="/dashboard/subscription"*/}
            {/*                                                    className="meet-soft-btn inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold">جزئیات*/}
            {/*            اشتراک</Link><Link to="/dashboard/pricing"*/}
            {/*                               className="meet-primary-btn inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold">{active ? 'تمدید یا ارتقا' : 'مشاهده تعرفه‌ها'}</Link>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*    {!subLoading && (active || reserved) &&*/}
            {/*        <div className="mt-5 grid gap-3 md:grid-cols-2"><UsageMeter icon={Users} title="کاربران تخصیص‌یافته"*/}
            {/*                                                                    used={usersUsed}*/}
            {/*                                                                    remaining={usersRemaining}*/}
            {/*                                                                    total={usersTotal}/><UsageMeter*/}
            {/*            icon={ImageIcon} title="تصاویر اختصاصی" used={imagesUsed} remaining={imagesRemaining}*/}
            {/*            total={imagesTotal} tone="mint"/></div>}*/}
            {/*    {!subLoading && !active && reserved &&*/}
            {/*        <p className="mt-3 rounded-xl bg-[#edf2ff] px-3 py-2.5 text-xs leading-6 text-[#3d66e8]">پلن رزروشده*/}
            {/*            است؛ مصرف و روزهای اعتبار پس از شروع پلن نمایش داده می‌شوند.</p>}*/}
            {/*</section>*/}
            <div className="mb-3 flex items-center justify-between">
                <div><h2 className="text-base font-extrabold text-[#101827]">دسترسی سریع</h2><p
                    className="mt-1 text-xs text-[#8d98aa]">بخش موردنظر را انتخاب کنید.</p></div>
                <Sparkles size={18} className="text-[#54c9a5]"/></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Shortcut to="/dashboard/rooms"
                                                                                icon={CalendarDays} title="لیست اتاق‌ها"
                                                                                description="مشاهده، ورود و مدیریت اتاق‌ها"
                                                                                tone="mint"/><Shortcut
                to="/dashboard/people" icon={Users} title="تعریف کاربران"
                description="مدیریت معلمان، دانش‌آموزان و کاربران"/><Shortcut to="/dashboard/subscription"
                                                                              icon={CreditCard} title="اشتراک و پرداخت"
                                                                              description="وضعیت پلن و سوابق پرداخت"
                                                                              tone="violet"/><Shortcut
                to="/dashboard/settings" icon={Settings} title="تنظیمات حساب"
                description="مدیریت امکانات پیش‌فرض حساب"/></div>
        </div>
    </div>
}
