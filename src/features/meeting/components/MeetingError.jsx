import { memo } from 'react'

export const MeetingError = memo(
  function MeetingError({
    error,
    onLeave,
  }) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">

          <h2 className="text-xl text-red-400">
            اتصال ناموفق بود
          </h2>

          <p className="text-olive-400">
            {error?.message ||
              'خطایی در اتصال به جلسه رخ داد'}
          </p>

          <button
            onClick={onLeave}
            className="
              px-4
              py-2
              rounded-xl
              bg-red-600
            "
          >
            خروج
          </button>

        </div>
      </div>
    )
  }
)