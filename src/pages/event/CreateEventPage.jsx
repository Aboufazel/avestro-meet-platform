import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowLeft, CalendarDays, ShieldCheck, GraduationCap, PenTool, Hand, ClipboardCheck, Mic, Check, Loader2, Settings2, FileText, Sparkles, Lock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { JalaliDateTimePicker } from '../../components/ui/JalaliDateTimePicker'
import { roomsService } from '../../services/rooms'
import { paymentsService } from '../../services/payments'
import { RoomAccessSettings } from '../../components/shared/RoomAccessSettings'
import { readRoomBudget, budgetHint, faNumber } from '../../utils/roomBudget'

const FEATURE_META = {
  whiteboard: { title: 'تخته تعاملی', hint: 'نوشتن و ترسیم هم‌زمان روی یک فضای مشترک', icon: PenTool },
  documents: { title: 'اشتراک فایل در کلاس', hint: 'نمایش و بررسی فایل‌های آموزشی در محیط کلاس', icon: FileText },
  speak_permission: { title: 'کنترل اجازه صحبت و تصویر', hint: 'مدیریت دسترسی شرکت‌کنندگان به میکروفون و دوربین', icon: Mic },
  raise_hand: { title: 'بلندکردن دست', hint: 'ارسال درخواست صحبت و مدیریت مشارکت‌کنندگان', icon: Hand },
  attendance: { title: 'حضور و غیاب', hint: 'ثبت و پیگیری وضعیت حضور شرکت‌کنندگان', icon: ClipboardCheck },
}

const FEATURE_ORDER = ['whiteboard', 'documents', 'speak_permission', 'raise_hand', 'attendance']
const STEPS = ['اطلاعات اصلی', 'امکانات کلاس', 'بازبینی']

