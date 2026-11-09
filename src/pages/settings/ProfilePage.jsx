import { useState } from 'react'
import { BadgeCheck, Mail, Phone, User } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useMe, useUpdateProfile } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'

export default function ProfilePage() {
  const storedUser = useAuthStore((s) => s.user)
  const { data: me } = useMe()
  const user = me || storedUser
  if (!user) return null
  // با تغییر مقدارهای ذخیره‌شده، فرم با مقدار تازه دوباره ساخته می‌شود
  return <ProfileForm key={`${user.display_name || ''}|${user.email || ''}`} user={user} />
}

function ProfileForm({ user }) {
  const { mutate: save, isPending, error } = useUpdateProfile()
  const [displayName, setDisplayName] = useState(user.display_name || '')
  const [email, setEmail] = useState(user.email || '')

  const fieldErrors = error?.response?.data || {}
  const firstError = (key) => (Array.isArray(fieldErrors[key]) ? fieldErrors[key][0] : fieldErrors[key])
  const dirty = (user?.display_name || '') !== displayName.trim() || (user?.email || '') !== email.trim()

  function onSubmit(e) {
    e.preventDefault()
    save({ display_name: displayName.trim(), email: email.trim() })
  }

  return (
    <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-[720px]">
        <header className="mb-5 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(20,35,65,.045)] sm:p-7">
          <h1 className="text-xl font-extrabold text-[#101827] sm:text-2xl">پروفایل</h1>
          <p className="mt-2 text-sm leading-7 text-[#68758a]">نامی که وارد می‌کنید در جلسه‌ها و فهرست حاضرین نمایش داده می‌شود. تکمیل این بخش اختیاری است.</p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(20,35,65,.045)] sm:p-7">
          <Input label="نام و نام خانوادگی" placeholder="مثلاً علی رضایی" icon={User} value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={firstError('display_name')} maxLength={150} className="meet-auth-input" />
          <Input label="ایمیل (اختیاری)" type="email" placeholder="example@email.com" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} error={firstError('email')} dir="ltr" className="meet-auth-input" />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-[#536074]">شماره موبایل</span>
            <div className="flex items-center gap-2 rounded-xl border border-[#e1e6ef] bg-[#f2f5fa] px-4 py-3 text-[#53627b]">
              <Phone className="h-4 w-4 text-[#8d98aa]" />
              <span dir="ltr" className="flex-1 text-right">{user?.phone_number || '—'}</span>
              {user?.phone_verified && <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f8f6e]"><BadgeCheck className="h-4 w-4" /> تأییدشده</span>}
            </div>
            <p className="text-[11px] text-[#8d98aa]">شماره‌ی ورود قابل تغییر نیست.</p>
          </div>
          <div className="flex justify-end"><Button type="submit" size="md" loading={isPending} disabled={!dirty}>ذخیره</Button></div>
        </form>
      </div>
    </div>
  )
}
