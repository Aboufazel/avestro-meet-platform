// بودجه‌ی پلن: مجموع کاربر و تصویر اتاق‌ها از پلن بیشتر نمی‌شود (تعداد اتاق‌ها و جلسه‌ی هم‌زمان محدودیت ندارد).
// ورودی: پاسخ GET /payments/subscription/ (me). مقدار null در total/remaining یعنی نامحدود.
const toNumberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value))

export function readRoomBudget(info) {
  const a = info?.room_allocations || {}
  return {
    usersTotal: toNumberOrNull(a.users_total),
    usersUsed: Number(a.users_used || 0),
    usersRemaining: toNumberOrNull(a.users_remaining),
    imagesTotal: toNumberOrNull(a.images_total),
    imagesUsed: Number(a.images_used || 0),
    imagesRemaining: toNumberOrNull(a.images_remaining),
    roomsCount: Number(a.rooms_count || 0),
  }
}

export const faNumber = (value) => Number(value ?? 0).toLocaleString('fa-IR')

// پیام کوتاه برای زیر فیلد: «۸ از ۱۰ نفر مصرف شده؛ حداکثر ۲ نفر»
export function budgetHint({ total, used, remaining, unit, ownShare = 0 }) {
  if (total == null) return 'سقفی برای مجموع اتاق‌ها تعریف نشده است.'
  const cap = remaining == null ? null : remaining + ownShare
  return `${faNumber(used - ownShare)} از ${faNumber(total)} ${unit} پلن در اتاق‌های دیگر مصرف شده؛ حداکثر ${faNumber(cap)} ${unit} می‌توانید بدهید.`
}
