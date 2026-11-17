import {useState} from 'react'
import {Link} from 'react-router-dom'
import {
    ArrowLeft, Check, GraduationCap, MonitorPlay, PenTool, FileText, Hand, ClipboardCheck,
    CalendarClock, Users, MessageSquare, BarChart3, Smartphone, ShieldCheck, Gift, Sliders, UserPlus,
} from 'lucide-react'
import {StreamFlow} from '../../components/shared/StreamVisuals'
import FreePlanCards from '../../components/shared/FreePlanCards'

/* ---------- محتوا (فقط امکاناتی که در محصول واقعاً وجود دارد) ---------- */
const AUDIENCES = {
    webinar: {
        tab: 'وبینار و جلسه آنلاین',
        icon: MonitorPlay,
        title: 'وبینار و جلسه آنلاین',
        lead: 'برای ارائه، رویداد، جلسه تیمی و سمینار؛ شرکت‌کنندگان فقط با یک لینک وارد می‌شوند.',
        items: [
            [Users, 'چیدمان جلسه با نمایش شرکت‌کنندگان'],
            [MessageSquare, 'گفت‌وگوی متنی در جلسه'],
            [Hand, 'درخواست صحبت و صف سخنران'],
            [CalendarClock, 'زمان‌بندی جلسه با تقویم شمسی'],
        ],
    },
    class: {
        tab: 'کلاس آموزشی',
        icon: GraduationCap,
        title: 'کلاس آموزشی آنلاین',
        lead: 'چیدمان مخصوص کلاس با فضای محتوا؛ معلم تدریس می‌کند و حضور دانش‌آموزان خودکار ثبت می‌شود.',
        items: [
            [PenTool, 'تخته تعاملی هم‌زمان برای نوشتن و ترسیم'],
            [FileText, 'نمایش عکس، PDF، Word و PowerPoint در کلاس'],
            [ClipboardCheck, 'حضور و غیاب و گزارش برگزاری کلاس'],
            [Hand, 'اجازه صحبت و مدیریت صف سؤال‌ها'],
        ],
    },
}

const STEPS = [
    [UserPlus, 'ثبت‌نام با موبایل', 'فقط شماره موبایل و کد پیامکی؛ بدون رمز عبور.'],
    [Gift, 'پلن رایگان را فعال کنید', 'بدون پرداخت و با همه امکانات امتحان کنید.'],
    [Sliders, 'اتاق را بسازید', 'نوع رویداد، عنوان و زمان را انتخاب کنید.'],
    [Users, 'لینک را بفرستید', 'شرکت‌کنندگان از موبایل یا کامپیوتر وارد می‌شوند.'],
]

const FAQ = [
    ['اَوسترو میت چیست؟', 'اَوسترو میت یک پلتفرم پارسی برای برگزاری وبینار، جلسه آنلاین و کلاس آموزشی است. کلاس‌ها تخته تعاملی، نمایش فایل، حضور و غیاب و گزارش دارند.'],
    ['برای شروع باید پرداخت کنم؟', 'خیر. دو پلن رایگان آزمایشی وجود دارد و فقط با شماره موبایل فعال می‌شود. هر حساب یک‌بار می‌تواند از پلن رایگان استفاده کند.'],
    ['تفاوت وبینار و کلاس آنلاین چیست؟', 'وبینار و جلسه برای ارائه و گفت‌وگوی گروهی است. کلاس آموزشی چیدمان آموزشی دارد و ابزارهای تدریس مثل تخته تعاملی، نمایش فایل و حضور و غیاب را اضافه می‌کند.'],
    ['شرکت‌کنندگان باید برنامه نصب کنند؟', 'نه. ورود از طریق لینک اتاق و داخل مرورگر موبایل یا کامپیوتر انجام می‌شود.'],
    ['چطور پلن مناسب خودم را بسازم؟', 'در صفحه ساخت پلن، تعداد کاربران و تصاویر هم‌زمان و مدت اشتراک را انتخاب می‌کنید و قیمت همان لحظه نمایش داده می‌شود. مدارس دولتی تخفیف جداگانه دارند.'],
]

const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'
const btn = `meet-primary-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold ${ring}`
const btnSoft = `meet-soft-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold ${ring}`

