import { Link } from 'react-router-dom'
import { Plus, Calendar, Users, Video, ExternalLink, Clock, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'
import { useRooms } from '../../hooks/useRooms'

const statusLabels = {
  live: 'در جریان',
  scheduled: 'زمان‌بندی‌شده',
  ended: 'پایان یافته',
}

function StatCard({ icon: Icon, value, label, sub }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-olive-500 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-olive-100">{value}</p>
          {sub && <p className="text-olive-600 text-xs mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-olive-800 border border-olive-700 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-olive-400" />
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: rooms = [], isLoading } = useRooms()

  const liveCount = rooms.filter((r) => r.status === 'live').length
  const scheduledCount = rooms.filter((r) => r.status === 'scheduled').length
  const totalParticipants = rooms.reduce((s, r) => s + (r.active_participants_count || 0), 0)

  return (
    <div className="min-h-full bg-olive-950 p-4 sm:p-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-olive-100 font-bold text-lg sm:text-xl mb-1">
            سلام، {user?.display_name || user?.username || 'کاربر'}
          </h1>
          <p className="text-olive-500 text-sm">داشبورد مدیریت رویدادهای شما</p>
        </div>
        <Link to="/dashboard/create" className="self-start sm:self-auto">
          <Button size="md">
            <Plus className="w-4 h-4 ml-1" />
            رویداد جدید
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard icon={Video} value={liveCount} label="جلسه زنده" sub="در حال برگزاری" />
        <StatCard icon={Calendar} value={scheduledCount} label="زمان‌بندی شده" sub="رویداد آینده" />
        <StatCard icon={Users} value={totalParticipants} label="شرکت‌کننده" sub="در مجموع" />
      </div>

      <Card padding="sm">
        <div className="flex items-center justify-between px-2 py-3 border-b border-olive-700 mb-2">
          <h2 className="text-olive-100 text-sm font-medium">رویدادهای اخیر</h2>
          <span className="text-olive-600 text-xs">{rooms.length} رویداد</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-6 h-6 text-olive-500 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-olive-800 border border-olive-700 flex items-center justify-center mb-4">
              <Video className="w-7 h-7 text-olive-600" />
            </div>
            <p className="text-olive-400 mb-1">هنوز رویدادی ندارید</p>
            <p className="text-olive-600 text-sm mb-5">اولین جلسه آنلاین خود را بسازید</p>
            <Link to="/dashboard/create">
              <Button size="sm">
                <Plus className="w-4 h-4 ml-1" />
                رویداد جدید
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-olive-800/60">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-2 py-4 hover:bg-olive-800/30 rounded-xl transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-olive-100 text-sm font-medium truncate mb-1.5">{room.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-olive-600 text-xs">
                    {room.scheduled_at && (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(room.scheduled_at).toLocaleDateString('fa-IR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(room.scheduled_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {room.active_participants_count || 0}/{room.max_participants}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant={room.status}>{statusLabels[room.status]}</Badge>
                  {room.status !== 'ended' && (
                    <Link
                      to={`/join/${room.slug}`}
                      className="flex items-center gap-1 text-xs text-olive-400 hover:text-olive-200 border border-olive-700 hover:border-olive-500 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {room.status === 'live' ? 'ورود' : 'مشاهده'}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}