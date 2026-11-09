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

  // دریافت سرورهای STUN/TURN از prosody (XEP-0215 / external_services).
  // بدون این گزینه lib-jitsi-meet هیچ iceServer ای به RTCPeerConnection نمی‌دهد
  // و در شبکه‌هایی که UDP مستقیم به JVB بسته است، ICE شکست می‌خورد.
  useStunTurn: true,
  // TURN/UDP فعال است (اولین گزینه‌ی fallback وقتی مسیر مستقیم به JVB بسته است).
  // TURN/TCP روی ۳۴۷۸ برای شبکه‌هایی که UDP را کاملاً می‌بندند هم می‌ماند.
  useTurnUdp: true,
}

// =============================================================================
// تشخیص دستگاه و سطح عملکرد (performance tier)
//
// ریشه‌ی مشکل «اسلوموشن + داغ شدن گوشی» این بود که کلاینت روی هر دستگاهی
// هرچقدر ویدیو که سرور می‌فرستاد را decode می‌کرد. این‌جا بر اساس توان
// دستگاه، سقف دریافت/ارسال را مشخص می‌کنیم.
//
// نکته: navigator.deviceMemory فقط در کروم/اندروید وجود دارد؛ در Safari/iOS
// undefined است و فقط از hardwareConcurrency استفاده می‌شود.
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

export function isLowEndDevice() {
  if (typeof navigator === 'undefined') return false

  const cores = navigator.hardwareConcurrency ?? 8
  const memory = navigator.deviceMemory ?? 8

  // موبایل: ۴ هسته یا کمتر ضعیف است.
  // دسکتاپ: لپ‌تاپ ۴ هسته‌ای معمولی است و «ضعیف» حساب نمی‌شود (tier متوسط
  // می‌گیرد)؛ فقط ۲ هسته یا کمتر / ۲ گیگ رم یا کمتر ضعیف است.
  if (isMobileDevice()) return cores <= 4 || memory <= 2
  return cores <= 2 || memory <= 2
}

/**
 * مک/iOS/Safari: انکودر H264 سخت‌افزاری (VideoToolbox) دارد و VP8/VP9 نرم‌افزاری
 * اجرا می‌شود (CPU بالا و داغ شدن). برای این دستگاه‌ها H264 را اول می‌گذاریم.
 */
export function isFirefoxBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Firefox|FxiOS/i.test(navigator.userAgent || '')
}

export function isAppleDevice() {
  if (typeof navigator === 'undefined') return false
  return /Macintosh|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}

/**
 * H264 اول فقط برای مرورگرهایی که واقعاً انکودر سخت‌افزاری Apple را دارند
 * (Safari/Chrome روی مک و iOS). Firefox حتی روی مک از OpenH264 نرم‌افزاری
 * استفاده می‌کند و H264 + اشتراک صفحه + دوربین هم‌زمان در آن سیاه/ناپایدار
 * می‌شود؛ برای Firefox همیشه VP8 اول است.
 */
export function prefersH264() {
  return isAppleDevice() && !isFirefoxBrowser()
}

// =============================================================================
// پروفایل‌های اشتراک صفحه
//
// قبلاً فریم‌ریت اشتراک صفحه برای همه‌چیز روی ۵fps قفل بود؛ برای اسلاید خوب
// است ولی ویدیو، انیمیشن، اسکرول و حرکت ماوس را «پرشی» نشان می‌داد.
// حالا سه حالت داریم و کاربر (از تنظیمات) حتی وسط اشتراک هم می‌تواند عوض کند:
//
//  text     : متن/اسلاید/PDF — وضوح بالا، ۵fps (کمترین مصرف اینترنت)
//  balanced : پیش‌فرض — ۱۵fps، وضوح را حفظ می‌کند (اسکرول و ماوس روان)
//  motion   : ویدیو/انیمیشن — فریم‌ریت بالا، روانی مهم‌تر از وضوح
//
// contentHint به انکودر مرورگر می‌گوید هنگام کمبود پهنای باند چه چیزی را فدا کند.
// برای تغییر پیش‌فرض بدون کد: VITE_SCREEN_SHARE_MODE=text|balanced|motion
// =============================================================================
export const SCREEN_SHARE_PROFILES = {
  text: {label: 'متن و اسلاید', fps: 5, contentHint: 'detail', maxHeight: 1080},
  balanced: {label: 'متعادل', fps: 15, contentHint: 'detail', maxHeight: 1080},
  motion: {label: 'ویدیو و انیمیشن', fps: 30, contentHint: 'motion', maxHeight: 1080},
}

const SCREEN_SHARE_STORAGE_KEY = 'avestro.screenShareMode'
const SCREEN_SHARE_ENV_DEFAULT = import.meta.env.VITE_SCREEN_SHARE_MODE
const SCREEN_SHARE_DEFAULT_MODE =
  SCREEN_SHARE_ENV_DEFAULT in SCREEN_SHARE_PROFILES ? SCREEN_SHARE_ENV_DEFAULT : 'balanced'