const Dot = ({c = 'bg-white/20'}) => <span className={`h-1.5 w-1.5 rounded-full ${c}`}/>
const Bar = ({label}) => <div className="mb-2 flex items-center justify-between rounded-lg bg-white/[.05] px-3 py-1.5 text-[10px] text-white/70">
    <span className="flex items-center gap-1.5"><Dot c="bg-[#54d9b0]"/>{label}</span><span className="flex gap-1"><Dot/><Dot/><Dot/></span></div>
const Tools = () => <div className="mt-2 flex justify-center gap-1.5">{[0, 1, 2, 3].map(i => <span key={i} className="h-5 w-5 rounded-md bg-white/[.07]"/>)}<span className="h-5 w-7 rounded-md bg-[#ef6678]"/></div>
const Tile = ({n, hand, big}) => <div className={`relative flex items-center justify-center rounded-lg bg-white/[.05] ${big ? 'h-full min-h-[120px]' : 'h-10'}`}>
    <span className={`flex items-center justify-center rounded-full bg-[#31584f] text-white ${big ? 'h-14 w-14 text-xl' : 'h-6 w-6 text-[10px]'}`}>{n}</span>
    {hand && <Hand size={11} className="absolute left-1.5 top-1.5 text-[#f5b84b]"/>}</div>

function ClassFrame() {
    return <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-2.5">
        <Bar label="کلاس زبان انگلیسی"/>
        <div className="grid grid-cols-[1fr_30%] gap-2">
            <div className="relative min-h-[170px] rounded-xl bg-[#101a2a] p-3">
                <span className="absolute right-2.5 top-2.5 rounded-md bg-[#4f7cff]/20 px-2 py-0.5 text-[9px] text-[#9eb6ff]">تخته تعاملی</span>
                <svg viewBox="0 0 200 100" className="mt-5 w-full" fill="none" strokeLinecap="round" aria-hidden="true">
                    <path d="M10 70 C40 20 70 90 100 40 S160 20 190 60" stroke="#54d9b0" strokeWidth="3"/>
                    <path d="M20 90 H120" stroke="#6c93ff" strokeWidth="3"/><circle cx="150" cy="78" r="10" stroke="#f5b84b" strokeWidth="3"/></svg>
            </div>
            <div className="space-y-1.5"><Tile n="م"/><Tile n="ع" hand/><Tile n="پ"/></div>
        </div><Tools/></div>
}
function SeminarFrame() {
    return <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-2.5">
        <Bar label="وبینار معرفی محصول"/>
        <div className="grid grid-cols-[1fr_34%] gap-2">
            <div className="relative"><Tile n="س" big/><span className="absolute bottom-2 right-2 rounded-md bg-black/40 px-2 py-0.5 text-[9px] text-white/80">سخنران</span></div>
            <div className="grid grid-cols-2 gap-1.5"><Tile n="ر"/><Tile n="ن"/><Tile n="ک"/><Tile n="ف"/>
                <div className="col-span-2 flex items-center gap-1 rounded-lg bg-white/[.05] px-2 text-[9px] text-white/60"><MessageSquare size={10}/>سؤال‌ها در چت</div></div>
        </div><Tools/></div>
}

