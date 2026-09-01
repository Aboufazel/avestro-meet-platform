import { memo } from 'react'

export const MeetingLoading = memo(
  function MeetingLoading() {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="
              w-10
              h-10
              rounded-full
              border-4
              border-olive-600
              border-t-transparent
              animate-spin
            "
          />

          <span className="text-olive-300">
            در حال اتصال...
          </span>
        </div>
      </div>
    )
  }
)