export function getScreenShareMode() {
  try {
    const saved = window.localStorage.getItem(SCREEN_SHARE_STORAGE_KEY)
    if (saved && saved in SCREEN_SHARE_PROFILES) return saved
  } catch {
    // storage می‌تواند در بعضی مرورگرها/حالت‌ها در دسترس نباشد
  }
  return SCREEN_SHARE_DEFAULT_MODE
}

export function setScreenShareModePreference(mode) {
  if (!(mode in SCREEN_SHARE_PROFILES)) return false
  try {
    window.localStorage.setItem(SCREEN_SHARE_STORAGE_KEY, mode)
  } catch {
    // فقط ذخیره نشد؛ حالت برای همین جلسه اعمال می‌شود
  }
  return true
}

export function getScreenShareProfile(mode = getScreenShareMode()) {
  const base = SCREEN_SHARE_PROFILES[mode] || SCREEN_SHARE_PROFILES[SCREEN_SHARE_DEFAULT_MODE]
  // دستگاه ضعیف: انکود ۱۰۸۰p با ۳۰fps = گرما و افت فریم؛ سقف را پایین بیاور.
  if (DEVICE_TIER === 'low') {
    return {...base, fps: Math.min(base.fps, 15), maxHeight: 720}
  }
  return base
}

export function getDesktopFrameRate(mode) {
  const {fps} = getScreenShareProfile(mode)
  return {min: Math.min(5, fps), max: fps}
}

const IS_MOBILE = isMobileDevice()
const IS_LOW_END = isLowEndDevice()

/**
 * مدل ارسال ویدیو:
 *  - true (پیش‌فرض): دوربین و دسکتاپ هم‌زمان و جدا ارسال می‌شوند
 *    (sendMultipleVideoStreams). سرور Jicofo/JVB فعلی این را پشتیبانی می‌کند.
 *  - false (مدل قدیمی meet): هر نفر یک اسلات ویدیو دارد؛ هنگام اشتراک صفحه
 *    دوربین جایگزین دسکتاپ می‌شود و بعد از پایان برمی‌گردد.
 *    خاموش‌کردن: VITE_JITSI_MULTI_STREAM=false در .env
 */
export const MULTI_STREAM_ENABLED =
  import.meta.env.VITE_JITSI_MULTI_STREAM !== 'false'

/**
 * low    : موبایل/دسکتاپ ضعیف  → کمترین مصرف
 * medium : موبایل معمولی
 * high   : دسکتاپ قوی
 */
const IS_MID_DESKTOP =
  !IS_MOBILE &&
  typeof navigator !== 'undefined' &&
  (navigator.hardwareConcurrency ?? 8) <= 4

export const DEVICE_TIER = IS_LOW_END ? 'low' : IS_MOBILE || IS_MID_DESKTOP ? 'medium' : 'high'

export const PERF = {
  tier: DEVICE_TIER,

  // حداکثر تعداد ویدیوی «زنده» که هم‌زمان decode می‌شود (دریافتی از bridge).
  // بقیه‌ی شرکت‌کننده‌ها فقط صدا + آواتار دارند.
  maxRemoteVideos: { low: 4, medium: 6, high: 12 }[DEVICE_TIER],

  // ارتفاع ویدیوی ارسالی دوربین خودمان (encode روی CPU/GPU گوشی)
  sendHeight: { low: 360, medium: 480, high: 720 }[DEVICE_TIER],

  // سقف فریم‌ریت دوربین ارسالی (best-effort؛ پایین‌تر = انکودر خنک‌تر)
  sendMaxFps: { low: 20, medium: 24, high: 30 }[DEVICE_TIER],

  // کیفیت دریافتی: تایل بزرگ (focus / active speaker) در مقابل تایل کوچک
  receiveLargeHeight: { low: 360, medium: 480, high: 720 }[DEVICE_TIER],
  receiveSmallHeight: 180,

  // اشتراک صفحه در قاب سینمایی بزرگ نمایش داده می‌شود؛ متن باید خوانا بماند
  receiveScreenHeight: { low: 720, medium: 720, high: 1080 }[DEVICE_TIER],

  // فاصله‌ی اندازه‌گیری audio level (ms). پیش‌فرض خود lib خیلی پرتکرار است.
  audioLevelsInterval: { low: 1000, medium: 500, high: 300 }[DEVICE_TIER],
}

// =============================================================================
// JitsiMeetJS.init()
//
// این گزینه‌ها طبق IJitsiMeetJSOptions مستندات lib-jitsi-meet معتبرند.
// =============================================================================
export const JITSI_INIT_OPTIONS = {
  disableAudioLevels: false,
  // سقف کلی؛ مقدار هر اشتراک بر اساس حالت انتخابی در createLocalTracks می‌آید.
  desktopSharingFrameRate: { min: 5, max: 30 },
  audioLevelsInterval: PERF.audioLevelsInterval,
  disableThirdPartyRequests: true,
}

