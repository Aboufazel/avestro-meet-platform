import { Link } from 'react-router-dom'
import {
  Video,
  Shield,
  Globe,
  Users,
  Calendar,
  Smartphone,
  ChevronLeft,
  Play,
  Star,
  Check,
  // Twitter,
  // Linkedin as InstagramIcon,
  // Linkedin,
  ArrowLeft,
} from 'lucide-react'
// import { Button } from '../../components/ui/Button'

const stats = [
  { value: '+۱۰۰۰', label: 'کاربر فعال' },
  { value: '+۵۰۰۰', label: 'جلسه برگزارشده' },
  { value: '۹۸٪', label: 'رضایت کاربران' },
  { value: '۱۰۰+', label: 'نفر در هر جلسه' },
]

const features = [
  { icon: Video, title: 'کیفیت تصویر بالا', desc: 'ویدیوی HD با کمترین تأخیر و پایدارترین اتصال ممکن' },
  { icon: Shield, title: 'امنیت و رمزگذاری', desc: 'رمزگذاری سرتاسری و حریم خصوصی کامل جلسات شما' },
  { icon: Globe, title: 'رابط فارسی کامل', desc: 'تجربه کاربری کاملاً فارسی، از RTL تا اعداد شمسی' },
  { icon: Users, title: 'مدیریت شرکت‌کنندگان', desc: 'کنترل کامل روی دسترسی، نقش‌ها و اجازه‌ها' },
  { icon: Calendar, title: 'برنامه‌ریزی جلسات', desc: 'زمان‌بندی پیشرفته با یادآوری و تقویم شمسی' },
  { icon: Smartphone, title: 'پشتیبانی از موبایل', desc: 'تجربه یکپارچه روی تمام دستگاه‌ها و مرورگرها' },
]

const plans = [
  {
    name: 'رایگان',
    price: '۰',
    unit: 'تومان',
    features: ['۳۰ دقیقه هر جلسه', 'حداکثر ۱۰ نفر', 'کیفیت استاندارد', 'چت متنی'],
    cta: 'شروع رایگان',
    highlight: false,
  },
  {
    name: 'پایه',
    price: '۱۵۰,۰۰۰',
    unit: 'ت/ماه',
    features: ['۲ ساعت هر جلسه', 'حداکثر ۵۰ نفر', 'کیفیت HD', 'ضبط جلسه', 'پشتیبانی ایمیل'],
    cta: 'خرید پلن پایه',
    highlight: false,
  },
  {
    name: 'حرفه‌ای',
    price: '۳۵۰,۰۰۰',
    unit: 'ت/ماه',
    features: ['نامحدود', 'حداکثر ۱۰۰ نفر', 'کیفیت Full HD', 'ضبط ابری', 'پشتیبانی ۲۴/۷', 'گزارش‌گیری'],
    cta: 'خرید پلن حرفه‌ای',
    highlight: true,
  },
  {
    name: 'سازمانی',
    price: 'توافقی',
    unit: '',
    features: ['نامحدود', 'بیش از ۵۰۰ نفر', 'سرور اختصاصی', 'SSO', 'SLA', 'مشاور اختصاصی'],
    cta: 'تماس با ما',
    highlight: false,
  },
]

