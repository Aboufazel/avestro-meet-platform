import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, PenTool, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { roomsService } from '../../services/rooms'

const FEATURE_KEY = 'whiteboard'

export default function ClassFeatureSettings({ slug }) {
  const queryClient = useQueryClient()

  const accountQuery = useQuery({
    queryKey: ['account-features'],
    queryFn: () => roomsService.accountFeatures().then((response) => response.data),
  })

  const roomQuery = useQuery({
    queryKey: ['room-features', slug],
    queryFn: () => roomsService.features(slug).then((response) => response.data),
    enabled: Boolean(slug),
  })

  const accountFeature = useMemo(
    () => accountQuery.data?.find((feature) => feature.key === FEATURE_KEY),
    [accountQuery.data],
  )
  const roomFeature = roomQuery.data?.features?.[FEATURE_KEY]

  const accountMutation = useMutation({
    mutationFn: (enabled) => roomsService.updateAccountFeature(FEATURE_KEY, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-features'] })
      queryClient.invalidateQueries({ queryKey: ['room-features'] })
      toast.success('وضعیت قابلیت در حساب ذخیره شد')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'ذخیره تنظیم حساب ناموفق بود'),
  })

  const roomMutation = useMutation({
    mutationFn: (mode) => roomsService.updateRoomFeature(slug, FEATURE_KEY, { mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-features', slug] })
      toast.success('تنظیم تخته سفید برای این جلسه ذخیره شد')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'ذخیره تنظیم جلسه ناموفق بود'),
  })

  const isLoading = accountQuery.isLoading || roomQuery.isLoading
  const hasError = accountQuery.isError || roomQuery.isError

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-[#e5eaf2] bg-[#f8faff] p-5">
        <div className="flex items-center gap-2 text-sm text-[#68758a]">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال دریافت تنظیمات امکانات آموزشی…
        </div>
      </section>
    )
  }

  if (hasError || !accountFeature || !roomFeature) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-2 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          تنظیمات تخته سفید دریافت نشد. صفحه را تازه‌سازی کنید؛ اگر مشکل ادامه داشت، دسترسی API تنظیمات قابلیت‌ها بررسی شود.
        </div>
      </section>
    )
  }

  const accountEnabled = Boolean(accountFeature.configured_enabled)
  const roomMode = roomFeature.room_mode || 'inherit'
  const busy = accountMutation.isPending || roomMutation.isPending

  return (
    <section className="rounded-2xl border border-[#dfe7f5] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#4f7cff]">
          <PenTool className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[#101827]">تنظیمات تخته سفید</h2>
          <p className="mt-1 text-sm leading-6 text-[#7b8799]">
            فعال‌سازی در حساب و وضعیت استفاده در همین کلاس را جداگانه کنترل کنید.
          </p>
        </div>
        <Settings2 className="h-5 w-5 text-[#9aa4b4]" />
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5eaf2] bg-[#f8faff] p-4">
          <input
            type="checkbox"
            checked={accountEnabled}
            disabled={busy}
            onChange={(event) => accountMutation.mutate(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#4f7cff]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#101827]">قابلیت تخته سفید در حساب فعال باشد</span>
            <span className="mt-1 block text-xs leading-5 text-[#7b8799]">
              این گزینه سطح حساب را تغییر می‌دهد و می‌تواند روی کلاس‌های دیگری که تنظیمشان روی «ارث‌بری» است هم اثر بگذارد؛ سمینارها به‌صورت پیش‌فرض تخته سفید نمی‌گیرند.
            </span>
          </span>
        </label>

        <div className="rounded-xl border border-[#e5eaf2] p-4">
          <label htmlFor="whiteboard-room-mode" className="mb-2 block text-sm font-semibold text-[#101827]">
            وضعیت تخته سفید در همین کلاس
          </label>
          <select
            id="whiteboard-room-mode"
            value={roomMode}
            disabled={busy}
            onChange={(event) => roomMutation.mutate(event.target.value)}
            className="w-full rounded-xl border border-[#dfe5ef] bg-white px-3 py-2.5 text-sm text-[#101827] outline-none transition focus:border-[#9eb6ff] focus:ring-2 focus:ring-[#4f7cff]/15 disabled:opacity-60"
          >
            <option value="inherit">ارث‌بری از تنظیم حساب</option>
            <option value="enabled">فعال در این کلاس</option>
            <option value="disabled">غیرفعال در این کلاس</option>
          </select>
          {!accountEnabled && roomMode === 'enabled' ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-amber-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              تا زمانی که قابلیت در سطح حساب فعال نباشد، انتخاب این جلسه به‌تنهایی آن را فعال نمی‌کند.
            </p>
          ) : (
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#7b8799]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              این تنظیم فقط برای همین کلاس ذخیره می‌شود.
            </p>
          )}
        </div>

        {busy && (
          <div className="flex items-center gap-2 text-xs text-[#7b8799]" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال ذخیره تنظیمات…
          </div>
        )}
      </div>
    </section>
  )
}
