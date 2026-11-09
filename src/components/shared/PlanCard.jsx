import { CalendarClock, Check, CheckCircle2, Infinity as InfinityIcon, Minus, ArrowLeft } from 'lucide-react'
import { formatIsoJalali } from '../../utils/jalali'
import { onlyPlanFeatures } from '../../constants/planFeatures'

/*
 * کارت پلن مشترک بین «تعرفه‌ها» و «اشتراک‌های داشبورد».
 * اصول: متن حداقل ۱۳px، کنتراست AA، هیچ معنایی فقط با رنگ منتقل نمی‌شود،
 * ساختار معنایی (article / h3 / dl / ul)، دکمه‌های حداقل ۴۴px و focus واضح.
 * هیچ عنوان، واحد یا کلیدی هاردکد نیست؛ همه‌چیز از داده‌ی API می‌آید.
 */

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')

export const formatMoney = (value) => `${fa(value)} ریال`

export const formatLimitValue = (limit) => {
  if (limit.value == null) return 'نامحدود'
  if (Number(limit.value) === 0) return 'غیرفعال'
  return limit.unit === 'mb' ? `${fa(limit.value)} مگابایت` : fa(limit.value)
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'

export const primaryButtonClass = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4f7cff] px-4 py-3 text-sm font-bold text-white hover:bg-[#3d66e8] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`
export const secondaryButtonClass = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#4f7cff] bg-white px-4 py-3 text-sm font-bold text-[#3d66e8] hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

// سقف‌هایی که دیگر در محصول معنا ندارند (جلسه‌ی لایو هم‌زمان محدودیت ندارد)
const HIDDEN_LIMIT_KEYS = ['max_live_sessions']

function LimitList({ limits: allLimits, usage = {} }) {
  const limits = (allLimits || []).filter((limit) => !HIDDEN_LIMIT_KEYS.includes(limit.key))
  if (!limits.length) return null
  return (
    <dl className="divide-y divide-[#e5eaf2] rounded-xl border border-[#e5eaf2] bg-[#f8faff]">
      {limits.map((limit) => {
        const used = usage[limit.key]
        const hasBar = used?.value != null && used.used != null && Number(used.value) > 0
        const percent = hasBar ? Math.min(100, Math.round((Number(used.used) / Number(used.value)) * 100)) : 0
        return (
          <div key={limit.key} className="px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-sm leading-6 text-[#34415a]">{limit.title}</dt>
              <dd className="shrink-0 text-sm font-extrabold text-[#101827] flex items-center gap-1.5">
                {limit.value == null && <InfinityIcon size={16} aria-hidden="true" />}
                {formatLimitValue(limit)}
              </dd>
            </div>
            {used?.used != null && (
              <div className="mt-2">
                {hasBar && (
                  <div
                    role="progressbar"
                    aria-label={`مصرف ${limit.title}`}
                    aria-valuemin={0}
                    aria-valuemax={Number(used.value)}
                    aria-valuenow={Number(used.used)}
                    aria-valuetext={`${fa(used.used)} از ${fa(used.value)}`}
                    className="h-2 overflow-hidden rounded-full bg-[#dfe6f3]"
                  >
                    <div className={`h-full rounded-full ${percent >= 100 ? 'bg-[#b42335]' : 'bg-[#4f7cff]'}`} style={{ width: `${percent}%` }} />
                  </div>
                )}
                <p className="mt-1.5 text-[13px] leading-5 text-[#46536b]">
                  مصرف‌شده {fa(used.used)}
                  {' · '}
                  باقی‌مانده {used.remaining == null ? 'نامحدود' : fa(used.remaining)}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </dl>
  )
}

function FeatureList({ features }) {
  if (!features?.length) return null
  return (
    <ul className="space-y-2">
      {features.map((feature) => (
        <li key={feature.key} className="flex items-start gap-2.5 text-sm leading-6 text-[#34415a]">
          {feature.enabled ? (
            <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0f7a5c]" />
          ) : (
            <Minus size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#6b778c]" />
          )}
          <span className={feature.enabled ? '' : 'text-[#5b6880]'}>
            {feature.title}
            <span className="sr-only">{feature.enabled ? ' — شامل می‌شود' : ' — شامل نمی‌شود'}</span>
            {!feature.enabled && <span aria-hidden="true"> (شامل نمی‌شود)</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="space-y-2.5">
      <h4 id={id} className="text-sm font-extrabold text-[#101827]">{title}</h4>
      {children}
    </section>
  )
}

/**
 * کارت پلن در صفحه‌ی تعرفه‌ها.
 * plan: خروجی PlanSerializer — onSelect(plan) — selected: پلن در حال بررسی است.
 */
export function PlanCard({ plan, onSelect, selected = false }) {
  const custom = Boolean(plan.is_custom_priced)
  const uid = `plan-${plan.id}`
  const duration = custom
    ? `از ${fa(plan.min_days || 1)} روز، مدت را خودتان تعیین می‌کنید`
    : `اعتبار ${fa(plan.duration_days)} روز`
  const isFree = !custom && Number(plan.price) === 0
  const features = onlyPlanFeatures(plan.features)
  return (
    <article
      aria-labelledby={`${uid}-title`}
      className={`flex h-full flex-col rounded-2xl border-2 bg-white p-5 sm:p-6 ${selected ? 'border-[#4f7cff] shadow-[0_0_0_4px_rgba(44,85,212,.14)]' : 'border-[#e5eaf2]'}`}
    >
      <header>
        <p className="text-[13px] font-bold text-[#3d66e8]">{customTitle || plan.plan_type?.name || 'پلن'}</p>
        <h3 id={`${uid}-title`} className="mt-1 text-xl font-extrabold leading-8 text-[#101827]">{plan.name}</h3>
        {plan.description && <p className="mt-2 text-sm leading-7 text-[#46536b]">{plan.description}</p>}
      </header>

      <div className="mt-5 rounded-xl bg-[#eef3ff] p-4">
        <p className="text-[13px] font-bold text-[#34415a]">{custom ? 'هزینه' : 'قیمت'}</p>
        <p className="mt-1 text-2xl font-extrabold text-[#101827]">
          {custom ? 'بر اساس انتخاب شما' : isFree ? 'رایگان' : formatMoney(plan.price)}
        </p>
        <p className="mt-1 text-sm text-[#34415a]">{duration}</p>
        {plan.tax_enabled && (
          <p className="mt-2 text-[13px] leading-6 text-[#34415a]">
            مالیات {fa(plan.tax_percent)}٪ به مبلغ اضافه می‌شود و در پیش‌فاکتور می‌بینید.
          </p>
        )}
      </div>

      <div className="mt-5 flex-1 space-y-5">
        <Section id={`${uid}-limits`} title="محدودیت‌ها">
          <LimitList limits={plan.limits} />
        </Section>
        {features.length > 0 && (
          <Section id={`${uid}-features`} title="امکانات">
            <FeatureList features={features} />
          </Section>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        aria-haspopup="dialog"
        aria-label={`${custom ? 'ساخت پلن اختصاصی' : 'مشاهده پیش‌فاکتور'} ${plan.name}`}
        className={`mt-6 ${custom ? secondaryButtonClass : primaryButtonClass}`}
      >
        {custom ? 'ساخت پلن اختصاصی' : 'مشاهده پیش‌فاکتور'}
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
    </article>
  )
}

// مقدار مؤثر اشتراک: مقدار مؤثر حساب (override ادمین) ← snapshot لحظه‌ی خرید ← مقدار فعلی پلن
const effectiveLimits = (subscription, usage, reserved) => {
  const snapshot = subscription.limits_snapshot || {}
  return (subscription.plan?.limits || []).map((limit) => {
    const live = !reserved ? usage[limit.key] : null
    if (live && live.value !== undefined) return { ...limit, value: live.value }
    if (Object.prototype.hasOwnProperty.call(snapshot, limit.key)) return { ...limit, value: snapshot[limit.key] }
    return limit
  })
}

const effectiveFeatures = (subscription) => {
  const snapshot = subscription.features_snapshot || {}
  return onlyPlanFeatures(subscription.plan?.features).map((feature) => (
    snapshot[feature.key] ? { ...feature, enabled: Boolean(snapshot[feature.key].enabled) } : feature
  ))
}

const daysLeft = (iso) => {
  const diff = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  return Math.max(0, Math.ceil(diff / 86400000))
}

/**
 * کارت اشتراک (فعال یا رزروشده) در داشبورد.
 * subscription: خروجی SubscriptionSerializer — usage: me.limits (برای نوار مصرف).
 */
export function SubscriptionPlanCard({ subscription, reserved = false, usage = {} }) {
  const plan = subscription.plan || {}
  const customSnapshot = subscription.custom_plan_snapshot || {}
  const customTitle = customSnapshot.free_trial ? null : customSnapshot.plan_kind === 'webinar' ? 'وبینار اختصاصی' : customSnapshot.plan_kind === 'class' ? 'کلاس آموزشی اختصاصی' : customSnapshot.users ? 'پلن اختصاصی' : null
  const uid = `sub-${subscription.id}`
  const manualReserved = subscription.status === 'reserved'
  const remaining = reserved ? null : daysLeft(subscription.expires_at)
  const limits = effectiveLimits(subscription, usage, reserved)
  const features = effectiveFeatures(subscription)
  const date = (iso) => (iso ? formatIsoJalali(iso) : '—')
  return (
    <article aria-labelledby={`${uid}-title`} className="rounded-2xl border border-[#e5eaf2] bg-white p-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] font-bold text-[#3d66e8]">{customTitle || plan.plan_type?.name || 'پلن'}</p>
          <h3 id={`${uid}-title`} className="mt-1 text-xl font-extrabold leading-8 text-[#101827]">{customTitle || plan.name || 'پلن'}</h3>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${reserved ? 'bg-[#edf2ff] text-[#3d66e8]' : 'bg-[#dcf6ec] text-[#0b5f47]'}`}>
          {reserved ? <CalendarClock size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {reserved ? 'رزروشده · شروع در آینده' : 'فعال'}
        </span>
      </header>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#f3f6fc] p-3.5">
          <dt className="text-[13px] text-[#46536b]">شروع</dt>
          <dd className="mt-1 text-sm font-extrabold text-[#101827]">{manualReserved ? 'پس از انتخاب شما' : date(subscription.starts_at)}</dd>
        </div>
        <div className="rounded-xl bg-[#f3f6fc] p-3.5">
          <dt className="text-[13px] text-[#46536b]">پایان</dt>
          <dd className="mt-1 text-sm font-extrabold text-[#101827]">{manualReserved ? 'پس از شروع محاسبه می‌شود' : date(subscription.expires_at)}</dd>
        </div>
        {!reserved && remaining != null && (
          <div className="rounded-xl bg-[#f3f6fc] p-3.5">
            <dt className="text-[13px] text-[#46536b]">زمان باقی‌مانده</dt>
            <dd className="mt-1 text-sm font-extrabold text-[#101827]">{remaining === 0 ? 'کمتر از یک روز' : `${fa(remaining)} روز`}</dd>
          </div>
        )}
      </dl>

      {plan.description && !reserved && <p className="mt-4 text-sm leading-7 text-[#46536b]">{plan.description}</p>}

      <div className="mt-5 space-y-5">
        {limits.length > 0 && (
          <Section id={`${uid}-limits`} title={reserved ? 'محدودیت‌های این اشتراک' : 'مصرف و محدودیت‌ها'}>
            <LimitList limits={limits} usage={reserved ? {} : usage} />
          </Section>
        )}
        {features.length > 0 && (
          <Section id={`${uid}-features`} title="امکانات">
            <FeatureList features={features} />
          </Section>
        )}
      </div>
    </article>
  )
}
