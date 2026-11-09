// سقف پلن: «چند نفر» و «چند تصویر» هم‌زمان. «مانده» وجود ندارد؛ تعداد اتاق‌ها محدودیت ندارد و
// هر اتاق فقط نباید از کل پلن بیشتر بگیرد. محدودیت واقعی هنگام برگزاری است (مجموع افراد حاضر و دوربین‌های روشن).
// ورودی: پاسخ GET /payments/subscription/ (me). مقدار null در total/available یعنی نامحدود.
const toNumberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value))

export function readRoomBudget(info) {
  const a = info?.room_allocations || {}
  return {
    usersTotal: toNumberOrNull(a.users_total),
    usersLive: Number(a.users_live || 0),
    usersAvailable: toNumberOrNull(a.users_available),
    imagesTotal: toNumberOrNull(a.images_total),
    imagesLive: Number(a.images_live || 0),
    imagesAvailable: toNumberOrNull(a.images_available),
    roomsCount: Number(a.rooms_count || 0),
    liveRoomsCount: Number(a.live_rooms_count || 0),
  }
}

export const faNumber = (value) => Number(value ?? 0).toLocaleString('fa-IR')

// پیام کوتاه زیر فیلد: «سقف این فیلد کل پلن است: ۵۰ نفر»
export function limitHint({total, unit}) {
  if (total == null) return 'پلن شما برای این مورد سقفی ندارد.'
  return `حداکثر تا کل پلن (${faNumber(total)} ${unit}) می‌توانید بدهید؛ تعداد اتاق‌ها محدودیتی ندارد.`
}
