import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { roomsService } from '../services/rooms'

// تغییر تنظیمات در جلسه‌ی فعال با polling دیده می‌شود (ADMIN-09).
const POLL_MS = 15000

/**
 * تنظیمات نهایی ماژول‌های اتاق از بک‌اند.
 *
 * can(key, action = 'use') → boolean   (تا نرسیدن تنظیمات true: برای چت/اشتراک و ...)
 * has(key, action = 'use') → boolean   (تا نرسیدن تنظیمات false: برای امکانات اختیاری/کلاسی)
 *
 * تا وقتی تنظیمات نرسیده یا درخواست خطا داده، برای جلوگیری از قطع کلاس
 * «باز» (true) برمی‌گردد. این فقط رفتار UI است؛ اعمال واقعی محدودیت باید
 * در بک‌اند/لایه‌ی مجوز جلسه انجام شود.
 */
export function useRoomFeatures(slug) {
  const query = useQuery({
    queryKey: ['room-features', slug],
    queryFn: () => roomsService.features(slug).then((r) => r.data),
    enabled: !!slug,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 5000,
    retry: 1,
  })

  const me = query.data?.me
  const features = query.data?.features

  const can = useCallback(
    (key, action = 'use') => {
      if (!me) return true
      const entry = me[key]
      if (!entry) return true
      return Boolean(entry[action])
    },
    [me]
  )

  // برخلاف can: تا وقتی تنظیمات نرسیده false است. برای امکاناتی که «نبودنشان پیش‌فرض است»
  // (کلاس‌محور/اختیاری) استفاده شود تا قبل از رسیدن تنظیمات، ناگهانی روشن نشوند.
  const has = useCallback((key, action = 'use') => Boolean(me?.[key]?.[action]), [me])

  const settings = useCallback((key) => features?.[key]?.settings ?? {}, [features])

  return useMemo(
    () => ({
      can,
      has,
      settings,
      role: query.data?.role ?? null,
      kind: query.data?.kind ?? 'meeting',
      revision: query.data?.revision ?? 0,
      isLoaded: Boolean(query.data),
    }),
    [can, has, settings, query.data]
  )
}
