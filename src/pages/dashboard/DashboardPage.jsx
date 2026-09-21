import { Link } from 'react-router-dom'
import { Plus, Calendar, Users, Video, ExternalLink, Clock, Loader2, ArrowUpLeft, Activity, MoreHorizontal, ArrowLeft, Sparkles, Radio } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../store/authStore'
import { useRooms } from '../../hooks/useRooms'

const statusLabels = { live: 'در جریان', scheduled: 'زمان‌بندی‌شده', ended: 'پایان یافته' }

function Stat({ icon: Icon, value, label, detail, accent }) {
  return (
    <div className="meet-card meet-card-hover p-5 sm:p-6 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-60 ${accent === 'mint' ? 'bg-[#54d9b0]/10' : 'bg-[#4f7cff]/10'}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs text-[#8d98aa]">{label}</p>
          <p className="meet-stat-number text-3xl font-bold mt-2">{value}</p>
          <p className="text-[11px] text-[#8d98aa] mt-1">{detail}</p>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent === 'mint' ? 'bg-[#e8faf4] text-[#2eaf89]' : 'bg-[#edf2ff] text-[#4f7cff]'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: rooms = [], isLoading } = useRooms()
  const liveCount = rooms.filter((r) => r.status === 'live').length
  const scheduledCount = rooms.filter((r) => r.status === 'scheduled').length
  const totalParticipants = rooms.reduce((s, r) => s + (r.active_participants_count || 0), 0)

  return (
    <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="dashboard-hero rounded-[24px] p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-5 sm:mb-7">
          <div>
            <p className="text-xs text-[#4f7cff] font-medium mb-2">نمای کلی فضای کاری</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101827]">
              {user?.display_name || user?.username || 'کاربر'}، آماده‌ای؟
            </h1>
            <p className="text-sm text-[#68758a] mt-2">جلسات، زمان‌بندی و وضعیت اتاق‌ها را از یکجا مدیریت کنید.</p>
          </div>
          <Link to="/dashboard/create" className="self-start sm:self-auto">
            <span className="meet-primary-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium">
              <Plus className="w-4 h-4" /> جلسه جدید
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <Stat icon={Video} value={liveCount} label="جلسه زنده" detail="در حال برگزاری" />
          <Stat icon={Calendar} value={scheduledCount} label="جلسه زمان‌بندی‌شده" detail="رویدادهای آینده" accent="mint" />
          <div className="col-span-2 lg:col-span-1"><Stat icon={Users} value={totalParticipants} label="شرکت‌کننده فعال" detail="در جلسات فعلی" /></div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 sm:gap-5">
          <div className="grid grid-cols-2 gap-3 xl:hidden mb-0">
            <Link to="/dashboard/create" className="dashboard-quick meet-card meet-card-hover p-4 flex items-center gap-3 group">
              <span className="w-10 h-10 rounded-xl bg-[#edf2ff] text-[#4f7cff] flex items-center justify-center shrink-0"><Plus className="w-5 h-5" /></span>
              <span className="min-w-0"><span className="block text-xs font-bold">جلسه جدید</span><span className="block text-[10px] text-[#8d98aa] mt-1">ساخت اتاق</span></span>
              <ArrowLeft className="w-3.5 h-3.5 mr-auto text-[#b0bac8] group-hover:text-[#4f7cff]" />
            </Link>
            <div className="dashboard-quick meet-card meet-card-hover p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#e8faf4] text-[#2eaf89] flex items-center justify-center shrink-0"><Radio className="w-5 h-5" /></span>
              <span className="min-w-0"><span className="block text-xs font-bold">وضعیت زنده</span><span className="block text-[10px] text-[#8d98aa] mt-1">{liveCount} جلسه فعال</span></span>
            </div>
          </div>

          <section className="meet-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#e5eaf2] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-sm">جلسات اخیر</h2>
                <p className="text-[11px] text-[#8d98aa] mt-1">{rooms.length} جلسه در فضای کاری</p>
              </div>
              <button className="w-9 h-9 rounded-xl border border-[#e5eaf2] flex items-center justify-center text-[#8d98aa] hover:bg-[#f4f7fb]"><MoreHorizontal className="w-4 h-4" /></button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#4f7cff] animate-spin" /></div>
            ) : rooms.length === 0 ? (
              <div className="py-20 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#edf2ff] text-[#4f7cff] mx-auto flex items-center justify-center"><Video className="w-6 h-6" /></div>
                <p className="font-medium mt-4">هنوز جلسه‌ای ندارید</p>
                <p className="text-xs text-[#8d98aa] mt-2 mb-5">اولین جلسه آنلاین خود را بسازید.</p>
                <Link to="/dashboard/create" className="meet-primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"><Plus className="w-4 h-4" /> جلسه جدید</Link>
              </div>
            ) : (
              <div>
                {rooms.map((room) => (
                  <div key={room.id} className="px-4 sm:px-6 py-4 border-b border-[#eef1f5] last:border-b-0 hover:bg-[#f8faff] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${room.status === 'live' ? 'bg-[#54d9b0] shadow-[0_0_0_4px_rgba(84,217,176,.12)]' : room.status === 'scheduled' ? 'bg-[#4f7cff]' : 'bg-[#c4cbd6]'}`} />
                          <p className="font-medium text-sm truncate">{room.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[11px] text-[#8d98aa]">
                          {room.scheduled_at && <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(room.scheduled_at).toLocaleDateString('fa-IR')}</span>}
                          {room.scheduled_at && <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(room.scheduled_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>}
                          <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{room.active_participants_count || 0}/{room.max_participants}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-stretch sm:self-auto">
                        <Badge variant={room.status}>{statusLabels[room.status]}</Badge>
                        {room.status !== 'ended' && (
                          <>
                            <Link to={`/dashboard/edit/${encodeURIComponent(room.slug)}`} className="flex-1 sm:flex-none text-center px-3 py-2 rounded-lg text-xs text-[#68758a] border border-[#e5eaf2] hover:border-[#b9c8ef] hover:bg-[#edf2ff]">ویرایش</Link>
                            <Link to={`/join/${room.slug}`} className="flex-1 sm:flex-none justify-center meet-primary-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium">
                              <ExternalLink className="w-3 h-3" />{room.status === 'live' ? 'ورود' : 'مشاهده'}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="meet-card p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#e8faf4] text-[#2eaf89] flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                <div><p className="font-bold text-sm">وضعیت سرویس</p><p className="text-[10px] text-[#8d98aa]">وضعیت فعلی فضای کاری</p></div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-[#eef1f5]">
                <span className="text-xs text-[#68758a]">اتصال سرویس</span>
                <span className="text-xs text-[#2eaf89] inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#54d9b0]" /> فعال</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-[#eef1f5]">
                <span className="text-xs text-[#68758a]">جلسات زنده</span>
                <span className="text-xs font-medium">{liveCount}</span>
              </div>
            </div>

            <div className="meet-dark-panel rounded-[22px] p-6 overflow-hidden relative">
              <div className="absolute -left-12 -top-12 w-32 h-32 bg-[#4f7cff]/15 rounded-full blur-2xl" />
              <div className="relative">
                <p className="text-[10px] text-[#54d9b0]">اَوسترو میت</p>
                <h3 className="text-lg font-bold mt-2">جلسه بعدی را<br />ساده‌تر شروع کن.</h3>
                <p className="text-[11px] text-white/45 leading-6 mt-3">یک اتاق بساز، لینک را کپی کن و جلسه را شروع کن.</p>
                <Link to="/dashboard/create" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-[#101827] px-4 py-2.5 text-xs font-medium hover:bg-white/90">
                  ساخت جلسه <ArrowUpLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
