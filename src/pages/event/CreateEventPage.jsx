import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowLeft, GraduationCap, Presentation, CalendarDays, Users, ShieldCheck, PenTool, MessageCircle, ScreenShare, Video, Hand, ClipboardCheck, Mic, Check, Loader2, Settings2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { JalaliDateTimePicker } from '../../components/ui/JalaliDateTimePicker'
import { roomsService } from '../../services/rooms'

const FEATURE_META = {
  chat: { title: 'گفت‌وگوی متنی', hint: 'امکان ارسال پیام در اتاق', icon: MessageCircle, kinds: ['class', 'seminar'] },
  participants_list: { title: 'فهرست شرکت‌کنندگان', hint: 'نمایش افراد حاضر در جلسه', icon: Users, kinds: ['class', 'seminar'] },
  screen_share: { title: 'اشتراک‌گذاری صفحه', hint: 'ارائه محتوا و نمایش صفحه', icon: ScreenShare, kinds: ['class', 'seminar'] },
  recording: { title: 'ضبط جلسه', hint: 'امکان ضبط جلسه', icon: Video, kinds: ['class', 'seminar'] },
  speak_permission: { title: 'مدیریت دسترسی میکروفون و دوربین', hint: 'کنترل باز شدن میکروفون و دوربین شرکت‌کنندگان', icon: Mic, kinds: ['class', 'seminar'] },
  raise_hand: { title: 'دست بلند کردن', hint: 'ارسال درخواست صحبت و مدیریت صف', icon: Hand, kinds: ['class', 'seminar'] },
  attendance: { title: 'حضور و غیاب', hint: 'ثبت وضعیت حضور شرکت‌کنندگان', icon: ClipboardCheck, kinds: ['class', 'seminar'] },
  documents: { title: 'اشتراک فایل در کلاس', hint: 'نمایش عکس، PDF، Word و PowerPoint داخل خود کلاس و نوشتن روی آن', icon: FileText, kinds: ['class'] },
  whiteboard: { title: 'تخته تعاملی', hint: 'فضای نوشتن و ترسیم هم‌زمان؛ مخصوص کلاس آموزشی', icon: PenTool, kinds: ['class'] },
}

const STEPS = ['نوع رویداد', 'اطلاعات اصلی', 'امکانات جلسه', 'بازبینی']

