/*
 * امکاناتی که «بخشی از پلن» حساب می‌شوند و به کاربر نشان داده می‌شوند:
 * کارت‌های تعرفه و اشتراک، و مرحله‌ی امکانات در ساخت و ویرایش جلسه.
 * بقیه‌ی امکانات برای همه فعال‌اند و در رابط کاربری فروش/تنظیم جلسه فهرست نمی‌شوند.
 * (فقط فرانت؛ منطق و کنترل دسترسی بک‌اند دست‌نخورده است.)
 */
export const PLAN_FEATURE_KEYS = ['whiteboard', 'documents', 'speak_permission', 'raise_hand', 'attendance']

export const isPlanFeature = (key) => PLAN_FEATURE_KEYS.includes(key)

export const onlyPlanFeatures = (features = []) => features.filter((feature) => isPlanFeature(feature.key))
