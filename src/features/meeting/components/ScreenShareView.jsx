import { memo } from 'react'
import { MonitorUp } from 'lucide-react'

export const ScreenShareView = memo(
  function ScreenShareView({
    participantId,
  }) {
    if (!participantId) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-olive-500">
            <MonitorUp size={40} />
            <span>
              اشتراک صفحه فعال نیست
            </span>
          </div>
        </div>
      )
    }

    return null
  }
)