function slugify(value) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-')
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState('')
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('100')
  const [isPrivate, setIsPrivate] = useState(false)
  const [configureFeatures, setConfigureFeatures] = useState(true)
  const [featureDraft, setFeatureDraft] = useState({})
  const { data: accountFeatures = [], isLoading: featuresLoading, isError: featuresError } = useQuery({
    queryKey: ['account-features'],
    queryFn: () => roomsService.accountFeatures().then((response) => response.data),
    enabled: step >= 2,
  })

  const availableFeatures = useMemo(
    () => accountFeatures.filter((feature) => FEATURE_META[feature.key] && FEATURE_META[feature.key].kinds.includes(kind)),
    [accountFeatures, kind],
  )

  function chooseKind(value) {
    setKind(value)
    setStep(1)
  }

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
    return featureDraft[feature.key]?.enabled ?? Boolean(feature.configured_enabled)
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error('عنوان رویداد را وارد کنید'); setStep(1); return }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) { toast.error('شناسه لینک معتبر نیست'); setStep(1); return }
    const capacity = Number(maxParticipants)
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) { toast.error('ظرفیت باید بین ۲ تا ۵۰۰ نفر باشد'); setStep(1); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description,
        ...(kind === 'class' ? { teacher_name: teacherName.trim() } : {}),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        max_participants: capacity,
        is_private: isPrivate,
        // Backend currently distinguishes classroom from ordinary meeting.
        kind: kind === 'class' ? 'class' : 'meeting',
      }
      const response = await roomsService.create(payload)
      const room = response.data

      await queryClient.invalidateQueries({ queryKey: ['rooms'] })
      if (configureFeatures) {
        try {
          const updates = availableFeatures.map((feature) => {
            const draft = featureDraft[feature.key] || {}
            const enabled = draft.enabled ?? Boolean(feature.configured_enabled)
            const settings = { ...(feature.settings || {}), ...(draft.settings || {}) }
            return roomsService.updateAccountFeature(feature.key, { enabled, settings })
          })
          await Promise.all(updates)
          if (kind === 'class') {
            const whiteboard = availableFeatures.find((item) => item.key === 'whiteboard')
            const whiteboardEnabled = whiteboard ? isFeatureEnabled(whiteboard) : false
            await roomsService.updateRoomFeature(room.slug, 'whiteboard', { mode: whiteboardEnabled ? 'enabled' : 'disabled' })
          }
          await queryClient.invalidateQueries({ queryKey: ['account-features'] })
          toast.success('رویداد و تنظیمات آن با موفقیت ذخیره شد')
        } catch {
          await queryClient.invalidateQueries({ queryKey: ['account-features'] })
          toast.error('رویداد ساخته شد، اما ذخیره بعضی تنظیمات ناموفق بود؛ می‌توانید آن‌ها را بعداً تنظیم کنید.')
        }
      } else {
        toast.success('رویداد با موفقیت ایجاد شد')
      }
      navigate(`/join/${room.slug}`)
    } catch (error) {
      const detail = error.response?.data?.detail
      toast.error(detail || (error.response?.data?.slug ? 'این شناسه قبلاً استفاده شده است' : 'ایجاد رویداد با خطا مواجه شد'))
    } finally {
      setSaving(false)
    }
  }

  const selectedKind = kind === 'class'
    ? { title: 'کلاس آموزشی', description: 'برای آموزش تعاملی، مدیریت کلاس و حضور و غیاب', icon: GraduationCap }
    : { title: 'سمینار', description: 'برای ارائه، وبینار و ارتباط با مخاطبان', icon: Presentation }

  return (
    <div className="min-h-full bg-[#f4f7fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8d98aa] transition hover:bg-[#edf2ff] hover:text-[#4f7cff]">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#101827]">ساخت رویداد جدید</h1>
            <p className="mt-1 text-sm text-[#8d98aa]">نوع رویداد را انتخاب کنید و مرحله‌به‌مرحله آن را بسازید.</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#536074]">مرحله {step + 1} از {STEPS.length}</span>
            <span className="text-xs text-[#8d98aa]">{STEPS[step]}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
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
            <section>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-[#101827]">چه نوع رویدادی می‌خواهید بسازید؟</h2>
                <p className="mt-2 text-sm text-[#8d98aa]">با انتخاب نوع رویداد، تنظیمات مناسب همان تجربه نمایش داده می‌شود.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { value: 'class', title: 'کلاس آموزشی', text: 'برای تدریس و یادگیری تعاملی', hint: 'تخته تعاملی، حضور و غیاب و مدیریت مشارکت', Icon: GraduationCap, tint: 'bg-[#edf2ff] text-[#4f7cff]' },
                  { value: 'seminar', title: 'سمینار', text: 'برای وبینار، ارائه و رویدادهای آنلاین', hint: 'ارائه محتوا و ارتباط با شرکت‌کنندگان', Icon: Presentation, tint: 'bg-[#e8faf4] text-[#2eaf89]' },
                ].map(({ value, title: cardTitle, text, hint, Icon, tint }) => (
                  <button key={value} type="button" onClick={() => chooseKind(value)} className={`group relative isolate min-h-[260px] overflow-hidden rounded-3xl border p-5 text-right transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(30,55,100,.14)] focus:outline-none focus:ring-2 focus:ring-[#4f7cff]/25 sm:p-6 ${value === 'class' ? 'border-[#cbd8ff] bg-gradient-to-br from-[#f1f5ff] via-white to-[#e7edff] hover:border-[#9db4ff]' : 'border-[#bfeadd] bg-gradient-to-br from-[#eafaf4] via-white to-[#dcf6ec] hover:border-[#8ed9bd]'}`}>
                    <span aria-hidden="true" className={`pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full opacity-60 blur-2xl transition duration-500 group-hover:scale-125 ${value === 'class' ? 'bg-[#cbd8ff]' : 'bg-[#b8eed9]'}`} />
                    <span aria-hidden="true" className={`pointer-events-none absolute -bottom-12 right-24 h-32 w-32 rounded-full border-[18px] opacity-30 ${value === 'class' ? 'border-[#9eb5ff]' : 'border-[#8ed9bd]'}`} />
                    <span className={`relative mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[26px] shadow-lg ring-1 ring-white/80 ${value === 'class' ? 'bg-gradient-to-br from-[#668cff] to-[#4568d9] text-white shadow-[#668cff]/25' : 'bg-gradient-to-br from-[#45c99a] to-[#229c78] text-white shadow-[#45c99a]/25'}`}><Icon className="h-9 w-9" strokeWidth={1.8} /></span>
                    <span className="relative block text-xl font-extrabold text-[#101827]">{cardTitle}</span>
                    <span className="relative mt-2 block text-sm leading-6 text-[#536074]">{text}</span>
                    <span className="relative mt-4 block max-w-[90%] text-xs leading-6 text-[#7c899d]">{hint}</span>
                    <span className={`relative mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md transition group-hover:gap-3 ${value === 'class' ? 'bg-[#4f70df] shadow-[#4f70df]/20' : 'bg-[#2da982] shadow-[#2da982]/20'}`}>انتخاب و ادامه <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <div className="mb-2 flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${kind === 'class' ? 'bg-[#edf2ff] text-[#4f7cff]' : 'bg-[#e8faf4] text-[#2eaf89]'}`}>{kind === 'class' ? <GraduationCap className="h-5 w-5" /> : <Presentation className="h-5 w-5" />}</span>
                <div><h2 className="font-bold text-[#101827]">اطلاعات {selectedKind.title}</h2><p className="mt-1 text-xs text-[#8d98aa]">{selectedKind.description}</p></div>
              </div>
              <Input label="عنوان رویداد" placeholder={kind === 'class' ? 'مثلاً آموزش طراحی رابط کاربری' : 'مثلاً سمینار تحول دیجیتال'} value={title} onChange={(event) => { setTitle(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)) }} className="meet-auth-input" />
              <div>
                <Input label="شناسه رویداد (لینک)" placeholder="project-management" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)) }} className="meet-auth-input" />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <JalaliDateTimePicker label="تاریخ و ساعت برگزاری (اختیاری)" value={scheduledAt} onChange={setScheduledAt} />
                <Input label="حداکثر شرکت‌کنندگان" type="number" min="2" max="500" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} className="meet-auth-input" />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5eaf2] bg-[#f8faff] p-4">
                <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} className="h-4 w-4 accent-[#4f7cff]" />
                <span className="text-sm text-[#536074]">رویداد خصوصی <span className="text-xs text-[#9aa4b4]">(فقط با لینک مستقیم)</span></span>
              </label>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Settings2 className="h-5 w-5" /></span>
                <div><h2 className="font-bold text-[#101827]">امکانات و تنظیمات جلسه</h2><p className="mt-1 text-xs text-[#8d98aa]">امکانات موردنیاز را فعال کنید؛ می‌توانید این مرحله را رد کنید و بعداً از تنظیمات حساب تغییر دهید.</p></div>
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
                  {availableFeatures.map((feature) => {
                    const meta = FEATURE_META[feature.key]
                    const Icon = meta.icon
                    const enabled = isFeatureEnabled(feature)
                    return (
                      <div key={feature.key} className="rounded-xl border border-[#e5eaf2] p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input type="checkbox" checked={enabled} onChange={(event) => toggleFeature(feature.key, event.target.checked)} className="mt-1 h-4 w-4 accent-[#4f7cff]" />
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Icon className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#101827]">{meta.title}</span><span className="mt-1 block text-xs leading-5 text-[#8d98aa]">{meta.hint}</span></span>
                          {enabled && <Check className="h-4 w-4 text-[#2eaf89]" />}
                        </label>
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

          {step === 3 && (
            <section>
              <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8faf4] text-[#2eaf89]"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-[#101827]">بازبینی و ساخت رویداد</h2><p className="mt-1 text-xs text-[#8d98aa]">قبل از ساخت، اطلاعات را بررسی کنید.</p></div></div>
              <div className="divide-y divide-[#eef1f5] rounded-xl border border-[#e5eaf2] px-4">
                {[
                  ['نوع رویداد', selectedKind.title],
                  ['عنوان', title || '—'],
                  ['شناسه لینک', slug || '—'],
                  ['ظرفیت', `${maxParticipants} نفر`],
                  ['دسترسی', isPrivate ? 'خصوصی' : 'با لینک'],
                  ['امکانات', configureFeatures ? 'تنظیم در این مرحله' : 'رد شده؛ تنظیم بعداً'],
                ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-[#8d98aa]">{label}</span><span className="text-left font-medium text-[#101827]">{value}</span></div>)}
              </div>
              <div className="mt-5 rounded-2xl border border-[#e5eaf2] bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold text-[#101827]">خلاصه امکانات و تنظیمات</h3><p className="mt-1 text-xs text-[#8d98aa]">وضعیتی که برای این رویداد انتخاب کرده‌اید</p></div>
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
                      const meta = FEATURE_META[feature.key]
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
              <p className="mt-4 rounded-xl bg-[#f8faff] p-4 text-xs leading-6 text-[#68758a]"><CalendarDays className="ml-1 inline h-4 w-4 text-[#4f7cff]" /> پس از ساخت، لینک ورود رویداد در اختیار شما قرار می‌گیرد و می‌توانید آن را با شرکت‌کنندگان به اشتراک بگذارید.</p>
            </section>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#eef1f5] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}><ArrowRight className="ml-1 h-4 w-4" /> قبلی</Button>}
              <Link to="/dashboard"><Button type="button" variant="ghost">انصراف</Button></Link>
            </div>
            {
              step === 0 ?
                  ''
                      :
              (step < 3 ) ? (
              <Button type="button" size="lg" disabled={step === 2 && configureFeatures && featuresLoading} onClick={() => {
                if (step === 1) {
                  if (!title.trim()) { toast.error('عنوان رویداد الزامی است'); return }
                  if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) { toast.error('شناسه لینک معتبر نیست'); return }
                  if (Number(maxParticipants) < 2 || Number(maxParticipants) > 500) { toast.error('ظرفیت باید بین ۲ تا ۵۰۰ نفر باشد'); return }
                }
                if (step === 2 && configureFeatures && featuresError) { setConfigureFeatures(false) }
                setStep((current) => current + 1)
              }}>ادامه <ArrowLeft className="mr-1 h-4 w-4" /></Button>
            ) : (
              <Button type="button" size="lg" loading={saving} disabled={saving} onClick={handleCreate}><Check className="ml-1 h-4 w-4" /> ساخت {selectedKind.title}</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
