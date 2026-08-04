import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, Clock, Users, Video, ArrowRight, LogIn, UserCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const mockEvent = {
  title: 'جلسه هفتگی تیم توسعه',
  host: 'علی رضایی',
  date: '۱۴۰۵/۰۵/۱۳',
  time: '۱۰:۰۰',
  capacity: 20,
  participants: 8,
  status: 'live',
  description: 'بررسی پیشرفت پروژه‌های هفتگی و تعیین اهداف جدید',
}

function Countdown({ target }) {
  const [remaining, setRemaining] = useState({ h: '۰۰', m: '۱۵', s: '۴۲' })
  return (
    <div className="flex items-center justify-center gap-4">
      {[
        { value: remaining.h, label: 'ساعت' },
        { value: remaining.m, label: 'دقیقه' },
        { value: remaining.s, label: 'ثانیه' },
      ].map(({ value, label }) => (
        <div key={label} className="text-center">
          <div className="bg-olive-800 border border-olive-700 rounded-xl px-5 py-3 mb-1">
            <span className="text-2xl text-olive-100" style={{ fontWeight: 700 }}>{value}</span>
          </div>
          <span className="text-olive-600 text-xs">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function JoinPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [guestName, setGuestName] = useState('')
  const [joining, setJoining] = useState(false)

  const isFull = mockEvent.participants >= mockEvent.capacity

  const handleJoin = async () => {
    if (!isAuthenticated && !guestName.trim()) {
      toast.error('لطفاً نام خود را وارد کنید')
      return
    }
    setJoining(true)
    await new Promise((r) => setTimeout(r, 800))
    navigate(`/room/${slug}`)
    setJoining(false)
  }

  return (
    <div className="min-h-screen bg-olive-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-olive-500 flex items-center justify-center">
              <Video className="w-4 h-4 text-olive-950" />
            </div>
            <span className="text-olive-100 font-medium">اَوسترو میت</span>
          </div>
        </div>

        <Card>
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-olive-100 leading-tight" style={{ fontWeight: 700 }}>
                {mockEvent.title}
              </h1>
              <Badge variant={mockEvent.status}>
                {mockEvent.status === 'live' ? 'در جریان' : 'زمان‌بندی‌شده'}
              </Badge>
            </div>

            <p className="text-olive-500 text-sm mb-4">{mockEvent.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-olive-400">
              <span className="flex items-center gap-1.5">
                <UserCircle className="w-4 h-4" />
                {mockEvent.host}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {mockEvent.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {mockEvent.time}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {mockEvent.participants}/{mockEvent.capacity} نفر
              </span>
            </div>
          </div>

          <div className="border-t border-olive-700 pt-5">
            {isFull ? (
              <div className="text-center py-4">
                <p className="text-olive-400 mb-1">ظرفیت این جلسه پر شده است</p>
                <p className="text-olive-600 text-sm">لطفاً با میزبان تماس بگیرید</p>
              </div>
            ) : mockEvent.status === 'scheduled' ? (
              <div className="text-center py-2">
                <p className="text-olive-400 text-sm mb-4">جلسه شروع نشده — زمان باقی‌مانده:</p>
                <Countdown />
              </div>
            ) : (
              <>
                {isAuthenticated ? (
                  <div className="bg-olive-800 border border-olive-700 rounded-xl p-4 mb-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-olive-700 border border-olive-600 flex items-center justify-center text-olive-300 text-sm font-medium">
                      {user?.displayName?.charAt(0) || 'ک'}
                    </div>
                    <div>
                      <p className="text-olive-100 text-sm">{user?.displayName}</p>
                      <p className="text-olive-500 text-xs">{user?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex flex-col gap-3">
                    <Input
                      placeholder="نام شما (برای ورود مهمان)"
                      icon={UserCircle}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                    <p className="text-center text-olive-600 text-xs">
                      یا{' '}
                      <Link to="/login" className="text-olive-400 hover:text-olive-200 transition-colors">
                        وارد شوید
                      </Link>
                      {' / '}
                      <Link to="/register" className="text-olive-400 hover:text-olive-200 transition-colors">
                        ثبت‌نام کنید
                      </Link>
                    </p>
                  </div>
                )}

                <Button
                  fullWidth
                  loading={joining}
                  disabled={isFull}
                  icon={LogIn}
                  onClick={handleJoin}
                >
                  ورود به جلسه
                </Button>
              </>
            )}
          </div>
        </Card>

        <div className="text-center mt-5">
          <Link to="/" className="text-olive-600 hover:text-olive-400 text-sm transition-colors flex items-center gap-1 justify-center">
            <ArrowRight className="w-4 h-4" />
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </div>
  )
}