const testimonials = [
  {
    name: 'دکتر سارا محمدی',
    role: 'مدیر آموزش، دانشگاه تهران',
    text: 'اَوسترو میت بهترین انتخاب برای وبینارهای آموزشی ماست. رابط فارسی و کیفیت عالی ویدیو همه چیز رو عوض کرده.',
  },
  {
    name: 'علی رضایی',
    role: 'مدیر محصول، استارتاپ نوآور',
    text: 'تیم ما از روز اول عاشق این پلتفرم شد. سادگی استفاده و قابلیت اطمینان اون بی‌نظیره.',
  },
  {
    name: 'مریم احمدی',
    role: 'مدرس آنلاین',
    text: 'با اَوسترو میت می‌تونم کلاس‌هام رو با اطمینان کامل برگزار کنم. دانش‌آموزام هم خیلی راضی‌ان.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-olive-950 text-olive-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-olive-800/60 bg-olive-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-olive-500 flex items-center justify-center">
              <Video className="w-4 h-4 text-olive-950" />
            </div>
            <span className="text-olive-100 font-medium">اَوسترو میت</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {['قابلیت‌ها', 'قیمت‌گذاری', 'درباره ما'].map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className="text-olive-400 hover:text-olive-100 transition-colors text-sm"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-olive-400 hover:text-olive-100 transition-colors text-sm px-3 py-1.5"
            >
              ورود
            </Link>
            <Link
              to="/register"
              className="bg-olive-500 text-olive-950 hover:bg-olive-400 transition-all duration-200 text-sm px-4 py-2 rounded-xl font-medium"
            >
              شروع رایگان
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-olive-800 border border-olive-700 text-olive-400 text-xs mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-pulse" />
          نسخه ۲.۰ منتشر شد
        </div>

        <h1 className="text-4xl md:text-6xl text-olive-100 mb-6 leading-tight" style={{ fontWeight: 700 }}>
          سمینارهای آنلاین حرفه‌ای،
          <br />
          <span className="text-olive-400">به سبک اَوسترو</span>
        </h1>

        <p className="text-olive-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          برگزاری جلسات و وبینارهای حرفه‌ای با کیفیت بالا، رابط فارسی و امنیت کامل
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-olive-500 text-olive-950 hover:bg-olive-400 transition-all duration-200 px-6 py-3 rounded-xl font-medium text-lg active:scale-95"
          >
            شروع رایگان
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button className="inline-flex items-center gap-2 border border-olive-700 text-olive-300 hover:bg-olive-800 transition-all duration-200 px-6 py-3 rounded-xl text-lg">
            <Play className="w-5 h-5" />
            مشاهده نسخه نمایشی
          </button>
        </div>

        {/* Mock UI Preview */}
        <div className="mt-16 relative">
          <div className="bg-olive-900 border border-olive-700 rounded-2xl p-4 max-w-3xl mx-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-olive-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 bg-olive-800 rounded-lg h-6 max-w-xs mx-auto" />
            </div>
            <div className="grid grid-cols-3 gap-3 h-48">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-olive-800 rounded-xl border border-olive-700 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-olive-700 flex items-center justify-center">
                    <Users className="w-5 h-5 text-olive-500" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-olive-700">
              {[Video, Users, Calendar].map((Icon, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-olive-800 border border-olive-700 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-olive-500" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-olive-950 via-transparent to-transparent pointer-events-none" style={{ top: '60%' }} />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-olive-800 bg-olive-900/40">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl text-olive-300 mb-1" style={{ fontWeight: 700 }}>{value}</p>
              <p className="text-olive-500 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="قابلیت‌ها" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl text-olive-100 mb-4" style={{ fontWeight: 700 }}>همه چیز که نیاز دارید</h2>
          <p className="text-olive-400 max-w-xl mx-auto">
            ابزارهای حرفه‌ای برای برگزاری جلسات موفق، در یک پلتفرم یکپارچه
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-olive-900 border border-olive-700 rounded-2xl p-6 hover:border-olive-600 hover:bg-olive-800/60 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-olive-800 border border-olive-700 flex items-center justify-center mb-4 group-hover:bg-olive-700 transition-colors">
                <Icon className="w-5 h-5 text-olive-400" />
              </div>
              <h3 className="text-olive-100 mb-2">{title}</h3>
              <p className="text-olive-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/*/!* Pricing *!/*/}
      {/*<section id="قیمت‌گذاری" className="bg-olive-900/30 border-y border-olive-800">*/}
      {/*  <div className="max-w-6xl mx-auto px-6 py-24">*/}
      {/*    <div className="text-center mb-14">*/}
      {/*      <h2 className="text-3xl text-olive-100 mb-4" style={{ fontWeight: 700 }}>پلن‌های قیمت‌گذاری</h2>*/}
      {/*      <p className="text-olive-400">از رایگان شروع کنید، هر زمان که خواستید ارتقا دهید</p>*/}
      {/*    </div>*/}
      {/*    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">*/}
      {/*      {plans.map((plan) => (*/}
      {/*        <div*/}
      {/*          key={plan.name}*/}
      {/*          className={[*/}
      {/*            'rounded-2xl p-6 flex flex-col border transition-all duration-200',*/}
      {/*            plan.highlight*/}
      {/*              ? 'bg-olive-500/10 border-olive-500/50 shadow-lg shadow-olive-500/10'*/}
      {/*              : 'bg-olive-900 border-olive-700 hover:border-olive-600',*/}
      {/*          ].join(' ')}*/}
      {/*        >*/}
      {/*          {plan.highlight && (*/}
      {/*            <div className="text-xs text-olive-950 bg-olive-500 px-2 py-0.5 rounded-full self-start mb-3 font-medium">*/}
      {/*              محبوب‌ترین*/}
      {/*            </div>*/}
      {/*          )}*/}
      {/*          <h3 className="text-olive-100 mb-1">{plan.name}</h3>*/}
      {/*          <div className="mb-5">*/}
      {/*            <span className="text-2xl text-olive-300" style={{ fontWeight: 700 }}>{plan.price}</span>*/}
      {/*            {plan.unit && <span className="text-olive-600 text-sm mr-1">{plan.unit}</span>}*/}
      {/*          </div>*/}
      {/*          <ul className="flex-1 flex flex-col gap-2.5 mb-6">*/}
      {/*            {plan.features.map((f) => (*/}
      {/*              <li key={f} className="flex items-center gap-2 text-olive-400 text-sm">*/}
      {/*                <Check className="w-4 h-4 text-olive-500 shrink-0" />*/}
      {/*                {f}*/}
      {/*              </li>*/}
      {/*            ))}*/}
      {/*          </ul>*/}
      {/*          <Link*/}
      {/*            to="/register"*/}
      {/*            className={[*/}
      {/*              'text-center py-2.5 rounded-xl text-sm font-medium transition-all duration-200',*/}
      {/*              plan.highlight*/}
      {/*                ? 'bg-olive-500 text-olive-950 hover:bg-olive-400'*/}
      {/*                : 'border border-olive-700 text-olive-300 hover:bg-olive-800',*/}
      {/*            ].join(' ')}*/}
      {/*          >*/}
      {/*            {plan.cta}*/}
      {/*          </Link>*/}
      {/*        </div>*/}
      {/*      ))}*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl text-olive-100 mb-4" style={{ fontWeight: 700 }}>کاربران ما چه می‌گویند</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-olive-900 border border-olive-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-olive-500 fill-olive-500" />
                ))}
              </div>
              <p className="text-olive-300 text-sm leading-relaxed mb-5">«{t.text}»</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-olive-800 border border-olive-700 flex items-center justify-center text-olive-400 text-sm font-medium">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-olive-100 text-sm">{t.name}</p>
                  <p className="text-olive-600 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-olive-900/40 border-y border-olive-800">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl text-olive-100 mb-4" style={{ fontWeight: 700 }}>همین الان شروع کنید</h2>
          <p className="text-olive-400 mb-8">بدون نیاز به کارت اعتباری — رایگان شروع کنید</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-olive-500 text-olive-950 hover:bg-olive-400 transition-all duration-200 px-8 py-3.5 rounded-xl font-medium text-lg active:scale-95"
          >
            ثبت‌نام رایگان
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-olive-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-olive-500 flex items-center justify-center">
                  <Video className="w-4 h-4 text-olive-950" />
                </div>
                <span className="text-olive-100 font-medium">اَوسترو میت</span>
              </div>
              <p className="text-olive-500 text-sm leading-relaxed max-w-xs">
                پلتفرم حرفه‌ای برگزاری جلسات و وبینارهای آنلاین فارسی‌زبان
              </p>
              {/*<div className="flex gap-3 mt-5">*/}
              {/*  {[Twitter, Linkedin as InstagramIcon, Linkedin].map((Icon, i) => (*/}
              {/*    <a*/}
              {/*      key={i}*/}
              {/*      href="#"*/}
              {/*      className="w-9 h-9 rounded-xl bg-olive-900 border border-olive-700 flex items-center justify-center text-olive-500 hover:text-olive-300 hover:border-olive-600 transition-all"*/}
              {/*    >*/}
              {/*      <Icon className="w-4 h-4" />*/}
              {/*    </a>*/}
              {/*  ))}*/}
              {/*</div>*/}
            </div>
            <div>
              <p className="text-olive-300 text-sm font-medium mb-4">محصول</p>
              <ul className="flex flex-col gap-2.5">
                {['قابلیت‌ها', 'قیمت‌گذاری', 'امنیت', 'به‌روزرسانی‌ها'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-olive-500 hover:text-olive-300 transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-olive-300 text-sm font-medium mb-4">شرکت</p>
              <ul className="flex flex-col gap-2.5">
                {['درباره ما', 'تماس', 'حریم خصوصی', 'شرایط استفاده'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-olive-500 hover:text-olive-300 transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-olive-800 flex items-center justify-between flex-wrap gap-4">
            <p className="text-olive-600 text-sm">© ۱۴۰۵ اَوسترو میت. تمام حقوق محفوظ است.</p>
            <p className="text-olive-700 text-xs">ساخته شده با ❤️ برای ایران</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
