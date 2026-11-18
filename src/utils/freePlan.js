/** کمک‌ها برای پلن رایگان «ساعتی» (مقدارها از تنظیمات ادمین و API می‌آیند). */

const fa = (n) => Number(n).toLocaleString('fa-IR')

/** ثانیه → «۱۰ ساعت و ۳۰ دقیقه» (ثبت دقیق به ثانیه، نمایش به دقیقه). */
export function formatUsageDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0))
    const minutes = Math.floor(total / 60)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0 && m === 0) return total > 0 ? 'کمتر از یک دقیقه' : '۰ دقیقه'
    if (h === 0) return `${fa(m)} دقیقه`
    if (m === 0) return `${fa(h)} ساعت`
    return `${fa(h)} ساعت و ${fa(m)} دقیقه`
}

export const isHoursPlan = (plan) => plan?.free_mode === 'hours' && plan?.usage_hours != null

/** متن توضیح روشن برای کارت پلن رایگان: تاریخی است یا ساعتی. */
export function freePlanExplanation(plan) {
    if (isHoursPlan(plan)) {
        return `${fa(plan.usage_hours)} ساعت استفاده؛ تاریخ پایان ندارد و هر زمان خواستید تا سقف این ساعت می‌توانید جلسه برگزار کنید. فقط زمان واقعی لایوبودن جلسه‌ها حساب می‌شود.`
    }
    return `${fa(plan.duration_days)} روز اعتبار از زمان فعال‌سازی؛ در این بازه هر قدر خواستید جلسه برگزار کنید.`
}

/** اشتراک فعال از GET /payments/subscription/ — usage فقط برای اشتراک ساعتی پر است. */
export const subscriptionUsage = (subscription) => subscription?.usage || null
