import { useCallback } from 'react'
import { useMeetingStore } from '../store/meeting-store'
import { startScreenShare, stopScreenShare } from '../store/meeting-actions'
import { selectIsScreenSharing } from '../store/meeting-selectors'

/**
 * مدیریت اشتراک‌گذاری صفحه
 */
export function useScreenShare() {
  const isScreenSharing = useMeetingStore(selectIsScreenSharing)

  const toggle = useCallback(() => {
    isScreenSharing ? stopScreenShare() : startScreenShare()
  }, [isScreenSharing])

  return {
    isScreenSharing,
    toggle,
  }
}