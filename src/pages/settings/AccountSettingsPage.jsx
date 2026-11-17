import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Loader2, Settings2, Check, Mic, Video, MessageCircle, Users, ScreenShare, Hand, ClipboardCheck, PenTool, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

import { roomsService } from '../../services/rooms'
import { isPlanFeature } from '../../constants/planFeatures'

const FEATURES = [
  { key: 'chat', hint: 'ارسال و دریافت پیام در اتاق', icon: MessageCircle, group: 'ارتباط' },
  { key: 'participants_list', hint: 'نمایش فهرست افراد حاضر در جلسه', icon: Users, group: 'ارتباط' },
  { key: 'screen_share', hint: 'اشتراک‌گذاری صفحه برای ارائه محتوا', icon: ScreenShare, group: 'ارتباط' },
  { key: 'recording', hint: 'ضبط جلسه برای مرور بعدی', icon: Video, group: 'مدیریت جلسه' },
  { key: 'speak_permission', hint: 'مدیریت اجازه‌ی استفاده از میکروفون و دوربین', icon: Mic, group: 'مدیریت جلسه' },
  { key: 'raise_hand', hint: 'مدیریت درخواست صحبت شرکت‌کنندگان', icon: Hand, group: 'مدیریت جلسه' },
  { key: 'attendance', hint: 'ثبت و پیگیری حضور افراد', icon: ClipboardCheck, group: 'مدیریت جلسه' },
  { key: 'whiteboard', hint: 'تخته‌ی تعاملی برای نوشتن و ترسیم', icon: PenTool, group: 'ابزار آموزشی' },
  { key: 'documents', hint: 'نمایش فایل‌های آموزشی داخل کلاس', icon: FileText, group: 'ابزار آموزشی' },
]

const MEDIA_DEFAULT_OPTIONS = [
  { value: 'muted', label: 'بسته؛ با اجازه باز شود' },
  { value: 'open', label: 'باز باشد' },
]
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'

