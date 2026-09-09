/**
 * تنظیمات اتصال به سرور Jitsi
 * هیچ مقداری نباید اینجا هاردکد بشه — همه از env میان
 */

const JITSI_HOST = import.meta.env.VITE_JITSI_HOST || 'meet.avestro.ir'
const JITSI_INTERNAL_DOMAIN = 'meet.jitsi'

export const CONNECTION_CONFIG = {
  hosts: {
    domain: JITSI_INTERNAL_DOMAIN,
    muc: `muc.${JITSI_INTERNAL_DOMAIN}`,
    focus: `focus.${JITSI_INTERNAL_DOMAIN}`,
  },
  serviceUrl: `wss://${JITSI_HOST}/xmpp-websocket`,
  clientNode: 'https://jitsi.org/jitmeet',
}

// =============================================================================
// تشخیص دستگاه موبایل
//
// این تشخیص فقط برای تصمیم‌گیری درباره‌ی کیفیت پیش‌فرض استفاده می‌شود.
// دلیل مشکل داغ‌کردن گوشی هنگام تماس زنده:
//   ۱. عدم محدودیت تعداد ویدیوهای دریافتی (لیست شرکت‌کننده‌ها رشد می‌کند
//      ولی سرور Jitsi (Videobridge) هیچ سقفی برای ارسال به کلاینت نداشت)
//   ۲. رزولوشن یکسان برای موبایل و دسکتاپ
// =============================================================================
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)

  // برخی تبلت‌های جدید iPadOS خودشون رو مک معرفی می‌کنن؛ با touch تشخیص می‌دیم
  const isTouchMac =
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1

  return isMobileUA || isTouchMac
}

// =============================================================================
// CONFERENCE_CONFIG
// =============================================================================
export const CONFERENCE_CONFIG = {
  // ---------------------------------------------------------------------------
  // محدودیت تعداد ویدیوهای دریافتی از bridge (channelLastN)
  //
  // این مهم‌ترین فیکس داغ‌کردن گوشی است.
  // بدون این مقدار، Videobridge تمام ویدیوهای شرکت‌کننده‌ها را برای
  // کلاینت ارسال می‌کند (حتی آن‌هایی که در نوار کوچک پایین و خارج از
  // دید هستند)، و کلاینت مجبور است همه را هم‌زمان decode کند.
  //
  // مقدار ۴ یعنی: فقط ۴ استریم با بالاترین اولویت (active speaker +
  // اخیراً صحبت‌کرده‌ها) دریافت می‌شود؛ بقیه فقط صدا دارند.
  // برای موبایل عدد را کمی محافظه‌کارانه‌تر می‌گذاریم.
  // ---------------------------------------------------------------------------
  channelLastN: isMobileDevice() ? 4 : 8,

  // کیفیت ویدیو
  maxFullResolutionParticipants: isMobileDevice() ? 1 : 2,
  resolution: isMobileDevice() ? 480 : 720,
  constraints: {
    video: isMobileDevice()
      ? { height: { ideal: 480, max: 480, min: 180 } }
      : { height: { ideal: 720, max: 720, min: 180 } },
  },

  // پرفرمنس
  disableSimulcast: false,
  enableLayerSuspension: true,
  p2p: { enabled: false },

  // صدا
  disableAP: false,
  enableNoisyMicDetection: true,
  enableNoAudioDetection: true,
  audioQuality: {
    stereo: false,
    opusDtx: true,
  },

  // UI
  prejoinPageEnabled: false,
  disableDeepLinking: true,
  disableInviteFunctions: true,
}

// =============================================================================
// TRACK_CONFIG (ارسال دوربین محلی)
//
// روی موبایل، ideal پایین‌تر یعنی انکودر هاردویر گوشی فشار کمتری
// برای encode کردن استریم خروجی متحمل می‌شود.
// =============================================================================
export const TRACK_CONFIG = {
  devices: ['audio', 'video'],
  constraints: {
    video: isMobileDevice()
      ? {
          facingMode: 'user',
          height: { ideal: 480, max: 480, min: 180 },
          frameRate: { ideal: 20, max: 24 },
        }
      : {
          facingMode: 'user',
          height: { ideal: 720, max: 720, min: 180 },
        },
  },
}

// =============================================================================
// سطوح کیفیت دریافتی برای تایل‌های کوچک در مقابل تایل بزرگ (featured)
//
// در VideoTile از این استفاده می‌شود تا با setReceiverVideoConstraint
// یا Sender Constraint per-track، تایل‌های کوچک کیفیت پایین‌تری
// درخواست کنند.
// =============================================================================
export const RECEIVER_QUALITY = {
  LARGE: isMobileDevice() ? 360 : 720,
  SMALL: 180,
}

// =============================================================================
// تنظیمات پایداری در شبکه ضعیف (موبایل‌دیتا)
// =============================================================================
export const RECONNECT_CONFIG = {
  maxAttempts: 6,
  baseDelayMs: 1000, // تلاش اول بعد از ۱ ثانیه
  maxDelayMs: 15000, // سقف فاصله بین تلاش‌ها
}