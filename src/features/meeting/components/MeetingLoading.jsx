import { memo } from 'react'

export const MeetingLoading = memo(function MeetingLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--room-bg)]">
      <div className="w-[min(360px,calc(100%-32px))] rounded-[28px] border border-white/[.07] bg-[var(--room-surface)]/85 backdrop-blur-xl px-8 py-9 text-center shadow-[0_24px_70px_rgba(0,0,0,.3)]">
        <img src="/avestro-logo.png" alt="اَوسترو" className="w-12 h-12 rounded-xl mx-auto mb-5" />
        <div className="w-9 h-9 rounded-full border-[3px] border-[var(--room-blue-2)]/30 border-t-[var(--room-mint)] animate-spin mx-auto" />
        <p className="text-white text-sm font-medium mt-5">در حال اتصال به جلسه...</p>
        <p className="text-white/35 text-[11px] mt-2">لطفاً چند لحظه صبر کنید</p>
      </div>
    </div>
  )
})
