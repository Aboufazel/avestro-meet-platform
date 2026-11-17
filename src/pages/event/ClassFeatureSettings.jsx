import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { roomsService } from '../../services/rooms'
import { PLAN_FEATURE_KEYS } from '../../constants/planFeatures'

const HINTS = {
  whiteboard: 'فضای نوشتن و ترسیم هم‌زمان برای کلاس',
  documents: 'نمایش عکس، PDF، Word و PowerPoint داخل کلاس',
  speak_permission: 'میکروفون و دوربین شرکت‌کنندگان با اجازه‌ی مدیر باز شود',
  raise_hand: 'درخواست صحبت و مدیریت صف',
  attendance: 'ثبت حضور و غیاب شرکت‌کنندگان',
}

const MODES = [
  { value: 'inherit', label: 'طبق تنظیمات حساب' },
  { value: 'enabled', label: 'فعال در این کلاس' },
  { value: 'disabled', label: 'غیرفعال در این کلاس' },
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/30'

export default function ClassFeatureSettings({ slug }) {
  const queryClient = useQueryClient()

  const roomQuery = useQuery({
    queryKey: ['room-features', slug],
    queryFn: () => roomsService.features(slug).then((response) => response.data),
    enabled: Boolean(slug),
  })

  const mutation = useMutation({
    mutationFn: ({ key, mode }) => roomsService.updateRoomFeature(slug, key, { mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-features', slug] })
      toast.success('تنظیم امکان برای این کلاس ذخیره شد')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'ذخیره تنظیم ناموفق بود'),
  })

  if (roomQuery.isLoading) {
    return (
      <section className="rounded-2xl border border-[#e5eaf2] bg-[#f8faff] p-5" role="status">
        <div className="flex items-center gap-2 text-sm text-[#4b586d]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          در حال دریافت امکانات کلاس…
        </div>
      </section>
    )
  }

  const features = roomQuery.data?.features
  if (roomQuery.isError || !features) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />دریافت امکانات کلاس ممکن نشد. صفحه را تازه‌سازی کنید.</span>
      </section>
    )
  }

  const rows = PLAN_FEATURE_KEYS.map((key) => features[key]).filter(Boolean)
  const pendingKey = mutation.isPending ? mutation.variables?.key : null

  return (
    <section aria-labelledby="class-features-title" className="rounded-2xl border border-[#dfe7f5] bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f55d4]"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="class-features-title" className="font-bold text-[#101827]">امکانات این کلاس</h2>
          <p className="mt-1 text-sm leading-6 text-[#4b586d]">
            برای هر امکان مشخص کنید در همین کلاس چطور باشد. «طبق تنظیمات حساب» یعنی همان‌چه در{' '}
            <Link to="/dashboard/settings" className="font-bold text-[#2347b4] underline">تنظیمات حساب</Link> انتخاب کرده‌اید.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {rows.map((feature) => {
          const locked = feature.reason === 'not_in_plan'
          const id = `room-feature-${feature.key}`
          return (
            <li key={feature.key} className="rounded-xl border border-[#e5eaf2] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <label htmlFor={id} className="block text-sm font-bold text-[#101827]">{feature.title}</label>
                  <p className="mt-1 text-[13px] leading-5 text-[#4b586d]">{HINTS[feature.key]}</p>
                </div>
                <div className="flex items-center gap-2 sm:w-60 sm:shrink-0">
                  <select
                    id={id}
                    value={feature.room_mode || 'inherit'}
                    disabled={locked || pendingKey === feature.key}
                    onChange={(event) => mutation.mutate({ key: feature.key, mode: event.target.value })}
                    className={`min-h-11 w-full rounded-xl border-2 border-[#c3cee2] bg-white px-3 py-2 text-sm text-[#101827] disabled:opacity-60 ${focusRing}`}
                  >
                    {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                  </select>
                  {pendingKey === feature.key && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2f55d4]" aria-hidden="true" />}
                </div>
              </div>
              {locked && (
                <p className="mt-2 text-[13px] leading-5 text-[#7a4a05]">
                  این امکان در پلن فعلی شما نیست.{' '}
                  <Link to="/pricing" className="font-bold underline">مشاهده پلن‌های دارای این امکان</Link>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
