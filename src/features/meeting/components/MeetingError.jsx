import { memo } from 'react'

export const MeetingError = memo(function MeetingError({ error, onLeave }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--room-bg)] p-4">
      <div className="w-[min(420px,100%)] rounded-[28px] border border-[var(--room-danger)]/20 bg-[var(--room-surface)] px-7 py-8 text-center shadow-[0_24px_70px_rgba(0,0,0,.3)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--room-danger)]/10 text-[var(--room-danger)] mx-auto flex items-center justify-center text-lg">!</div>
        <h2 className="text-lg font-bold text-white mt-5">اتصال ناموفق بود</h2>
        <p className="text-white/45 text-sm leading-7 mt-2">{error?.message || 'خطایی در اتصال به جلسه رخ داد'}</p>
        <button onClick={onLeave} className="mt-6 px-5 py-2.5 rounded-xl bg-[var(--room-danger)] text-white text-sm font-medium hover:bg-[var(--room-danger)] transition-colors">خروج از جلسه</button>
      </div>
    </div>
  )
})
