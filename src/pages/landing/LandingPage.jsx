import {useState} from 'react'
import {Link} from 'react-router-dom'
import {
    ArrowLeft, Check, GraduationCap, MonitorPlay, PenTool, FileText, Hand, Mic, Video, ClipboardCheck,
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
    [UserPlus, 'ثبت‌نام با موبایل', 'فقط شماره موبایل و کد پیامکی؛ بدون ساخت حساب جداگانه.'],
    [Gift, 'پلن رایگان را فعال کنید', 'بدون پرداخت و با همه امکانات امتحان کنید.'],
    [Sliders, 'اتاق را بسازید', 'نوع رویداد، عنوان و زمان را انتخاب کنید.'],
    [Users, 'لینک را بفرستید', 'شرکت‌کنندگان از موبایل یا کامپیوتر وارد می‌شوند.'],
]

const FAQ = [
    ['اَوسترو میت چیست؟', 'اَوسترو میت یک پلتفرم پارسی برای برگزاری وبینار، جلسه آنلاین و کلاس آموزشی است. کلاس‌ها تخته تعاملی، نمایش فایل، حضور و غیاب و گزارش دارند.'],
    ['برای شروع باید پرداخت کنم؟', 'خیر. پلن‌های رایگان آزمایشی وجود دارد (بر اساس تعداد روز یا ساعت استفاده؛ مشخصات هر پلن روی کارتش نوشته شده) و فقط با شماره موبایل فعال می‌شود. هر حساب یک‌بار می‌تواند از پلن رایگان استفاده کند.'],
    ['تفاوت وبینار و کلاس آنلاین چیست؟', 'وبینار و جلسه برای ارائه و گفت‌وگوی گروهی است. کلاس آموزشی چیدمان آموزشی دارد و ابزارهای تدریس مثل تخته تعاملی، نمایش فایل و حضور و غیاب را اضافه می‌کند.'],
    ['شرکت‌کنندگان باید برنامه نصب کنند؟', 'نه. ورود از طریق لینک اتاق و داخل مرورگر موبایل یا کامپیوتر انجام می‌شود.'],
    ['چطور پلن مناسب خودم را بسازم؟', 'در صفحه ساخت پلن، تعداد کاربران و تصاویر هم‌زمان و مدت اشتراک را انتخاب می‌کنید و قیمت همان لحظه نمایش داده می‌شود. مدارس دولتی تخفیف جداگانه دارند.'],
]

const LP_CSS = `
.lp-hero>*{animation:lp-up .7s cubic-bezier(.22,1,.36,1) both}
.lp-hero>*:nth-child(2){animation-delay:.08s}.lp-hero>*:nth-child(3){animation-delay:.16s}
.lp-hero>*:nth-child(4){animation-delay:.24s}.lp-hero>*:nth-child(5){animation-delay:.32s}.lp-hero>*:nth-child(6){animation-delay:.4s}
.lp-pop{animation:lp-up .9s .25s cubic-bezier(.22,1,.36,1) both}
.lp-swap{animation:lp-fade .45s ease both}
.lp-eq i{display:block;width:2px;border-radius:1px;background:#54d9b0;transform-origin:bottom;animation:lp-eq 1s ease-in-out infinite}
.lp-eq i:nth-child(2){animation-delay:.2s}.lp-eq i:nth-child(3){animation-delay:.4s}
.lp-wave{transform-origin:70% 90%;animation:lp-wave 2.4s ease-in-out infinite}
details[open]>p{animation:lp-fade .35s ease both}
@keyframes lp-up{from{opacity:0;transform:translateY(14px)}}
@keyframes lp-fade{from{opacity:0;transform:translateY(4px)}}
@keyframes lp-eq{50%{transform:scaleY(.35)}}
@keyframes lp-wave{0%,60%,100%{transform:rotate(0)}70%{transform:rotate(16deg)}80%{transform:rotate(-8deg)}90%{transform:rotate(10deg)}}
@media (prefers-reduced-motion:reduce){.lp-hero>*,.lp-pop,.lp-swap,.lp-eq i,.lp-wave,details[open]>p{animation:none}}
`
const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'
const btn = `meet-primary-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold ${ring}`
const btnSoft = `meet-soft-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold ${ring}`

const fa = (n) => n.toLocaleString('fa-IR')
const Eq = () => <span className="lp-eq flex h-3 items-end gap-[2px]" aria-hidden="true"><i className="h-3"/><i className="h-2"/><i className="h-3"/></span>