function slugify(value) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-')
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  // نوع اتاق در این جریان ثابت است؛ انتخاب نوع رویداد دیگر مرحله‌ای از فرم نیست.
  const kind = 'class'
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('100')
  const [allocatedVideoStreams, setAllocatedVideoStreams] = useState('1')
  const { data: subscriptionInfo, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => paymentsService.me().then((response) => response.data),
  })
  const activeSubscription = subscriptionInfo?.active
  // بودجه‌ی پلن: سقف هر اتاق = باقی‌مانده‌ی کاربر/تصویر پلن (مجموع اتاق‌ها از پلن بیشتر نمی‌شود). null = نامحدود.
  const budget = readRoomBudget(subscriptionInfo)
  const participantLimit = budget.usersRemaining
  const imageLimit = budget.imagesRemaining
  const budgetExhausted = Boolean(activeSubscription) && ((participantLimit != null && participantLimit < 2) || (imageLimit != null && imageLimit < 1))
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowGuests, setAllowGuests] = useState(true)
  const [invitedPeople, setInvitedPeople] = useState([])
  const [configureFeatures, setConfigureFeatures] = useState(true)
  const [featureDraft, setFeatureDraft] = useState({})
  useEffect(() => {
    if (participantLimit != null) {
      setMaxParticipants((current) => {
        const value = Number(current)
        if (Number.isInteger(value) && value >= 2 && value <= participantLimit) return current
        return String(Math.max(2, participantLimit))
      })
    }
  }, [participantLimit])

  const { data: accountFeatures = [], isLoading: featuresLoading, isError: featuresError } = useQuery({
    queryKey: ['account-features'],
    queryFn: () => roomsService.accountFeatures().then((response) => response.data),
    enabled: step >= 1,
  })

  // پاسخ سرویس ممکن است آرایه‌ی مستقیم یا شیء دارای features/results باشد.
  // این مرحله فقط بر اساس کلیدهای موردنیاز کاربر رندر می‌شود؛ applies_to و نوع رویداد فیلتر نمی‌شوند.
  const featurePayload = accountFeatures?.data ?? accountFeatures
  const featureSource = Array.isArray(featurePayload)
    ? featurePayload
    : Array.isArray(featurePayload?.features)
      ? featurePayload.features
      : Array.isArray(featurePayload?.results)
        ? featurePayload.results
        : []

  const availableFeatures = useMemo(() => {
    const byKey = new Map(featureSource.filter(Boolean).map((feature) => [feature.key, feature]))
    return FEATURE_ORDER.map((key) => byKey.get(key)).filter(Boolean)
  }, [featureSource])

  function toggleFeature(key, enabled) {
    setFeatureDraft((current) => ({ ...current, [key]: { ...(current[key] || {}), enabled } }))
  }

  function updateFeatureSetting(key, name, value, feature) {
    setFeatureDraft((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        settings: { ...(current[key]?.settings || feature.settings || {}), [name]: value },
      },
    }))
  }

  function isFeatureEnabled(feature) {
    if (feature.reason === 'not_in_plan') return false
    return featureDraft[feature.key]?.enabled ?? Boolean(feature.enabled)
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error('عنوان کلاس را وارد کنید'); setStep(0); return }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) { toast.error('شناسه لینک معتبر نیست'); setStep(0); return }
    const capacity = Number(maxParticipants)
    if (!Number.isInteger(capacity) || capacity < 2 || (participantLimit != null && capacity > participantLimit)) { toast.error(participantLimit != null ? `ظرفیت باید بین ۲ تا ${faNumber(participantLimit)} نفر باشد (باقی‌مانده‌ی پلن)` : 'ظرفیت باید حداقل ۲ نفر باشد'); setStep(0); return }

    const imageAllocation = Number(allocatedVideoStreams)
    if (!Number.isInteger(imageAllocation) || imageAllocation < 1 || (imageLimit != null && imageAllocation > imageLimit)) { toast.error(imageLimit != null ? `سهم تصاویر باید بین ۱ تا ${faNumber(imageLimit)} باشد (باقی‌مانده‌ی پلن)` : 'سهم تصاویر باید حداقل ۱ باشد'); setStep(0); return }
    if (!allowGuests && invitedPeople.length === 0) { toast.error('با غیرفعال‌بودن ورود مهمان، حداقل یک نفر را برای جلسه انتخاب کنید'); setStep(0); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description,
        ...(kind === 'class' ? { teacher_name: teacherName.trim() } : {}),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        max_participants: capacity,
        allocated_video_streams: imageAllocation,
        feature_selection: configureFeatures ? Object.fromEntries(availableFeatures.filter((feature) => feature.reason !== 'not_in_plan').map((feature) => [feature.key, { enabled: isFeatureEnabled(feature), settings: { ...(feature.settings || {}), ...(featureDraft[feature.key]?.settings || {}) } }])) : {},
        is_private: isPrivate,
        allow_guests: allowGuests,
        invited_people: invitedPeople,
        // Backend currently distinguishes classroom from ordinary meeting.
        kind,
      }
      const response = await roomsService.create(payload)
      const room = response.data

      await queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('اتاق و تنظیمات اختصاصی آن با موفقیت ذخیره شد')
      await queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      navigate(`/join/${room.slug}`)
    } catch (error) {
      const data = error.response?.data
      const detail = data?.detail || data?.max_participants?.[0] || data?.allocated_video_streams?.[0]
      toast.error(detail || (data?.slug ? 'این شناسه قبلاً استفاده شده است' : 'ایجاد رویداد با خطا مواجه شد'))
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
    } finally {
      setSaving(false)
    }
  }

  const selectedKind = { title: 'کلاس آموزشی', text: 'اطلاعات کلاس و امکانات آموزشی را تنظیم کنید' }

  if (subscriptionLoading) return <div className="min-h-full p-6 flex justify-center items-center"><Card className="!p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#4f7cff]"/><p className="mt-3 text-sm text-[#68758a]">در حال بررسی اشتراک شما…</p></Card></div>
  if (!activeSubscription) return <div className="min-h-full p-4 sm:p-8 flex items-center justify-center"><Card className="!p-6 sm:!p-10 max-w-lg text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#4f7cff]"/><h1 className="mt-4 text-xl font-bold text-[#101827]">برای ساخت جلسه به اشتراک فعال نیاز دارید</h1><p className="mt-2 text-sm leading-7 text-[#68758a]">جلسات و لینک‌های قبلی شما باقی می‌مانند؛ برای ساخت کلاس جدید، ابتدا یک پلن انتخاب کنید.</p><Link to="/pricing" className="meet-primary-btn inline-flex mt-5 rounded-xl px-5 py-3 text-sm">مشاهده تعرفه‌ها</Link></Card></div>


  return (
    <div className="min-h-full bg-[#f4f7fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8d98aa] transition hover:bg-[#edf2ff] hover:text-[#4f7cff]">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#101827]">ساخت کلاس جدید</h1>
            <p className="mt-1 text-sm text-[#8d98aa]">اطلاعات کلاس را وارد کنید و امکانات موردنیاز را تنظیم کنید.</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#536074]">مرحله {step + 1} از {STEPS.length}</span>
            <span className="text-xs text-[#8d98aa]">{STEPS[step]}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((label, index) => (
              <div key={label} className="min-w-0">
                <div className={`h-1.5 rounded-full ${index <= step ? 'bg-[#4f7cff]' : 'bg-[#e9edf4]'}`} />
                <p className={`mt-2 truncate text-[10px] sm:text-xs ${index === step ? 'font-bold text-[#4f7cff]' : 'text-[#9aa4b4]'}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="!p-5 sm:!p-8">
          {step === 0 && (
            <section className="space-y-5">
              <div className="mb-2 flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${kind === 'class' ? 'bg-[#edf2ff] text-[#4f7cff]' : 'bg-[#e8faf4] text-[#2eaf89]'}`}><GraduationCap className="h-5 w-5" /></span>
                <div><h2 className="font-bold text-[#101827]">اطلاعات کلاس آموزشی</h2><p className="mt-1 text-xs text-[#8d98aa]">{selectedKind.text}</p></div>
              </div>
              <Input label="عنوان کلاس" placeholder='مثلاً آموزش طراحی رابط کاربری' value={title} onChange={(event) => { setTitle(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)) }} className="meet-auth-input" />
              <div>
                <Input label="شناسه کلاس (لینک)" placeholder="project-management" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)) }} className="meet-auth-input" />
                <p className="mt-1.5 text-xs text-[#8d98aa]">لینک ورود: meet.avestro.ir/join/{slug || 'your-event'}</p>
              </div>
              {kind === 'class' && (
                <div>
                  <Input label="نام معلم (اختیاری)" placeholder="مثلاً خانم احمدی" value={teacherName} maxLength={150} onChange={(event) => setTeacherName(event.target.value)} className="meet-auth-input" />
                  <p className="mt-1.5 text-xs text-[#8d98aa]">در گزارش حضور و غیاب نمایش داده می‌شود. اگر خالی بماند، نام صاحب حساب نوشته می‌شود.</p>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#536074]">توضیحات (اختیاری)</label>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="توضیح کوتاهی درباره رویداد..." className="w-full resize-none rounded-xl border border-[#e1e6ef] bg-[#f8faff] px-4 py-3 text-sm text-[#101827] outline-none transition focus:border-[#9eb6ff] focus:ring-2 focus:ring-[#4f7cff]/15" />
              </div>
              {budgetExhausted && (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                  سهم کاربران یا تصاویر پلن شما تمام شده است و اتاق جدید نمی‌توان ساخت. برای آزادشدن سهم، <Link to="/dashboard/rooms" className="font-bold underline">یک اتاق را حذف</Link> یا ظرفیت اتاقی را کم کنید.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <JalaliDateTimePicker label="تاریخ و ساعت برگزاری (اختیاری)" value={scheduledAt} onChange={setScheduledAt} />
                <Input label="حداکثر شرکت‌کنندگان" type="number" min="2" max={participantLimit ?? undefined} value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} className="meet-auth-input" />
                <Input label="سهم تصاویر هم‌زمان این اتاق" type="number" min="1" max={imageLimit ?? undefined} value={allocatedVideoStreams} onChange={(event) => setAllocatedVideoStreams(event.target.value)} className="meet-auth-input" />
              </div>
              <div className="space-y-1 text-xs leading-6 text-[#8d98aa]">
                <p>{budgetHint({ total: budget.usersTotal, used: budget.usersUsed, remaining: budget.usersRemaining, unit: 'نفر' })}</p>
                <p>{budgetHint({ total: budget.imagesTotal, used: budget.imagesUsed, remaining: budget.imagesRemaining, unit: 'تصویر' })}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5eaf2] bg-[#f8faff] p-4">
                <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} className="h-4 w-4 accent-[#4f7cff]" />
                <span className="text-sm text-[#536074]">کلاس خصوصی <span className="text-xs text-[#9aa4b4]">(فقط با لینک مستقیم)</span></span>
              </label>
              <RoomAccessSettings allowGuests={allowGuests} onAllowGuests={setAllowGuests} selected={invitedPeople} onSelected={setInvitedPeople} />
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Settings2 className="h-5 w-5" /></span>
                <div><h2 className="font-bold text-[#101827]">امکانات و تنظیمات کلاس</h2><p className="mt-1 text-xs text-[#8d98aa]">فقط پنج قابلیت آموزشی مرتبط نمایش داده شده‌اند. وضعیت هر قابلیت مطابق پاسخ سرویس و پلن حساب شماست.</p></div>
              </div>
              <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfe7f5] bg-[#f8faff] p-4">
                <input type="checkbox" checked={configureFeatures} onChange={(event) => setConfigureFeatures(event.target.checked)} className="mt-1 h-4 w-4 accent-[#4f7cff]" />
                <span><span className="block text-sm font-semibold text-[#101827]">تنظیم امکانات در همین مرحله</span><span className="mt-1 block text-xs leading-5 text-[#8d98aa]">در صورت غیرفعال کردن، رویداد با تنظیمات فعلی حساب ساخته می‌شود و می‌توانید بعداً آن‌ها را تغییر دهید.</span></span>
              </label>
              {!configureFeatures ? (
                <div className="rounded-xl border border-dashed border-[#dce3ef] p-6 text-center text-sm text-[#8d98aa]">تنظیمات این مرحله رد می‌شود و بعداً قابل انجام است.</div>
              ) : featuresLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8d98aa]"><Loader2 className="h-4 w-4 animate-spin" /> در حال دریافت امکانات حساب…</div>
              ) : featuresError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">دریافت تنظیمات با خطا مواجه شد. می‌توانید این مرحله را رد کنید و بعداً از تنظیمات حساب انجام دهید.</div>
              ) : (
                <div className="space-y-3">
                  {availableFeatures.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#dce3ef] p-6 text-center text-sm leading-7 text-[#68758a]">پاسخ سرویس دریافت شد، اما هیچ‌کدام از پنج قابلیت موردنیاز در فهرست آن وجود ندارد. کلیدهای whiteboard، documents، speak_permission، raise_hand و attendance را در پاسخ API بررسی کنید.</div>
                  )}
                  {availableFeatures.map((feature) => {
                    const meta = FEATURE_META[feature.key] || { title: feature.title, hint: 'این امکان بر اساس پلن و تنظیمات حساب قابل مدیریت است.', icon: Sparkles }
                    const Icon = meta.icon
                    const enabled = isFeatureEnabled(feature)
                    const locked = feature.reason === 'not_in_plan'
                    return (
                      <div key={feature.key} className={`group rounded-2xl border p-4 sm:p-5 transition-all ${enabled ? 'border-[#cfe9df] bg-gradient-to-l from-[#f0fbf6] to-white shadow-[0_8px_24px_rgba(35,155,114,.06)]' : locked ? 'border-[#e8eaf0] bg-[#fafbfe]' : 'border-[#e5eaf2] bg-white hover:border-[#cbd8ff] hover:shadow-sm'}`}>
                        <div className="flex items-start gap-3">
                          <input id={`feature-${feature.key}`} type="checkbox" checked={enabled} disabled={locked} onChange={(event) => toggleFeature(feature.key, event.target.checked)} className="mt-1 h-4 w-4 accent-[#4f7cff] disabled:opacity-40" />
                          <label htmlFor={`feature-${feature.key}`} className={`flex min-w-0 flex-1 items-start gap-3 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${enabled ? 'bg-[#def5eb] text-[#21966e]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}><Icon className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#101827]">{meta.title}{locked && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1 text-[10px] font-medium text-[#9b681b]"><Lock className="h-3 w-3" /> خارج از پلن</span>}</span><span className="mt-1 block text-xs leading-5 text-[#8d98aa]">{meta.hint}</span></span>
                          </label>
                          {enabled && <Check className="h-4 w-4 text-[#2eaf89]" />}
                        </div>
                        {locked && <Link to="/pricing" className="inline-block mr-7 mt-2 text-[11px] text-[#4f7cff] underline">مشاهده پلن‌های دارای این امکان</Link>}
                        {enabled && feature.key === 'whiteboard' && (
                          <label className="mt-3 mr-7 flex cursor-pointer items-center gap-2 rounded-lg bg-[#f8faff] p-3 text-xs text-[#536074]">
                            <input type="checkbox" checked={Boolean(featureDraft.whiteboard?.settings?.students_can_draw ?? feature.settings?.students_can_draw)} onChange={(event) => updateFeatureSetting('whiteboard', 'students_can_draw', event.target.checked, feature)} className="h-4 w-4 accent-[#4f7cff]" />
                            شرکت‌کنندگان بتوانند روی تخته بنویسند
                          </label>
                        )}
                        {enabled && feature.key === 'speak_permission' && (
                          <div className="mt-3 mr-7 grid gap-3 rounded-lg bg-[#f8faff] p-3 sm:grid-cols-2">
                            {[['audio_default', 'وضعیت اولیه میکروفون'], ['video_default', 'وضعیت اولیه دوربین']].map(([name, label]) => (
                              <label key={name} className="text-xs text-[#536074]">{label}
                                <select value={featureDraft.speak_permission?.settings?.[name] || feature.settings?.[name] || 'muted'} onChange={(event) => updateFeatureSetting('speak_permission', name, event.target.value, feature)} className="mt-1.5 w-full rounded-lg border border-[#dfe5ef] bg-white px-3 py-2 text-sm">
                                  <option value="muted">بسته (با اجازه مدیر باز شود)</option><option value="open">باز</option>
                                </select>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8faf4] text-[#2eaf89]"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-[#101827]">بازبینی و ساخت کلاس</h2><p className="mt-1 text-xs text-[#8d98aa]">قبل از ساخت، اطلاعات را بررسی کنید.</p></div></div>
              <div className="divide-y divide-[#eef1f5] rounded-xl border border-[#e5eaf2] px-4">
                {[
                  ['نوع اتاق', 'کلاس آموزشی'],
                  ['عنوان', title || '—'],
                  ['شناسه لینک', slug || '—'],
                  ['ظرفیت', `${maxParticipants} نفر`],
                  ['دسترسی', isPrivate ? 'خصوصی' : 'با لینک'],
                  ['ورود مهمان', allowGuests ? 'مجاز' : 'غیرمجاز (فقط با کد ملی)'],
                  ['افراد انتخاب‌شده', `${invitedPeople.length.toLocaleString('fa-IR')} نفر`],
                  ['امکانات', configureFeatures ? 'تنظیم در این مرحله' : 'رد شده؛ تنظیم بعداً'],
                ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-[#8d98aa]">{label}</span><span className="text-left font-medium text-[#101827]">{value}</span></div>)}
              </div>
              <div className="mt-5 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold text-[#101827]">خلاصه امکانات و تنظیمات</h3><p className="mt-1 text-xs text-[#8d98aa]">وضعیتی که برای این کلاس انتخاب کرده‌اید</p></div>
                  <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-[11px] font-semibold text-[#4f7cff]">مرحله ۳</span>
                </div>
                {!configureFeatures ? (
                  <div className="rounded-xl bg-[#f8faff] px-4 py-3 text-sm leading-6 text-[#68758a]">از تنظیم امکانات صرف‌نظر کرده‌اید؛ می‌توانید بعداً از بخش تنظیمات حساب آن‌ها را انجام دهید.</div>
                ) : featuresLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-[#8d98aa]"><Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری خلاصه تنظیمات…</div>
                ) : featuresError ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">امکان دریافت خلاصه تنظیمات وجود ندارد؛ می‌توانید پس از ساخت، آن‌ها را از تنظیمات حساب بررسی کنید.</p>
                ) : (
                  <div className="space-y-2">
                    {availableFeatures.map((feature) => {
                      const meta = FEATURE_META[feature.key] || { title: feature.title, hint: 'امکان قابل مدیریت در این حساب', icon: Sparkles }
                      const Icon = meta.icon
                      const enabled = isFeatureEnabled(feature)
                      return (
                        <div key={feature.key} className="flex items-start gap-3 rounded-xl bg-[#f8faff] px-3 py-3">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-[#e7f8f1] text-[#239b72]' : 'bg-[#edf0f5] text-[#9aa4b4]'}`}><Icon className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-[#253247]">{meta.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enabled ? 'bg-[#e7f8f1] text-[#239b72]' : 'bg-[#edf0f5] text-[#7d899b]'}`}>{enabled ? 'فعال' : 'غیرفعال'}</span></div>
                            {enabled && feature.key === 'whiteboard' && <p className="mt-1 text-[11px] text-[#7d899b]">نوشتن شرکت‌کنندگان: {(featureDraft.whiteboard?.settings?.students_can_draw ?? feature.settings?.students_can_draw) ? 'مجاز' : 'غیرفعال'}</p>}
                            {enabled && feature.key === 'speak_permission' && <p className="mt-1 text-[11px] text-[#7d899b]">میکروفون: {(featureDraft.speak_permission?.settings?.audio_default || feature.settings?.audio_default || 'muted') === 'open' ? 'باز' : 'بسته'} · دوربین: {(featureDraft.speak_permission?.settings?.video_default || feature.settings?.video_default || 'muted') === 'open' ? 'باز' : 'بسته'}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="mt-4 rounded-xl bg-[#f8faff] p-4 text-xs leading-6 text-[#68758a]"><CalendarDays className="ml-1 inline h-4 w-4 text-[#4f7cff]" /> پس از ساخت، لینک ورود کلاس در اختیار شما قرار می‌گیرد و می‌توانید آن را با شرکت‌کنندگان به اشتراک بگذارید.</p>
            </section>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#eef1f5] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}><ArrowRight className="ml-1 h-4 w-4" /> قبلی</Button>}
              <Link to="/dashboard"><Button type="button" variant="ghost">انصراف</Button></Link>
            </div>
            {
              (step < 2) ? (
              <Button type="button" size="lg" disabled={step === 1 && configureFeatures && featuresLoading} onClick={() => {
                if (step === 0) {
                  if (!title.trim()) { toast.error('عنوان کلاس الزامی است'); return }
                  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) { toast.error('شناسه لینک معتبر نیست'); return }
                  if (budgetExhausted) { toast.error('سهم کاربران یا تصاویر پلن تمام شده است'); return }
                  if (Number(maxParticipants) < 2 || (participantLimit != null && Number(maxParticipants) > participantLimit)) { toast.error('ظرفیت از باقی‌مانده‌ی پلن بیشتر است'); return }
                  if (Number(allocatedVideoStreams) < 1 || (imageLimit != null && Number(allocatedVideoStreams) > imageLimit)) { toast.error('سهم تصاویر از باقی‌مانده‌ی پلن بیشتر است'); return }
                }
                if (step === 1 && configureFeatures && featuresError) { setConfigureFeatures(false) }
                setStep((current) => current + 1)
              }}>ادامه <ArrowLeft className="mr-1 h-4 w-4" /></Button>
            ) : (
              <Button type="button" size="lg" loading={saving} disabled={saving} onClick={handleCreate}><Check className="ml-1 h-4 w-4" /> ساخت کلاس</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
