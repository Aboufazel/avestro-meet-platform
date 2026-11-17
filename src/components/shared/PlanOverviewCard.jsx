import {Link} from 'react-router-dom'
import {CalendarClock, Gauge, Image as ImageIcon, Infinity as InfinityIcon, Loader2, Users, Video} from 'lucide-react'
import {faNumber, readRoomBudget} from '../../utils/roomBudget'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'

const daysLeft = (expiresAt) => {
    if (!expiresAt) return null
    const time = new Date(expiresAt).getTime()
    return Number.isNaN(time) ? null : Math.max(0, Math.ceil((time - Date.now()) / 86400000))
}

// وضعیت مصرف: رنگ تنها حامل معنی نیست؛ برچسب متنی هم نمایش داده می‌شود.
function tone(percent) {
    if (percent >= 100) return {bar: 'bg-[#e0566a]', text: 'text-[#b8283d]', label: 'تکمیل'}
    if (percent >= 80) return {bar: 'bg-[#f0a43a]', text: 'text-[#9a5b06]', label: 'نزدیک سقف'}
    return {bar: 'bg-[#35b992]', text: 'text-[#16815f]', label: 'در محدوده'}
}

function Meter({icon: Icon, title, unit, total, used, available}) {
    const unlimited = total == null
    const percent = unlimited || total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100))
    const t = tone(percent)
    return (
        <div className="rounded-2xl border border-[#e8edf5] bg-white/90 p-3.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Icon
                        size={16} aria-hidden="true"/></span>
                    <h3 className="text-sm font-bold text-[#34415a]">{title}</h3>
                </div>
                {!unlimited && <span
                    className={`rounded-full bg-[#f4f7fb] px-2 py-0.5 text-[11px] font-bold ${t.text}`}>{t.label}</span>}
            </div>
            <p className="mt-3 flex flex-wrap items-baseline gap-1 text-[#101827]">
                <span className="text-xs text-[#8d98aa]">همین الان:</span>
                <span className="text-2xl font-extrabold tabular-nums">{faNumber(used)}</span>
                <span className="text-xs text-[#8d98aa]">از</span>
                {unlimited
                    ? <span className="inline-flex items-center gap-1 text-sm font-bold text-[#34415a]"><InfinityIcon
                        size={15} aria-hidden="true"/>نامحدود</span>
                    : <span className="text-base font-bold tabular-nums text-[#34415a]">{faNumber(total)}</span>}
                <span className="text-xs text-[#8d98aa]">{unit}</span>
            </p>
            {!unlimited && (
                <>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#edf1f7]" role="progressbar"
                         aria-label={`وضعیت لحظه‌ای ${title}`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={used}
                         aria-valuetext={`${faNumber(used)} از ${faNumber(total)} ${unit}`}>
                        <div className={`h-full rounded-full transition-all ${t.bar}`} style={{width: `${percent}%`}}/>
                    </div>
                    <p className="mt-2 text-xs text-[#68758a]">جای خالی برای جلسه‌های زنده: <b
                        className="tabular-nums text-[#101827]">{faNumber(available)}</b> {unit}</p>
                </>
            )}
        </div>
    )
}

/**
 * کارت جمع‌وجور وضعیت پلن در نمای کلی: وضعیت لحظه‌ای کاربر و تصویر نسبت به سقف پلن.
 * subscription: پاسخ GET /payments/subscription/ — تعداد اتاق‌ها فقط اطلاعاتی است.
 */
export default function PlanOverviewCard({subscription, loading}) {
    const active = subscription?.active
    const reserved = subscription?.reserved?.[0]
    const budget = readRoomBudget(subscription)
    const days = daysLeft(active?.expires_at)

    return (
        <section aria-labelledby="plan-overview"
                 className="my-6 rounded-[24px] border border-[#dfe8f5] bg-gradient-to-l from-white via-white to-[#eef4ff] p-4 shadow-[0_12px_32px_rgba(35,61,105,.05)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eaf0ff] text-[#4f7cff]"><Gauge
                        size={20} aria-hidden="true"/></span>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 id="plan-overview" className="text-base font-extrabold text-[#101827]">وضعیت پلن و
                                ظرفیت</h2>
                            {!loading && <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${active ? 'bg-[#e5f8f1] text-[#16815f]' : reserved ? 'bg-[#edf2ff] text-[#3d66e8]' : 'bg-[#f1f3f7] text-[#68758a]'}`}>{active ? 'فعال' : reserved ? 'رزروشده' : 'بدون اشتراک'}</span>}
                        </div>
                        {loading
                            ? <p role="status" className="mt-1 flex items-center gap-2 text-xs text-[#8d98aa]"><Loader2
                                size={14} className="animate-spin" aria-hidden="true"/>در حال دریافت اطلاعات پلن…</p>
                            : <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#68758a]">
                                <span
                                    className="font-bold text-[#34415a]">{active?.plan?.name || reserved?.plan?.name || 'پلنی انتخاب نشده است'}</span>
                                {active && <span className="inline-flex items-center gap-1"><CalendarClock size={13}
                                                                                                           aria-hidden="true"/>{days == null ? 'تاریخ پایان نامشخص' : days === 0 ? 'کمتر از یک روز اعتبار' : `${faNumber(days)} روز تا پایان اعتبار`}</span>}
                                {active && <span className="inline-flex items-center gap-1"><Video size={13}
                                                                                                   aria-hidden="true"/>{faNumber(budget.roomsCount)} اتاق</span>}
                            </p>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/dashboard/subscription"
                          className={`meet-soft-btn inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold ${focusRing}`}>جزئیات
                        اشتراک</Link>
                  {
                    active ?
                        ''
                        :
                   <Link to="/dashboard/pricing"
                          className={`meet-primary-btn inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-xs font-bold ${focusRing}`}>
                     {active ? '' : 'ساخت پلن'}
                   </Link>
                  }
                </div>
            </div>

            {!loading && active && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Meter icon={Users} title="کاربران" unit="نفر" total={budget.usersTotal} used={budget.usersLive}
                           available={budget.usersAvailable}/>
                    <Meter icon={ImageIcon} title="تصاویر هم‌زمان" unit="تصویر" total={budget.imagesTotal}
                           used={budget.imagesLive} available={budget.imagesAvailable}/>
                </div>
            )}
            {!loading && active &&
                <p className="mt-3 text-[11px] leading-6 text-[#8d98aa]">تعداد اتاق‌ها محدودیتی ندارد. اعداد بالا
                    وضعیت لحظه‌ای جلسه‌های زنده است: وقتی کاربران پلن (با احتساب میزبان) پر شود، جلسه‌ی دیگری شروع
                    نمی‌شود و وقتی تصاویر پر شود، جلسه‌ی جدید بدون تصویر برگزار می‌شود.</p>}
            {!loading && !active && reserved &&
                <p className="mt-3 rounded-xl bg-[#edf2ff] px-3 py-2.5 text-xs leading-6 text-[#3d66e8]">پلن رزروشده
                    است؛ مصرف و روزهای اعتبار پس از شروع پلن نمایش داده می‌شوند.</p>}
            {!loading && !active && !reserved &&
                <p className="mt-3 text-xs leading-6 text-[#68758a]">برای ساخت اتاق، یک پلن انتخاب کنید.</p>}
        </section>
    )
}
