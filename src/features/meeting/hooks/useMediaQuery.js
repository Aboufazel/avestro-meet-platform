import { useSyncExternalStore } from 'react'

/**
 * یک media query را reactive می‌کند (بدون re-render اضافه).
 * مثال: const isDesktop = useMediaQuery('(min-width: 768px)')
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener?.('change', onChange)
      return () => mql.removeEventListener?.('change', onChange)
    },
    () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    () => false
  )
}

/** تعداد ستون شبکه‌ی تایل‌ها: ۳ در دسکتاپ، ۲ در موبایل */
export function useGridColumns() {
  return useMediaQuery('(min-width: 768px)') ? 3 : 2
}
