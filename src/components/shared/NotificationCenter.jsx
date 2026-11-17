import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, X } from 'lucide-react'
import { notificationsService } from '../../services/notifications'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const dateText = (value) => value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : ''

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount().then(r => r.data),
    refetchInterval: 30000,
  })
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list().then(r => r.data),
    enabled: open,
    refetchInterval: open ? 30000 : false,
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }
  const readOne = useMutation({ mutationFn: notificationsService.markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: notificationsService.markAllRead, onSuccess: refresh })
  const unread = Number(countData?.unread_count || 0)

  return <div className="relative">
    <button type="button" onClick={() => setOpen(v => !v)} aria-label={`اعلان‌ها، ${fa(unread)} اعلان خوانده‌نشده`} aria-expanded={open}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5eaf2] bg-white text-[#52617a] hover:bg-[#f4f7fb]">
      <Bell size={19}/>
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e34e62] px-1 text-[10px] font-bold text-white">{unread > 99 ? '۹۹+' : fa(unread)}</span>}
    </button>
    {open && <>
      <button aria-label="بستن اعلان‌ها" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)}/>
      <section dir="rtl" className="absolute left-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#e5eaf2] bg-white shadow-[0_18px_60px_rgba(16,29,59,.18)]">
        <div className="flex items-center justify-between border-b border-[#edf0f5] px-4 py-3">
          <div><h2 className="text-sm font-extrabold text-[#101827]">اعلان‌ها</h2><p className="mt-1 text-[11px] text-[#8d98aa]">{fa(unread)} اعلان خوانده‌نشده</p></div>
          <div className="flex items-center gap-1">
            {unread > 0 && <button type="button" onClick={() => readAll.mutate()} disabled={readAll.isPending} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#315bd5] hover:bg-[#f1f5ff]"><CheckCheck size={15}/>خواندن همه</button>}
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8793a7] hover:bg-[#f4f7fb]"><X size={17}/></button>
          </div>
        </div>
        <div className="max-h-[min(65vh,520px)] overflow-y-auto">
          {isLoading ? <p className="p-6 text-center text-xs text-[#8793a7]">در حال دریافت اعلان‌ها…</p>
            : notifications.length === 0 ? <p className="p-7 text-center text-xs text-[#8793a7]">اعلانی برای نمایش وجود ندارد.</p>
            : notifications.map(item => <button key={item.id} type="button" onClick={() => !item.is_read && readOne.mutate(item.id)}
              className={`block w-full border-b border-[#f0f2f6] px-4 py-3 text-right last:border-0 hover:bg-[#f8faff] ${item.is_read ? 'bg-white' : 'bg-[#f4f7ff]'}`}>
              <div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-[#315bd5]'}`}/><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-[#26334b]">{item.title}</span><span className="mt-1 block text-xs leading-6 text-[#65728a]">{item.message}</span><span className="mt-1 block text-[10px] text-[#9aa4b5]">{dateText(item.created_at)}</span></span></div>
            </button>)}
        </div>
      </section>
    </>}
  </div>
}