function Tile({n, name, badge, speaking}) {
    return <div className={`flex flex-col overflow-hidden rounded-lg border ${speaking ? 'border-[#54d9b0]/50' : 'border-white/[.06]'} bg-[#03070f]`}>
        <div className="flex flex-1 items-center justify-center py-5 sm:py-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#182235] text-base font-bold text-white sm:h-14 sm:w-14 sm:text-xl">{n}</span></div>
        <div className="flex items-center justify-between gap-1 bg-[#101a2a] px-2 py-1.5 text-[10px]">
            <span className="flex items-center gap-1.5"><Mic size={10} className="text-[#7be7c7]"/>{speaking && <Eq/>}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-white/85">{badge && <span className="rounded bg-[#4f7cff]/20 px-1.5 text-[#9eb6ff]">{badge}</span>}<span className="truncate">{name}</span></span></div>
    </div>
}
const Row = ({n, name, note, hand}) => <div className="flex items-center gap-2 rounded-lg bg-white/[.04] px-2 py-1.5">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#182235] text-[10px] text-white">{n}</span>
    <span className="min-w-0 flex-1 truncate text-[10px] text-white/85">{name}{note && <span className="block text-[9px] text-[#54d9b0]">{note}</span>}</span>
    {hand && <Hand size={12} className="lp-wave text-[#f5b84b]"/>}</div>
const Btn = ({c = 'bg-white/[.07]', children}) => <span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1 ${c}`}>{children}</span>

function Room({title, stage, rows, extra, attendance}) {
    return <div dir="rtl" className="overflow-hidden rounded-2xl border border-white/10 bg-[#080f1b] text-white/70">
        <div className="flex items-center justify-between border-b border-white/[.06] px-3 py-2 text-[10px]">
            <span className="flex items-center gap-2"><img src="/avestro-logo.png" alt="" className="h-5 w-5 rounded"/><b className="text-white/90">{title}</b></span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-2 py-0.5"><span className="h-1.5 w-1.5 rounded-full bg-[#54d9b0]"/>متصل</span></div>
        <div className="grid grid-cols-[36%_1fr] gap-2 p-2">
            <div className="space-y-1.5 rounded-xl border border-white/[.06] bg-[#0c1422] p-2">
                <div className="flex gap-1 text-[9px]"><span className="rounded-md bg-[#4f7cff]/20 px-2 py-1 text-[#9eb6ff]">شرکت‌کنندگان</span><span className="px-2 py-1">گفتگو</span></div>
                {extra}{rows}</div>
            <div className="relative flex min-h-[210px] flex-col rounded-xl border border-white/[.06] bg-[#0b1220] p-2 sm:min-h-[260px]">{stage}
                <div className="mt-auto flex justify-center gap-1.5 pt-3">
                    <Btn c="bg-[#ef6678]/90">✕</Btn><Btn><Mic size={11}/></Btn><Btn><Video size={11}/></Btn>
                    {attendance && <Btn c="bg-[#4f7cff] text-[9px] text-white">حضور و غیاب</Btn>}<Btn><Users size={11}/></Btn><Btn><MessageSquare size={11}/></Btn></div>
            </div></div></div>
}

function ClassFrame() {
    return <Room title="کلاس آموزشی" attendance
        extra={<p className="flex items-center gap-1 px-1 pt-1 text-[9px] text-[#f5b84b]"><Hand size={10}/>دست‌بلندکرده‌ها</p>}
        rows={<><Row n="م" name="مدرس (شما)"/><Row n="ع" name="دانش‌آموز" hand/></>}
        stage={<><span className="mb-2 inline-flex w-fit items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/[.05] px-2.5 py-1 text-[10px] text-white/85"><PenTool size={11}/>تخته تعاملی</span>
            <div className="grid grid-cols-2 gap-2"><Tile n="م" name="مدرس" badge="مدرس" speaking/><Tile n="ع" name="دانش‌آموز"/></div></>}/>
}
function SeminarFrame() {
    return <Room title="وبینار معرفی محصول"
        rows={<><Row n="س" name="سخنران (شما)"/><Row n="ش" name="شرکت‌کننده" note="در حال صحبت"/></>}
        stage={<><p className="mb-2 flex items-center gap-1.5 text-[9px] text-white/50"><span className="h-1.5 w-1.5 rounded-full bg-[#54d9b0]"/>۲ نفر با میکروفون روشن</p>
            <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3"><Tile n="س" name="سخنران" speaking/><Tile n="ش" name="شرکت‌کننده"/>
                <div className="hidden min-h-[120px] items-center justify-center rounded-lg border border-dashed border-white/15 text-[9px] text-white/35 sm:flex">جای خالی</div></div></>}/>
}

function AudienceTabs() {
    const [key, setKey] = useState('webinar')
    const a = AUDIENCES[key]
    return <div>
        <div role="tablist" aria-label="نوع رویداد" className="mx-auto mb-5 grid max-w-md grid-cols-2 gap-1 rounded-2xl bg-[#e8edf6] p-1">
            {Object.entries(AUDIENCES).map(([k, v]) => <button key={k} role="tab" id={`tab-${k}`} aria-selected={key === k}
                aria-controls="audience-panel" onClick={() => setKey(k)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition sm:text-base ${ring} ${key === k ? 'bg-white text-[#101827] shadow-sm' : 'text-[#68758a]'}`}>
                <v.icon size={16} aria-hidden="true"/>{v.tab}</button>)}
        </div>
        <div role="tabpanel" id="audience-panel" aria-labelledby={`tab-${key}`} className="meet-dark-panel mx-auto grid max-w-5xl items-center gap-6 rounded-[28px] p-4 sm:p-8 lg:grid-cols-[1.45fr_1fr] lg:gap-10">
            <figure key={key} className="lp-swap">
                <div role="img" aria-label={`نمونه‌ای از فضای ${a.title}`}>{key === 'class' ? <ClassFrame/> : <SeminarFrame/>}</div>
                <figcaption className="mt-2 text-center text-xs text-white/50">نمونه‌ی فضای {a.title}</figcaption>
            </figure>
            <div>
                <h3 className="text-xl font-extrabold sm:text-2xl">{a.title}</h3>
                <p className="mt-2 text-base leading-7 text-white/65">{a.lead}</p>
                <ul className="mt-4 space-y-2.5">
                    {a.items.map(([Icon, text]) => <li key={text} className="flex items-center gap-3 border-r-2 border-[#54d9b0]/60 pr-3 text-base leading-6 text-white/85">
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
        <style>{LP_CSS}</style>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqLd)}}/>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">پرش به محتوای اصلی</a>

        <header className="sticky top-0 z-50 border-b border-[#e5eaf2]/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${ring}`}>
                    <img src="/avestro-logo.png" alt="" width="40" height="40" className="h-9 w-9"/>
                    <span className="text-base font-bold">اَوسترو میت</span></Link>
                <nav aria-label="ناوبری اصلی" className="hidden items-center gap-7 text-base text-[#68758a] md:flex">
                    <a href="#options" className="hover:text-[#101827]">امکانات</a>
                    <a href="#how" className="hover:text-[#101827]">نحوه شروع</a>
                    <a href="#free" className="hover:text-[#101827]">پلن رایگان</a>
                    <Link to="/pricing" className="hover:text-[#101827]">ساخت پلن</Link>
                    <a href="#faq" className="hover:text-[#101827]">سؤالات</a>
                </nav>
                <div className="flex items-center gap-2">
                    <Link to="/login" className={`inline-flex min-h-11 items-center rounded-xl px-3 text-base text-[#34415a] ${ring}`}>ورود</Link>
                    <Link to="/register" className={`${btn} !min-h-11 !px-4`}>شروع رایگان</Link>
                </div>
            </div>
        </header>

        <main id="main">
            {/* Hero */}
            <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:pt-16">
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
                <div className="lp-hero text-center lg:text-right">
                    <p className="meet-kicker mb-5 inline-flex rounded-full px-3 py-1.5 text-sm">وبینار، جلسه و کلاس آنلاین به زبان پارسی</p>
                    <h1 className="text-[2.1rem] font-extrabold leading-[1.6] tracking-tight sm:text-5xl lg:text-[2.7rem] lg:leading-[1.6] text-balance">
                        ارتباطی حرفه‌ای
                        <br/>
                        <span className="meet-gradient-text">با مدرن‌ترین تکنولوژی‌های جهانی</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg font-medium text-[#34415a] sm:mt-6 sm:text-2xl">اَوسترو همراه امن و ماندگار شما</p>
                    <p className="mt-3 max-w-xl text-base leading-8 text-[#68758a] sm:text-lg">
                        وبینار، جلسه آنلاین و کلاس آموزشی با تخته تعاملی، نمایش فایل و حضور و غیاب؛ بدون نصب برنامه، فقط با لینک.
                    </p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                        <Link to="/register" className={btn}><Gift size={18} aria-hidden="true"/>شروع رایگان با شماره موبایل</Link>
                        <a href="#options" className={btnSoft}>امکانات را ببینید</a>
                    </div>
                    <ul className="mt-6 flex flex-wrap justify-center gap-x-5 lg:justify-start gap-y-2 text-sm text-[#68758a]">
                        {['بدون پرداخت برای شروع', 'بدون نصب برنامه', 'مناسب موبایل'].map(t => <li key={t} className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#2eaf89]" aria-hidden="true"/>{t}</li>)}
                    </ul>
                    </div>
                <div className="lp-pop meet-dark-panel rounded-[28px] p-3 sm:p-5">
                    <StreamFlow className="h-auto w-full"/>
                </div>
                </div>
            </section>

            {/* Options at a glance */}
            <section id="options" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <h2 className="text-3xl font-extrabold sm:text-5xl">چه رویدادی برگزار می‌کنید؟</h2>
                    <p className="mt-3 text-base leading-7 text-[#68758a]">نوع رویداد را انتخاب کنید و فضای واقعی آن را ببینید.</p>
                </div>
                <AudienceTabs/>
                <ul className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
                    {[[Users, 'مدیریت کاربران', 'معلم‌ها و دانش‌آموزان را با فایل Excel وارد کنید.'], [BarChart3, 'گزارش کلاس', 'گزارش برگزاری و حضور هر کلاس.'], [Smartphone, 'مناسب موبایل', 'ورود و استفاده راحت از گوشی.']].map(([I, t, d]) =>
                        <li key={t} className="meet-card p-4"><I size={18} className="mb-2 text-[#4f7cff]" aria-hidden="true"/><h3 className="text-base font-bold">{t}</h3><p className="mt-1 text-sm leading-6 text-[#68758a]">{d}</p></li>)}
                </ul>
            </section>

            {/* How it works */}
            <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
                <h2 className="mb-8 text-center text-3xl font-extrabold sm:text-5xl">از ثبت‌نام تا اولین رویداد در چهار قدم</h2>
                <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(([I, t, d], i) => <li key={t} className="meet-card flex gap-4 p-5 lg:block">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff] lg:mb-4"><I size={20} aria-hidden="true"/></span>
                        <div><p className="text-sm font-bold text-[#4f7cff]">قدم {(i + 1).toLocaleString('fa-IR')}</p>
                            <h3 className="mt-1 text-[15px] font-extrabold">{t}</h3><p className="mt-1.5 text-base leading-7 text-[#68758a]">{d}</p></div></li>)}
                </ol>
            </section>

            {/* Free plans */}
            <section id="free" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20"><FreePlanCards/></section>

            {/* Custom plan */}
            <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 sm:pb-20">
                <div className="meet-dark-panel flex flex-col items-start gap-5 rounded-[24px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
                    <div><h2 className="text-2xl font-extrabold sm:text-3xl">پلن اختصاصی خودتان را بسازید</h2>
                        <p className="mt-2 max-w-xl text-base leading-7 text-white/60">تعداد کاربران و تصاویر هم‌زمان و مدت اشتراک را انتخاب کنید و قیمت را همان لحظه ببینید.</p></div>
                    <Link to="/pricing" className={`${btn} w-full shrink-0 sm:w-auto`}>ساخت پلن اختصاصی<ArrowLeft size={18} aria-hidden="true"/></Link>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
                <h2 className="mb-6 text-center text-3xl font-extrabold sm:text-4xl">سؤالات پرتکرار</h2>
                <div className="space-y-2.5">
                    {FAQ.map(([q, a]) => <details key={q} className="meet-card group p-4 sm:p-5">
                        <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-base font-bold ${ring}`}>{q}
                            <span aria-hidden="true" className="text-xl text-[#4f7cff] transition group-open:rotate-45">+</span></summary>
                        <p className="mt-2 text-base leading-8 text-[#68758a]">{a}</p></details>)}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6">
                <h2 className="text-3xl font-extrabold sm:text-4xl">آماده‌اید اولین رویدادتان را بسازید؟</h2>
                <Link to="/register" className={`${btn} mt-6`}><ShieldCheck size={18} aria-hidden="true"/>شروع رایگان</Link>
            </section>
        </main>

        <footer className="bg-[#0b1220] text-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
                <div><p className="font-bold">اَوسترو میت</p><p className="mt-3 text-base leading-7 text-white/60">پلتفرم پارسی وبینار، جلسه آنلاین و کلاس آموزشی.</p></div>
                <nav aria-label="پیوندهای محصول" className="space-y-1 text-base text-white/65"><a className="block py-2" href="#options">امکانات</a><Link className="block py-2" to="/pricing">ساخت پلن</Link><a className="block py-2" href="#faq">سؤالات پرتکرار</a></nav>
                <nav aria-label="حساب" className="space-y-1 text-base text-white/65"><Link className="block py-2" to="/login">ورود</Link><Link className="block py-2" to="/register">ثبت‌نام</Link></nav>
            </div>
            <p className="border-t border-white/[.08] px-4 py-5 text-center text-sm text-white/45">© ۱۴۰۵ اَوسترو میت. تمام حقوق محفوظ است.</p>
        </footer>
    </div>
}