export default function AccountSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['account-features'],
    queryFn: () => roomsService.accountFeatures().then((response) => response.data),
  })

  const mutation = useMutation({
    mutationFn: ({ key, payload }) => roomsService.updateAccountFeature(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-features'] })
      queryClient.invalidateQueries({ queryKey: ['room-features'] })
      toast.success('تنظیمات ذخیره شد')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'ذخیره‌ی تنظیمات ناموفق بود'),
  })

  const byKey = new Map((data || []).map((feature) => [feature.key, feature]))
  const rows = FEATURES.map((item) => ({ ...item, feature: byKey.get(item.key) })).filter((row) => row.feature)
  const groups = ['ارتباط', 'مدیریت جلسه', 'ابزار آموزشی']
    .map((name) => ({ name, items: rows.filter((row) => row.group === name) }))
    .filter((group) => group.items.length)
  const busy = mutation.isPending
  const setEnabled = (feature, enabled) => mutation.mutate({ key: feature.key, payload: { enabled } })
  const setSetting = (feature, name, value) =>
    mutation.mutate({ key: feature.key, payload: { settings: { ...feature.settings, [name]: value } } })

  return (
    <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-[1040px]">
        <header className="mb-5 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(20,35,65,.045)] sm:p-7">
          <div className="flex items-start gap-3">
            <Link to="/dashboard" aria-label="بازگشت به نمای کلی" className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fc] text-[#53627b] hover:bg-[#edf2ff] hover:text-[#3d66e8] ${focus}`}>
              <ArrowRight size={19} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-bold text-[#3d66e8]">شخصی‌سازی فضای کاری</p>
              <h1 className="text-xl font-extrabold text-[#101827] sm:text-2xl">تنظیمات حساب</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68758a]">امکانات پیش‌فرض اتاق‌های جدید را مشخص کنید. تنظیمات هر اتاق را هنگام ساخت یا ویرایش می‌توانید جداگانه تغییر دهید.</p>
            </div>
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff] sm:flex"><Settings2 size={21}/></span>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#dfe7f5] bg-[#f8faff] px-4 py-3">
          <p className="text-sm leading-6 text-[#46536b]">تغییر هر گزینه پس از ذخیره، برای اتاق‌های جدید اعمال می‌شود.</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f7a5c]"><Check size={15}/>ذخیره خودکار</span>
        </div>

        {isLoading && <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-[#e5eaf2] bg-white text-sm text-[#68758a]"><Loader2 className="h-5 w-5 animate-spin text-[#4f7cff]"/>در حال دریافت تنظیمات…</div>}
        {isError && <div role="alert" className="rounded-2xl border border-amber-200 bg-white p-5"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-amber-700"/><div><p className="font-bold text-[#101827]">تنظیمات دریافت نشد.</p><p className="mt-1 text-sm text-[#68758a]">اتصال را بررسی کنید و دوباره تلاش کنید.</p><button type="button" onClick={() => refetch()} className={`mt-3 min-h-10 rounded-xl bg-[#4f7cff] px-4 text-sm font-bold text-white ${focus}`}>تلاش دوباره</button></div></div></div>}

        {!isLoading && !isError && (rows.length ? <div className="space-y-5">
          {groups.map((group) => <section key={group.name} aria-labelledby={`settings-${group.name}`} className="rounded-[22px] border border-[#e5eaf2] bg-white p-4 shadow-[0_8px_24px_rgba(20,35,65,.035)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#eef1f5] pb-3">
              <h2 id={`settings-${group.name}`} className="text-base font-extrabold text-[#101827]">{group.name}</h2>
              <span className="rounded-full bg-[#f3f6fc] px-3 py-1 text-xs font-bold text-[#68758a]">{group.items.length.toLocaleString('fa-IR')} امکان</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map(({ feature, hint, icon: Icon }) => {
                const on = Boolean(feature.configured_enabled)
                const titleId = `feature-${feature.key}`
                return <article key={feature.key} className="rounded-2xl border border-[#edf0f5] bg-[#fcfdff] p-4 transition-colors hover:border-[#d7e1f5]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]"><Icon size={18}/></span>
                    <div className="min-w-0 flex-1">
                      <h3 id={titleId} className="text-sm font-bold text-[#101827]">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-[#68758a]">{hint}</p>
                    </div>
                    <label className="relative inline-flex min-h-11 shrink-0 cursor-pointer items-center" aria-label={`فعال‌سازی ${feature.title}`}>
                      <input type="checkbox" checked={on} disabled={busy} onChange={(event) => setEnabled(feature, event.target.checked)} aria-labelledby={titleId} className={`peer sr-only ${focus}`}/>
                      <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[#4f7cff]/25 ${on ? 'bg-[#4f7cff]' : 'bg-[#cbd4e2]'} after:absolute after:right-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform ${on ? 'after:-translate-x-5' : ''}`}/>
                      <span className="sr-only">{on ? 'فعال' : 'غیرفعال'}</span>
                    </label>
                  </div>
                  {on && feature.key === 'whiteboard' && <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#f4f7fc] px-3 text-xs leading-5 text-[#46536b]"><input type="checkbox" checked={Boolean(feature.settings?.students_can_draw)} disabled={busy} onChange={(event) => setSetting(feature, 'students_can_draw', event.target.checked)} className="h-4 w-4 accent-[#4f7cff]"/>دانش‌آموزان بتوانند روی تخته بنویسند</label>}
                  {on && feature.key === 'speak_permission' && <div className="mt-3 grid gap-3 rounded-xl bg-[#f4f7fc] p-3 sm:grid-cols-2">{[['audio_default', 'وضعیت اولیه‌ی میکروفون'], ['video_default', 'وضعیت اولیه‌ی دوربین']].map(([name, label]) => <div key={name}><label htmlFor={`setting-${name}`} className="mb-1.5 block text-xs font-semibold text-[#46536b]">{label}</label><select id={`setting-${name}`} value={feature.settings?.[name] || 'muted'} disabled={busy} onChange={(event) => setSetting(feature, name, event.target.value)} className={`min-h-11 w-full rounded-xl border border-[#dfe5ef] bg-white px-3 text-sm text-[#101827] ${focus}`}>
                    {MEDIA_DEFAULT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select></div>)}</div>}
                </article>
              })}
            </div>
          </section>)}
          {busy && <p role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-2 text-xs text-[#68758a]"><Loader2 className="h-4 w-4 animate-spin"/>در حال ذخیره تغییرات…</p>}
        </div> : <div className="rounded-2xl border border-[#e5eaf2] bg-white p-8 text-center"><Settings2 className="mx-auto text-[#8d98aa]"/><p className="mt-3 font-bold">تنظیمی برای نمایش وجود ندارد.</p></div>)}
      </div>
    </div>
  )
}
