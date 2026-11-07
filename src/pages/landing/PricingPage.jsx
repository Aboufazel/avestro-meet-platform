import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import CustomPlanBuilder from '../../components/shared/CustomPlanBuilder'

export default function PricingPage() {
  const isAuthenticated = useAuthStore((s) => Boolean(s.token))
  return <div className="min-h-screen bg-[#f4f7fb] text-[#101827]" dir="rtl">
    <header className="sticky top-0 z-40 border-b border-[#e5eaf2] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg"><img src="/avestro-logo.png" alt="" className="h-9 w-9"/><span className="text-sm font-bold">اَوسترو میت</span></Link>
        <nav aria-label="ناوبری اصلی" className="flex items-center gap-2 text-sm sm:gap-4">
          <Link to="/" className="min-h-11 rounded-lg px-3 py-2.5 text-[#34415a] hover:text-[#101827]">صفحه اصلی</Link>
          {isAuthenticated ? <Link to="/dashboard" className="min-h-11 rounded-xl bg-[#2c55d4] px-4 py-2.5 font-bold text-white">داشبورد</Link> : <Link to="/login" className="min-h-11 rounded-xl bg-[#2c55d4] px-4 py-2.5 font-bold text-white">ورود</Link>}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
        <p className="mb-3 inline-flex rounded-full bg-[#e6edff] px-3.5 py-1.5 text-sm font-bold text-[#1f3f9c]">تعرفه‌های اَوسترو میت</p>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">پلن متناسب با شیوه برگزاری شما</h1>
        <p className="mt-3 text-sm leading-8 text-[#46536b]">ظرفیت موردنیاز را انتخاب کنید و جزئیات قیمت را پیش از پرداخت ببینید.</p>
      </section>
      <CustomPlanBuilder/>
      <p className="mx-auto mt-6 flex max-w-4xl items-start gap-3 text-sm leading-7 text-[#46536b]"><span className="mt-1 shrink-0">●</span>قیمت نهایی در سمت سرور محاسبه می‌شود. پلن‌های قدیمی برای سوابق و اشتراک‌های قبلی حفظ شده‌اند و در مسیر فروش جدید نمایش داده نمی‌شوند.</p>
    </main>
  </div>
}