function AudienceTabs() {
    const [key, setKey] = useState('class')
    const a = AUDIENCES[key]
    return <div>
        <div role="tablist" aria-label="نوع رویداد" className="mx-auto mb-5 grid max-w-md grid-cols-2 gap-1 rounded-2xl bg-[#e8edf6] p-1">
            {Object.entries(AUDIENCES).map(([k, v]) => <button key={k} role="tab" id={`tab-${k}`} aria-selected={key === k}
                aria-controls="audience-panel" onClick={() => setKey(k)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition sm:text-sm ${ring} ${key === k ? 'bg-white text-[#101827] shadow-sm' : 'text-[#68758a]'}`}>
                <v.icon size={16} aria-hidden="true"/>{v.tab}</button>)}
        </div>
        <div role="tabpanel" id="audience-panel" aria-labelledby={`tab-${key}`} className="meet-dark-panel mx-auto grid max-w-5xl items-center gap-6 rounded-[28px] p-4 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <figure>
                <div role="img" aria-label={`نمونه‌ای از فضای ${a.title}`}>{key === 'class' ? <ClassFrame/> : <SeminarFrame/>}</div>
                <figcaption className="mt-2 text-center text-[11px] text-white/50">نمونه‌ی فضای {a.title}</figcaption>
            </figure>
            <div>
                <h3 className="text-lg font-extrabold sm:text-xl">{a.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{a.lead}</p>
                <ul className="mt-4 space-y-2.5">
                    {a.items.map(([Icon, text]) => <li key={text} className="flex items-center gap-3 border-r-2 border-[#54d9b0]/60 pr-3 text-sm leading-6 text-white/85">
                        <Icon size={16} className="shrink-0 text-[#7be7c7]" aria-hidden="true"/>{text}</li>)}
                </ul>
            </div>
        </div>
    </div>
}

export default function LandingPage() {
    const faqLd = {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}})),
    }
    return <div className="min-h-screen bg-[#f4f7fb] text-[#101827]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqLd)}}/>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">پرش به محتوای اصلی</a>

        <header className="sticky top-0 z-50 border-b border-[#e5eaf2]/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${ring}`}>
                    <img src="/avestro-logo.png" alt="" width="40" height="40" className="h-9 w-9"/>
                    <span className="text-sm font-bold">اَوسترو میت</span></Link>
                <nav aria-label="ناوبری اصلی" className="hidden items-center gap-7 text-sm text-[#68758a] md:flex">
                    <a href="#options" className="hover:text-[#101827]">امکانات</a>
                    <a href="#how" className="hover:text-[#101827]">نحوه شروع</a>
                    <a href="#free" className="hover:text-[#101827]">پلن رایگان</a>
                    <Link to="/pricing" className="hover:text-[#101827]">ساخت پلن</Link>
                    <a href="#faq" className="hover:text-[#101827]">سؤالات</a>
                </nav>
                <div className="flex items-center gap-2">
                    <Link to="/login" className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-[#34415a] ${ring}`}>ورود</Link>
                    <Link to="/register" className={`${btn} !min-h-11 !px-4`}>شروع رایگان</Link>
                </div>
            </div>
        </header>

        <main id="main">
            {/* Hero */}
            <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:pt-16">
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
                <div className="text-center lg:text-right">
                    <p className="meet-kicker mb-5 inline-flex rounded-full px-3 py-1.5 text-xs">وبینار، جلسه و کلاس آنلاین به زبان پارسی</p>
                    <h1 className="text-[1.75rem] font-extrabold leading-[1.6] tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.55]">
                        ارتباطی حرفه‌ای
                        <br/>
                        <span className="meet-gradient-text">با مدرن‌ترین تکنولوژی‌های جهانی</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-base font-medium text-[#34415a] sm:mt-6 sm:text-xl">اَوسترو همراه امن و ماندگار شما</p>
                    <p className="mt-3 max-w-xl text-sm leading-8 text-[#68758a] sm:text-base">
                        وبینار، جلسه آنلاین و کلاس آموزشی با تخته تعاملی، نمایش فایل و حضور و غیاب؛ بدون نصب برنامه، فقط با لینک.
                    </p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                        <Link to="/register" className={btn}><Gift size={18} aria-hidden="true"/>شروع رایگان با شماره موبایل</Link>
                        <a href="#options" className={btnSoft}>امکانات را ببینید</a>
                    </div>
                    <ul className="mt-6 flex flex-wrap justify-center gap-x-5 lg:justify-start gap-y-2 text-xs text-[#68758a]">
                        {['بدون پرداخت برای شروع', 'بدون رمز عبور', 'مناسب موبایل'].map(t => <li key={t} className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#2eaf89]" aria-hidden="true"/>{t}</li>)}
                    </ul>
                    </div>
                <div className="meet-dark-panel rounded-[28px] p-3 sm:p-5">
                    <StreamFlow className="h-auto w-full"/>
                </div>
                </div>
            </section>

            {/* Options at a glance */}
            <section id="options" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-20">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <h2 className="text-2xl font-extrabold sm:text-4xl">چه رویدادی برگزار می‌کنید؟</h2>
                    <p className="mt-3 text-sm leading-7 text-[#68758a]">نوع رویداد را انتخاب کنید و فضای واقعی آن را ببینید.</p>
                </div>
                <AudienceTabs/>
                <ul className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
                    {[[Users, 'مدیریت کاربران', 'معلم‌ها و دانش‌آموزان را با فایل Excel وارد کنید.'], [BarChart3, 'گزارش کلاس', 'گزارش برگزاری و حضور هر کلاس.'], [Smartphone, 'مناسب موبایل', 'ورود و استفاده راحت از گوشی.']].map(([I, t, d]) =>
                        <li key={t} className="meet-card p-4"><I size={18} className="mb-2 text-[#4f7cff]" aria-hidden="true"/><h3 className="text-sm font-bold">{t}</h3><p className="mt-1 text-xs leading-6 text-[#68758a]">{d}</p></li>)}
                </ul>
            </section>

            {/* How it works */}
            <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-20">
                <h2 className="mb-8 text-center text-2xl font-extrabold sm:text-4xl">از ثبت‌نام تا اولین رویداد در چهار قدم</h2>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(([I, t, d], i) => <li key={t} className="meet-card flex gap-4 p-5 lg:block">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff] lg:mb-4"><I size={20} aria-hidden="true"/></span>
                        <div><p className="text-xs font-bold text-[#4f7cff]">قدم {(i + 1).toLocaleString('fa-IR')}</p>
                            <h3 className="mt-1 text-[15px] font-extrabold">{t}</h3><p className="mt-1.5 text-sm leading-7 text-[#68758a]">{d}</p></div></li>)}
                </ol>
            </section>

            {/* Free plans */}
            <section id="free" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"><FreePlanCards/></section>

            {/* Custom plan */}
            <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 sm:pb-20">
                <div className="meet-dark-panel flex flex-col items-start gap-5 rounded-[24px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
                    <div><h2 className="text-xl font-extrabold sm:text-2xl">پلن اختصاصی خودتان را بسازید</h2>
                        <p className="mt-2 max-w-xl text-sm leading-7 text-white/60">تعداد کاربران و تصاویر هم‌زمان و مدت اشتراک را انتخاب کنید و قیمت را همان لحظه ببینید.</p></div>
                    <Link to="/pricing" className={`${btn} w-full shrink-0 sm:w-auto`}>ساخت پلن اختصاصی<ArrowLeft size={18} aria-hidden="true"/></Link>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
                <h2 className="mb-6 text-center text-2xl font-extrabold sm:text-3xl">سؤالات پرتکرار</h2>
                <div className="space-y-2.5">
                    {FAQ.map(([q, a]) => <details key={q} className="meet-card group p-4 sm:p-5">
                        <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-bold ${ring}`}>{q}
                            <span aria-hidden="true" className="text-lg text-[#4f7cff] transition group-open:rotate-45">+</span></summary>
                        <p className="mt-2 text-sm leading-8 text-[#68758a]">{a}</p></details>)}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6">
                <h2 className="text-2xl font-extrabold sm:text-3xl">آماده‌اید اولین رویدادتان را بسازید؟</h2>
                <Link to="/register" className={`${btn} mt-6`}><ShieldCheck size={18} aria-hidden="true"/>شروع رایگان</Link>
            </section>
        </main>

        <footer className="bg-[#0b1220] text-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
                <div><p className="font-bold">اَوسترو میت</p><p className="mt-3 text-sm leading-7 text-white/60">پلتفرم پارسی وبینار، جلسه آنلاین و کلاس آموزشی.</p></div>
                <nav aria-label="پیوندهای محصول" className="space-y-1 text-sm text-white/65"><a className="block py-2" href="#options">امکانات</a><Link className="block py-2" to="/pricing">ساخت پلن</Link><a className="block py-2" href="#faq">سؤالات پرتکرار</a></nav>
                <nav aria-label="حساب" className="space-y-1 text-sm text-white/65"><Link className="block py-2" to="/login">ورود</Link><Link className="block py-2" to="/register">ثبت‌نام</Link></nav>
            </div>
            <p className="border-t border-white/[.08] px-4 py-5 text-center text-xs text-white/45">© ۱۴۰۵ اَوسترو میت. تمام حقوق محفوظ است.</p>
        </footer>
    </div>
}