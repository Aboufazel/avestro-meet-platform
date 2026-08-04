import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Calendar,
  Users,
  Video,
  ExternalLink,
  Clock,
  MoreVertical,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const mockEvents = [
  {
    id: '1',
    title: 'جلسه هفتگی تیم توسعه',
    slug: 'weekly-dev-team',
    status: 'live',
    date: '۱۴۰۵/۰۵/۱۳',
    time: '۱۰:۰۰',
    participants: 8,
    capacity: 20,
  },
  {
    id: '2',
    title: 'وبینار معرفی محصول جدید',
    slug: 'product-launch-webinar',
    status: 'scheduled',
    date: '۱۴۰۵/۰۵/۱۵',
    time: '۱۴:۳۰',
    participants: 0,
    capacity: 100,
  },
  {
    id: '3',
    title: 'آموزش کار با React',
    slug: 'react-training',
    status: 'scheduled',
    date: '۱۴۰۵/۰۵/۱۸',
    time: '۱۶:۰۰',
    participants: 0,
    capacity: 50,
  },
  {
    id: '4',
    title: 'جلسه بررسی طرح سالانه',
    slug: 'annual-review',
    status: 'ended',
    date: '۱۴۰۵/۰۵/۱۰',
    time: '۰۹:۰۰',
    participants: 15,
    capacity: 30,
  },
]

const statusLabels = { live: 'در جریان', scheduled: 'زمان‌بندی‌شده', ended: 'پایان یافته' }

function StatCard({ icon: Icon, value, label, sub }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-olive-500 text-sm mb-1">{label}</p>
          <p className="text-3xl text-olive-100" style={{ fontWeight: 700 }}>{value}</p>
          {sub && <p className="text-olive-600 text-xs mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-olive-800 border border-olive-700 flex items-center justify-center">
          <Icon className="w-5 h-5 text-olive-400" />
        </div>
      </div>
    </Card>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-32 h-4 bg-olive-800 rounded" />
      <div className="flex-1 h-4 bg-olive-800 rounded" />
      <div className="w-20 h-4 bg-olive-800 rounded" />
      <div className="w-16 h-4 bg-olive-800 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [events] = useState(mockEvents)

  const liveCount = events.filter((e) => e.status === 'live').length
  const scheduledCount = events.filter((e) => e.status === 'scheduled').length
  const totalParticipants = events.reduce((s, e) => s + e.participants, 0)

  return (
    <div className="min-h-full bg-olive-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-olive-100 mb-1" style={{ fontWeight: 700 }}>
            سلام، {user?.displayName || 'کاربر'}! 👋
          </h1>
          <p className="text-olive-500 text-sm">داشبورد مدیریت رویدادهای شما</p>
        </div>
        <Link to="/dashboard/create">
          <Button icon={Plus} size="md">رویداد جدید</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Video} value={liveCount} label="جلسه زنده" sub="در حال برگزاری" />
        <StatCard icon={Calendar} value={scheduledCount} label="زمان‌بندی شده" sub="رویداد آینده" />
        <StatCard icon={Users} value={totalParticipants} label="شرکت‌کننده" sub="در مجموع" />
      </div>

      {/* Events List */}
      <Card padding="sm">
        <div className="flex items-center justify-between px-2 py-3 border-b border-olive-700 mb-2">
          <h2 className="text-olive-100 text-sm" style={{ fontWeight: 500 }}>رویدادهای اخیر</h2>
          <span className="text-olive-600 text-xs">{events.length} رویداد</span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-olive-800 border border-olive-700 flex items-center justify-center mb-4">
              <Video className="w-7 h-7 text-olive-600" />
            </div>
            <p className="text-olive-400 mb-1">هنوز رویدادی ندارید</p>
            <p className="text-olive-600 text-sm mb-5">اولین جلسه آنلاین خود را بسازید</p>
            <Link to="/dashboard/create">
              <Button size="sm" icon={Plus}>رویداد جدید</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-olive-800/60">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 px-2 py-4 hover:bg-olive-800/30 rounded-xl transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-olive-100 text-sm truncate mb-1">{event.title}</p>
                  <div className="flex items-center gap-3 text-olive-600 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.participants}/{event.capacity}
                    </span>
                  </div>
                </div>

                <Badge variant={event.status}>{statusLabels[event.status]}</Badge>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {event.status !== 'ended' && (
                    <Link
                      to={`/join/${event.slug}`}
                      className="flex items-center gap-1 text-xs text-olive-400 hover:text-olive-200 border border-olive-700 hover:border-olive-500 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {event.status === 'live' ? 'ورود' : 'مشاهده'}
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
