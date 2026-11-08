import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRooms, useDeleteRoom } from '../../hooks/useRooms'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { Badge } from '../../components/ui/Badge'
import { Plus, Video, Loader2, ExternalLink, Pencil, CalendarDays, Users, Image as ImageIcon, Trash2 } from 'lucide-react'

const labels = { live: 'در حال برگزاری', scheduled: 'زمان‌بندی‌شده', ended: 'پایان‌یافته' }
const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'

function DeleteRoomDialog({ room, pending, onCancel, onConfirm }) {
  const ref = useDialogFocus(Boolean(room), onCancel)
  if (!room) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
    <div className="absolute inset-0 bg-[#101827]/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="delete-room-title" aria-describedby="delete-room-desc"
      className="relative w-full max-w-md rounded-[22px] border border-[#e5eaf2] bg-white p-6 shadow-[0_24px_60px_rgba(20,35,65,.18)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fde8eb] text-[#d84d61]"><Trash2 size={22} aria-hidden="true" /></span>
      <h2 id="delete-room-title" className="mt-4 text-lg font-extrabold text-[#101827]">حذف اتاق «{room.title}»؟</h2>
      <p id="delete-room-desc" className="mt-2 text-sm leading-7 text-[#46536b]">
        لینک اتاق از دسترس خارج می‌شود و سهم {fa(room.max_participants)} کاربر و {fa(room.allocated_video_streams)} تصویر آن به پلن شما برمی‌گردد.
        اطلاعات حضور و غیاب و فایل‌های این اتاق فعلاً نگهداری می‌شود و شناسه‌ی لینک آن دوباره قابل استفاده نیست.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
        <button type="button" data-autofocus onClick={onCancel} disabled={pending} className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e5eaf2] bg-white px-5 text-sm font-bold text-[#34415a] hover:bg-[#f4f7fb] disabled:opacity-50 ${focusRing}`}>انصراف</button>
        <button type="button" onClick={onConfirm} disabled={pending} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d84d61] px-5 text-sm font-bold text-white hover:bg-[#c43d51] disabled:opacity-60 ${focusRing}`}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}حذف اتاق
        </button>
      </div>
    </div>
  </div>
}

export default function RoomsPage() {
  const { data: rooms = [], isLoading, isError, refetch } = useRooms()
  const { mutate: deleteRoom, isPending: deleting } = useDeleteRoom()
  const [target, setTarget] = useState(null)
  const confirmDelete = () => deleteRoom(target.slug, { onSettled: () => setTarget(null) })
  const cancelDelete = useCallback(() => { if (!deleting) setTarget(null) }, [deleting])
  return <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl"><div className="mx-auto max-w-[1400px]">
    <header className="mb-6 flex flex-col gap-4 rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_12px_38px_rgba(20,35,65,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><p className="mb-2 text-xs font-bold text-[#4f7cff]">مدیریت فضای کاری</p><h1 className="text-2xl font-extrabold text-[#101827]">لیست اتاق‌ها</h1><p className="mt-2 text-sm text-[#68758a]">اتاق‌های ساخته‌شده، وضعیت برگزاری و تنظیمات آن‌ها را مدیریت کنید.</p></div><Link to="/dashboard/create" className="meet-primary-btn inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl px-5 py-3 text-sm font-bold"><Plus size={17}/>ساخت اتاق جدید</Link></header>
    <section className="meet-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#e5eaf2] px-5 py-4"><div><h2 className="font-bold">همه اتاق‌ها</h2><p className="mt-1 text-xs text-[#8d98aa]">{rooms.length.toLocaleString('fa-IR')} اتاق در فضای کاری</p></div><span className="rounded-xl bg-[#edf2ff] px-3 py-2 text-xs font-bold text-[#4f7cff]">{rooms.length.toLocaleString('fa-IR')} مورد</span></div>
      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#4f7cff]"/></div> : isError ? <div className="p-10 text-center"><p className="font-bold">دریافت اتاق‌ها انجام نشد.</p><button onClick={() => refetch()} className="mt-3 text-sm font-bold text-[#4f7cff]">تلاش دوباره</button></div> : rooms.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#4f7cff]"><Video/></span><h3 className="mt-4 font-bold">هنوز اتاقی نساخته‌اید</h3><p className="mt-2 text-sm text-[#8d98aa]">با ساخت اولین اتاق، لینک اختصاصی جلسه در این فهرست نمایش داده می‌شود.</p><Link to="/dashboard/create" className="meet-primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16}/>ساخت اتاق جدید</Link></div> : <div className="divide-y divide-[#eef1f5]">{rooms.map(room=>{
        const inSession = Number(room.active_participants_count || 0) > 0
        return <article key={room.id} className="flex flex-col gap-4 p-4 transition hover:bg-[#f9fbff] sm:flex-row sm:items-center sm:px-6"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${room.status==='live'?'bg-[#e8faf4] text-[#2eaf89]':'bg-[#edf2ff] text-[#4f7cff]'}`}><Video size={19}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#101827]">{room.title}</h3><Badge variant={room.status}>{room.status==='scheduled'&&room.ended_at?'آماده جلسه بعد':labels[room.status] || room.status}</Badge></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8d98aa]"><span className="inline-flex items-center gap-1"><CalendarDays size={13}/>{room.scheduled_at ? new Date(room.scheduled_at).toLocaleDateString('fa-IR') : 'بدون زمان‌بندی'}</span><span className="inline-flex items-center gap-1"><Users size={13}/>{Number(room.active_participants_count || 0).toLocaleString('fa-IR')} شرکت‌کننده فعال</span><span className="inline-flex items-center gap-1" title="سهم این اتاق از بودجه‌ی پلن"><Users size={13}/>ظرفیت {fa(room.max_participants)} نفر</span><span className="inline-flex items-center gap-1" title="سهم این اتاق از بودجه‌ی پلن"><ImageIcon size={13}/>{fa(room.allocated_video_streams)} تصویر</span></div></div><div className="flex flex-wrap gap-2"><Link to={`/dashboard/edit/${encodeURIComponent(room.slug)}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#e5eaf2] px-3 text-xs font-bold text-[#68758a]"><Pencil size={14}/>ویرایش</Link><button type="button" disabled={inSession} onClick={() => setTarget(room)} title={inSession ? 'ابتدا جلسه را پایان دهید' : 'حذف اتاق'} aria-label={inSession ? `حذف ${room.title} (ابتدا جلسه را پایان دهید)` : `حذف ${room.title}`} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#f0c3ca] px-3 text-xs font-bold text-[#d84d61] hover:bg-[#fff1f3] disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}><Trash2 size={14}/>حذف</button>{room.status!=='ended' && <Link to={`/join/${room.slug}`} className="meet-primary-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold"><ExternalLink size={14}/>ورود به اتاق</Link>}</div></article>})}</div>}</section>
    <DeleteRoomDialog room={target} pending={deleting} onCancel={cancelDelete} onConfirm={confirmDelete} />
  </div></div>
}
