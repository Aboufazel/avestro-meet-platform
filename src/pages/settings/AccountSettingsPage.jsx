import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { roomsService } from '../../services/rooms'

// فقط ماژول‌هایی که الان در اتاق پیاده‌سازی شده‌اند؛ بقیه‌ی ماژول‌های بک‌اند هنوز در رابط کاربری نیستند
const FEATURES = [
  { key: 'chat', hint: 'گفت‌وگوی متنی در اتاق' },
  { key: 'participants_list', hint: 'فهرست افراد حاضر' },
  { key: 'screen_share', hint: 'اشتراک صفحه (در کلاس فقط معلم)' },
  { key: 'recording', hint: 'ضبط جلسه' },
  { key: 'speak_permission', hint: 'دانش‌آموز فقط با اجازه‌ی معلم میکروفون و دوربین را باز کند' },
  { key: 'raise_hand', hint: 'دست‌بلندکردن و صف درخواست صحبت' },
  { key: 'attendance', hint: 'حضور و غیاب' },
  { key: 'whiteboard', hint: 'تخته تعاملی (فقط کلاس)' },
]

const MEDIA_DEFAULT_OPTIONS = [
  { value: 'muted', label: 'بسته (با اجازه‌ی معلم باز شود)' },
  { value: 'open', label: 'باز' },
]

export default function AccountSettingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
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
  const busy = mutation.isPending

  const setEnabled = (feature, enabled) => mutation.mutate({ key: feature.key, payload: { enabled } })
  // settings کامل ارسال می‌شود تا مقدارهای دیگر همان ماژول پاک نشوند
  const setSetting = (feature, name, value) =>
    mutation.mutate({ key: feature.key, payload: { settings: { ...feature.settings, [name]: value } } })

  return (
    <div className="min-h-full bg-[#f4f7fb] p-4 sm:p-6">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-[#8d98aa] hover:bg-[#edf2ff] hover:text-[#4f7cff] transition-all">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[#101827] font-bold text-lg">تنظیمات حساب</h1>
            <p className="text-[#8d98aa] text-sm">امکانات پیش‌فرض همه‌ی رویدادهای شما. هر رویداد را می‌توانید جداگانه تغییر دهید.</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-[#68758a]">
            <Loader2 className="h-4 w-4 animate-spin" /> در حال دریافت تنظیمات…
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            تنظیمات دریافت نشد. صفحه را تازه‌سازی کنید.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col gap-3">
            {rows.map(({ feature, hint }) => {
              const on = Boolean(feature.configured_enabled)
              return (
                <section key={feature.key} className="rounded-2xl border border-[#dfe7f5] bg-white p-4 sm:p-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={(event) => setEnabled(feature, event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#4f7cff]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#101827]">{feature.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#7b8799]">{hint}</span>
                    </span>
                  </label>

                  {on && !feature.enabled && (
                    <p className="mt-2 flex items-start gap-1.5 pr-7 text-xs leading-5 text-amber-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      این امکان روشن است ولی به‌خاطر وابستگی به امکان دیگری که خاموش است اعمال نمی‌شود.
                    </p>
                  )}

                  {on && feature.key === 'whiteboard' && (
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5eaf2] bg-[#f8faff] p-3">
                      <input
                        type="checkbox"
                        checked={Boolean(feature.settings?.students_can_draw)}
                        disabled={busy}
                        onChange={(event) => setSetting(feature, 'students_can_draw', event.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#4f7cff]"
                      />
                      <span className="text-xs leading-5 text-[#536074]">دانش‌آموزان بتوانند روی تخته بنویسند</span>
                    </label>
                  )}

                  {on && feature.key === 'speak_permission' && (
                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-[#e5eaf2] bg-[#f8faff] p-3 sm:grid-cols-2">
                      {[['audio_default', 'وضعیت اولیه‌ی میکروفون'], ['video_default', 'وضعیت اولیه‌ی دوربین']].map(([name, label]) => (
                        <div key={name}>
                          <label htmlFor={name} className="mb-1.5 block text-xs text-[#536074]">{label}</label>
                          <select
                            id={name}
                            value={feature.settings?.[name] || 'muted'}
                            disabled={busy}
                            onChange={(event) => setSetting(feature, name, event.target.value)}
                            className="w-full rounded-xl border border-[#dfe5ef] bg-white px-3 py-2 text-sm text-[#101827] outline-none focus:border-[#9eb6ff] disabled:opacity-60"
                          >
                            {MEDIA_DEFAULT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-[#7b8799]" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال ذخیره…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