// =============================================================================
// CONFERENCE_CONFIG
//
// فقط کلیدهایی که در IConferenceOptions['config'] مستندات lib-jitsi-meet
// وجود دارند معنا دارند. کلیدهای زیر قبلاً این‌جا بودند ولی lib آن‌ها را
// نمی‌خواند (تنظیمات اپ jitsi-meet هستند، نه lib) و بی‌اثر بودند:
//   resolution, constraints, maxFullResolutionParticipants,
//   disableSimulcast, enableLayerSuspension, disableAP, audioQuality,
//   prejoinPageEnabled, disableDeepLinking, disableInviteFunctions
// کیفیت ارسال دوربین حالا در createLocalTracks({resolution}) و
// conference.setSenderVideoConstraint اعمال می‌شود (JitsiController).
// =============================================================================
export const CONFERENCE_CONFIG = {
  // سقف ویدیوهای دریافتی از bridge. تنظیم دقیق‌تر در زمان اجرا با
  // conference.setReceiverConstraints انجام می‌شود (JitsiController).
  channelLastN: PERF.maxRemoteVideos,

  videoQuality: {
    enableAdaptiveMode: true,

    // کدک نرم‌افزاری سنگین (AV1/VP9) روی دستگاه ضعیف = CPU بالا = گرما.
    // VP8 روی همه‌جا کار می‌کند و H264 معمولاً hardware-accelerated است.
    codecPreferenceOrder:
      DEVICE_TIER === 'high' ? ['VP9', 'VP8', 'H264'] : ['VP8', 'H264'],
    mobileCodecPreferenceOrder: ['VP8', 'H264'],
  },

  // P2P برای جلسه‌ی ۲ نفره: یک hop کمتر، تأخیر کمتر، بدون بار روی JVB.
  // پیش‌فرض خاموش است؛ بعد از تست در شبکه‌های واقعی با VITE_JITSI_P2P=true روشن کن.
  p2p: import.meta.env.VITE_JITSI_P2P === 'true'
    ? { enabled: true, useStunTurn: true }
    : { enabled: false },

  // multi-stream با سوییچ MULTI_STREAM_ENABLED (بالای همین فایل) کنترل می‌شود.
  ...(MULTI_STREAM_ENABLED
    ? {
        flags: {
          sendMultipleVideoStreams: true,
          receiveMultipleVideoStreams: true,
        },
      }
    : {}),

  // اشتراک صفحه: مقدار واقعی هر اشتراک از SCREEN_SHARE_PROFILES می‌آید.
  desktopSharingFrameRate: { min: 5, max: 30 },

  // این دو تشخیص هیچ‌جای اپ استفاده نشده‌اند ولی هرکدام یک پردازش صوتی
  // دائمی روی میکروفون اجرا می‌کنند.
  enableNoisyMicDetection: false,
  enableNoAudioDetection: false,
}

// =============================================================================
// تنظیمات ساخت track دوربین
//
// createLocalTracks فقط گزینه‌ی `resolution` را می‌پذیرد (ارتفاع تصویر).
// frameRate در API وجود ندارد؛ به‌صورت best-effort روی MediaStreamTrack
// اعمال می‌شود.
// =============================================================================
export const LOCAL_VIDEO_CONFIG = {
  resolution: PERF.sendHeight,
  maxHeight: PERF.sendHeight,
  maxFps: PERF.sendMaxFps,
}

// =============================================================================
// سطوح کیفیت دریافتی (به conference.setReceiverConstraints داده می‌شود)
// =============================================================================
export const RECEIVER_QUALITY = {
  LARGE: PERF.receiveLargeHeight,
  SMALL: PERF.receiveSmallHeight,
  SCREEN: PERF.receiveScreenHeight,
}

// =============================================================================
// تنظیمات پایداری در شبکه ضعیف (موبایل‌دیتا)
// =============================================================================
export const RECONNECT_CONFIG = {
  maxAttempts: 6,
  baseDelayMs: 1000, // تلاش اول بعد از ۱ ثانیه
  maxDelayMs: 15000, // سقف فاصله بین تلاش‌ها
}
// کاهش خودکار کیفیت آپلود دوربین در packet loss بالا (به‌جای فریز شدن).
// مقادیر درصد packet loss آپلود هستند (از LOCAL_STATS_UPDATED).
export const ADAPTIVE_UPLOAD = {
  lossHigh: 8, // بالاتر از این = شبکه ضعیف
  lossLow: 2, // پایین‌تر از این = شبکه دوباره خوب شده
  downSamples: 2, // چند نمونه‌ی پشت‌سرهم برای پایین‌آوردن
  upSamples: 8, // چند نمونه‌ی پشت‌سرهم برای برگرداندن (محتاط‌تر)
  lowHeight: 360,
}
