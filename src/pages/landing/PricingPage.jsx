import {Link, useLocation} from 'react-router-dom'
import {useAuthStore} from '../../store/authStore'
import CustomPlanBuilder from '../../components/shared/CustomPlanBuilder'
import FreePlanCards from '../../components/shared/FreePlanCards'

export default function PricingPage() {
    const isAuthenticated = useAuthStore((s) => Boolean(s.token))
    const location = useLocation()
    const inDashboard = location.pathname.startsWith('/dashboard/')
    return <div className={`min-h-full bg-[#f4f7fb] text-[#101827] ${inDashboard ? 'meet-light-page' : ''}`} dir="rtl">
        <header
            className={`${inDashboard ? 'hidden' : 'sticky top-0 z-40 border-b border-[#e5eaf2] bg-white/95 backdrop-blur-xl'}`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                <Link to="/" className="flex items-center gap-2.5 rounded-lg"><img src="/avestro-logo.png" alt=""
                                                                                   className="h-9 w-9"/><span
                    className="text-sm font-bold">اَوسترو میت</span></Link>
                <nav aria-label="ناوبری اصلی" className="flex items-center gap-2 text-sm sm:gap-4">
                    <Link to="/" className="min-h-11 rounded-lg px-3 py-2.5 text-[#34415a] hover:text-[#101827]">صفحه
                        اصلی</Link>
                    {isAuthenticated ? <Link to="/dashboard"
                                             className="min-h-11 rounded-xl bg-[#4f7cff] px-4 py-2.5 font-bold text-white">داشبورد</Link> :
                        <Link to="/login"
                              className="min-h-11 rounded-xl bg-[#4f7cff] px-4 py-2.5 font-bold text-white">ورود</Link>}
                </nav>
            </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <section className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
                {/*<p className="mb-3 inline-flex rounded-full bg-[#edf2ff] px-3.5 py-1.5 text-sm font-bold text-[#3d66e8]">تعرفه‌های اَوسترو میت</p>*/}
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">پلن متناسب با شیوه برگزاری خود را
                    بسازید</h1>
                <p className="mt-3 text-sm leading-8 text-[#46536b]">
                    ظرفیت موردنیاز را انتخاب کنید و جزئیات قیمت را پیش
                    از پرداخت ببینید.
                </p>
                <p className="mt-3 text-sm leading-8 text-meet-blue">
                    دسترسی به تمامی امکانات ساخت وبینار، جلسه و کلاس‌آموزشی برای شما در دسترس است
                </p>
            </section>
            <FreePlanCards/>
            <CustomPlanBuilder/>
        </main>
    </div>
}
