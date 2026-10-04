import { Link } from 'react-router-dom'
import {
  Video, Shield, Globe, Users, Calendar, Smartphone,
  ArrowLeft, Check, Play, Sparkles, Zap, LockKeyhole,
} from 'lucide-react'

const features = [
  { icon: Video, title: 'جلسه‌ای که ساده شروع می‌شود', desc: 'ورود سریع، کنترل‌های واضح و تجربه‌ای که برای جلسه ساخته شده؛ نه برای شلوغ‌کردن صفحه.', tone: 'blue' },
  { icon: Shield, title: 'حریم خصوصی و امنیت', desc: 'زیرساخت امن و کنترل‌های جلسه برای اینکه مدیریت دسترسی و گفتگو دست شما باشد.', tone: 'mint' },
  { icon: Globe, title: 'کاملاً فارسی و RTL', desc: 'رابط فارسی، تاریخ و اعداد شمسی و جزئیاتی که با کاربران فارسی‌زبان هماهنگ است.', tone: 'blue' },
  { icon: Users, title: 'مدیریت شرکت‌کنندگان', desc: 'شرکت‌کنندگان، نقش‌ها و دسترسی‌ها را بدون رفت‌وآمد بین چند صفحه مدیریت کنید.', tone: 'mint' },
  { icon: Calendar, title: 'برنامه‌ریزی جلسات', desc: 'جلسات آینده را منظم کنید و اطلاعات مهم را از همان داشبورد ببینید.', tone: 'blue' },
  { icon: Smartphone, title: 'تجربه یکپارچه موبایل', desc: 'همان زبان بصری روی دسکتاپ و موبایل، با چیدمان متناسب با اندازه صفحه.', tone: 'mint' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#e5eaf2]/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[64px] sm:h-[72px] flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/avestro-logo.png" alt="اَوسترو" className="w-10 h-10" />
            <div>
              <p className="font-bold text-sm text-[#101827]">اَوسترو میت</p>
              <p className="text-[10px] text-[#8d98aa] tracking-wide">AVESTRO MEET</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-[#68758a]">
            <a href="#features" className="hover:text-[#101827] transition-colors">قابلیت‌ها</a>
            <a href="#security" className="hover:text-[#101827] transition-colors">امنیت</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block px-4 py-2.5 text-sm text-[#68758a] hover:text-[#101827]">
              ورود
            </Link>
            <Link to="/register" className="meet-primary-btn rounded-xl px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap">
              شروع رایگان <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-24 pb-10 sm:pb-14">
            <div className="grid lg:grid-cols-[.86fr_1.14fr] gap-8 sm:gap-12 lg:gap-16 items-center">
              <div className="text-right">
                <div className="meet-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#54d9b0] shadow-[0_0_0_4px_rgba(84,217,176,.12)]" />
                  جلسات آنلاین، با تجربه‌ای حرفه‌ای
                </div>

                <h1 className="text-[2.15rem] sm:text-5xl lg:text-[58px] leading-[1.2] font-bold tracking-tight text-[#101827]">
                  جلسه حرفه‌ای،
                  <br />
                  <span className="meet-gradient-text">بدون پیچیدگی</span>
                </h1>

                <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-7 sm:leading-8 text-[#68758a] max-w-xl">
                  اَوسترو میت برای برگزاری جلسه، وبینار و کلاس آنلاین ساخته شده؛
                  ساده برای شروع، قدرتمند برای مدیریت.
                </p>

                <div className="mt-6 sm:mt-8 grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
                  <Link to="/register" className="meet-primary-btn inline-flex justify-center items-center gap-2 rounded-xl px-5 py-3.5 text-sm sm:text-base font-medium">
                    جلسه جدید بسازید <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <a href="#product-preview" className="meet-soft-btn inline-flex justify-center items-center gap-2 rounded-xl px-5 py-3.5 text-sm sm:text-base font-medium">
                    <Play className="w-4 h-4 text-[#4f7cff]" />
                    مشاهده محصول
                  </a>
                </div>

                <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-x-6 text-[11px] sm:text-xs text-[#8d98aa]">
                  <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4 text-[#4f7cff]" /> ورود سریع</span>
                  <span className="inline-flex items-center gap-2"><LockKeyhole className="w-4 h-4 text-[#54d9b0]" /> امنیت و حریم خصوصی</span>
                  <span className="inline-flex items-center gap-2"><Smartphone className="w-4 h-4 text-[#4f7cff]" /> موبایل و دسکتاپ</span>
                </div>
              </div>

              {/* Product preview — deliberately echoes the room's dark visual language */}
              <div id="product-preview" className="relative">
                <div className="meet-dark-panel rounded-[24px] sm:rounded-[28px] p-2.5 sm:p-4 shadow-[0_25px_70px_rgba(13,22,38,.18)]">
                  <div className="flex items-center justify-between px-3 py-2.5 mb-3 rounded-2xl bg-white/[.045] border border-white/[.07]">
                    <div className="flex items-center gap-2">
                      <img src="/avestro-logo.png" className="w-7 h-7" alt="" />
                      <span className="text-xs text-white/85">سمینار تستی</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#54d9b0]" /> متصل
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 min-h-[360px] sm:min-h-[340px]">
                    <div className="sm:col-span-8 rounded-2xl border border-white/[.07] bg-[#0b1220]/80 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(79,124,255,.16),transparent_35%)]" />
                      <div className="relative text-center">
                        <div className="w-20 h-20 rounded-full bg-[#31584f] border border-[#54d9b0]/30 flex items-center justify-center mx-auto shadow-xl">
                          <span className="text-3xl font-medium text-white">ع</span>
                        </div>
                        <p className="mt-3 text-sm text-white">عباس</p>
                        <p className="text-[10px] text-white/40 mt-1">میزبان</p>
                      </div>
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <span className="w-8 h-8 rounded-xl bg-white/[.05] border border-white/[.07] flex items-center justify-center text-[#54d9b0]"><Video className="w-4 h-4" /></span>
                        <span className="w-8 h-8 rounded-xl bg-white/[.05] border border-white/[.07] flex items-center justify-center text-[#54d9b0]"><Users className="w-4 h-4" /></span>
                      </div>
                    </div>

                    <div className="sm:col-span-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-3 max-h-[145px] sm:max-h-none overflow-hidden">
                      <div className="flex items-center justify-between border-b border-white/[.07] pb-2.5">
                        <span className="text-xs text-white/85">شرکت‌کنندگان</span>
                        <Users className="w-4 h-4 text-[#6c93ff]" />
                      </div>
                      {[['ع','عباس'],['س','سارا'],['م','مهدی']].map(([avatar, name], i) => (
                        <div key={name} className="flex items-center gap-2 py-2.5 sm:py-3 border-b border-white/[.05]">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${i === 0 ? 'bg-[#31584f] text-white' : 'bg-white/10 text-white/70'}`}>{avatar}</span>
                          <span className="text-[10px] text-white/65">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5 sm:mt-3 h-12 sm:h-14 rounded-2xl bg-white/[.045] border border-white/[.07] flex items-center justify-center gap-2">
                    {['…','⌗','▢','◉'].map((x, i) => (
                      <span key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${i === 3 ? 'bg-[#54d9b0] text-[#07130f]' : 'bg-white/[.06] text-white/65'}`}>{x}</span>
                    ))}
                    <span className="w-11 h-9 rounded-xl bg-[#ef6678] text-white flex items-center justify-center text-sm">⌕</span>
                  </div>
                </div>

                <div className="hidden sm:flex absolute -bottom-6 -left-7 meet-glass rounded-2xl px-4 py-3 items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#e8faf4] text-[#32aa87] flex items-center justify-center"><Shield className="w-4 h-4" /></div>
                  <div><p className="text-xs font-bold text-[#101827]">محیط امن جلسه</p><p className="text-[10px] text-[#8d98aa] mt-0.5">کنترل دسترسی و حریم خصوصی</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>
{/* Features */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl mb-8 sm:mb-12">
            <div className="meet-kicker inline-flex rounded-full px-3 py-1.5 text-xs mb-4">برای تجربه بهتر جلسه</div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">همه‌چیز سر جای خودش</h2>
            <p className="text-[#68758a] mt-3 sm:mt-4 text-sm sm:text-base leading-7">
              زبان بصری اَوسترو از اتاق جلسه می‌آید: سطوح عمیق و حرفه‌ای برای تمرکز،
              با سطوح روشن برای مدیریت روزمره و تصمیم‌گیری سریع.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map(({ icon: Icon, title, desc, tone }) => (
              <div key={title} className="meet-card meet-card-hover p-5 sm:p-6">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${tone === 'mint' ? 'bg-[#e8faf4] text-[#2eaf89]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px]">{title}</h3>
                <p className="text-sm text-[#68758a] leading-7 mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security / product philosophy */}
        <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className="meet-dark-panel rounded-[24px] sm:rounded-[30px] p-5 sm:p-12 overflow-hidden relative">
            <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-[#4f7cff]/10 blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-7 sm:gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-xs text-[#54d9b0]"><Sparkles className="w-4 h-4" /> طراحی شده برای تمرکز</div>
                <h2 className="text-2xl sm:text-4xl font-bold mt-4 leading-tight">رنگ‌های اتاق جلسه،<br />در کل محصول زنده می‌شوند.</h2>
                <p className="text-white/55 leading-8 mt-5 max-w-xl">
                  داشبورد و لندینگ روشن هستند، اما هویت اصلی اَوسترو از همان navy، blue و mint اتاق جلسه گرفته شده است.
                  نتیجه یک محصول یکپارچه است، نه سه صفحه با سه شخصیت جدا.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-5"><p className="text-2xl font-bold">۱</p><p className="text-xs text-white/45 mt-2">زبان بصری</p></div>
                <div className="rounded-2xl bg-[#4f7cff]/10 border border-[#6c93ff]/15 p-5"><p className="text-2xl font-bold text-[#9eb6ff]">۲</p><p className="text-xs text-white/45 mt-2">سطح روشن و تاریک</p></div>
                <div className="rounded-2xl bg-[#54d9b0]/10 border border-[#54d9b0]/15 p-5"><p className="text-2xl font-bold text-[#7be7c7]">۳</p><p className="text-xs text-white/45 mt-2">رنگ برای معنا</p></div>
                <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-5"><p className="text-2xl font-bold">∞</p><p className="text-xs text-white/45 mt-2">قابل توسعه</p></div>
              </div>
            </div>
          </div>
        </section>
{/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="meet-kicker inline-flex rounded-full px-3 py-1.5 text-xs mb-5">آماده شروع هستید؟</div>
          <h2 className="text-2xl sm:text-4xl font-bold">اولین جلسه‌تان را بسازید.</h2>
          <p className="text-[#68758a] mt-4 mb-8">سریع وارد شوید، جلسه را بسازید و لینک را برای شرکت‌کنندگان بفرستید.</p>
          <Link to="/register" className="meet-primary-btn inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-medium">شروع رایگان <ArrowLeft className="w-5 h-5" /></Link>
        </section>
      </main>

      <footer className="bg-[#0b1220] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <img src="/avestro-logo.png" alt="" className="w-10 h-10" />
                <div><p className="font-bold">اَوسترو میت</p><p className="text-[10px] text-white/35 mt-1">AVESTRO MEET</p></div>
              </div>
              <p className="text-sm text-white/45 leading-7 max-w-md mt-5">پلتفرم حرفه‌ای برگزاری جلسات، وبینار و کلاس آنلاین با تجربه‌ای فارسی و مدرن.</p>
            </div>
            <div><p className="text-sm font-medium text-white/80 mb-4">محصول</p><div className="space-y-3 text-xs text-white/45"><a href="#features" className="block hover:text-white">قابلیت‌ها</a><a href="#security" className="block hover:text-white">امنیت</a></div></div>
            <div><p className="text-sm font-medium text-white/80 mb-4">حساب</p><div className="space-y-3 text-xs text-white/45"><Link to="/login" className="block hover:text-white">ورود</Link><Link to="/register" className="block hover:text-white">ثبت‌نام</Link></div></div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/[.08] flex flex-wrap justify-between gap-3 text-xs text-white/30">
            <span>© ۱۴۰۵ اَوسترو میت. تمام حقوق محفوظ است.</span>
            <span>ساخته شده برای تجربه‌ای ساده‌تر از جلسه آنلاین</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
