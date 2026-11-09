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
    Sparkles
} from 'lucide-react'
import {useAuthStore} from '../../store/authStore'
import {useRooms} from '../../hooks/useRooms'
import {paymentsService} from '../../services/payments'
import PlanOverviewCard from '../../components/shared/PlanOverviewCard'
import {userDisplayName} from '../../utils/userName'

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

export default function DashboardPage() {
    const user = useAuthStore(s => s.user);
    const {data: rooms = [], isLoading} = useRooms()
    const {data: sub, isLoading: subLoading} = useQuery({
        queryKey: ['my-subscription'],
        queryFn: () => paymentsService.me().then(r => r.data)
    })
    const live = rooms.filter(r => r.status === 'live').length;
    const scheduled = rooms.filter(r => r.status === 'scheduled' && !r.ended_at).length
    return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="mx-auto max-w-[1450px]">
            <header
                className="dashboard-hero mb-5 flex flex-col gap-5 rounded-[26px] p-5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div><p className="mb-2 text-xs font-bold text-[#4f7cff]">نمای کلی فضای کاری</p><h1
                    className="text-2xl font-extrabold tracking-tight text-[#101827] sm:text-3xl">{userDisplayName(user)}،
                    خوش آمدید</h1><p className="mt-2 text-sm text-[#68758a]">مدیریت جلسات و اتاق‌های آنلاین از یک فضای
                    ساده و یکپارچه.</p></div>
                <Link to="/dashboard/create"
                      className="meet-primary-btn inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-xl px-5 text-sm font-bold sm:self-start"><Plus
                    size={18}/>ساخت اتاق جدید</Link></header>
            {user && !user.display_name && <Link to="/dashboard/profile" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[#d9e3ff] bg-[#f3f6ff] px-4 py-3 text-sm text-[#3d66e8]"><span>پروفایل خود را کامل کنید تا نام شما در جلسه‌ها نمایش داده شود.</span><ArrowLeft size={16}/></Link>}
            <div className="mb-6 grid gap-3 sm:grid-cols-3"><Metric
                value={isLoading ? '—' : live.toLocaleString('fa-IR')} label="اتاق در حال برگزاری" icon={Video}/><Metric
                value={isLoading ? '—' : scheduled.toLocaleString('fa-IR')} label="اتاق زمان‌بندی‌شده"
                icon={CalendarDays} tone="mint"/><Metric value={isLoading ? '—' : rooms.length.toLocaleString('fa-IR')}
                                                         label="مجموع اتاق‌ها" icon={Users}/></div>
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

            <PlanOverviewCard subscription={sub} loading={subLoading}/>
        </div>
    </div>
}
