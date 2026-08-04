import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Video, AtSign } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-olive-500']
  const labels = ['ضعیف', 'متوسط', 'خوب', 'قوی']

  if (!password) return null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-olive-800'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-olive-500">قدرت رمز: {labels[score - 1] || 'ضعیف'}</p>
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.displayName.trim()) e.displayName = 'نام نمایشی الزامی است'
    if (!form.username.trim()) e.username = 'نام کاربری الزامی است'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'ایمیل معتبر وارد کنید'
    if (form.password.length < 6) e.password = 'رمز عبور حداقل ۶ کاراکتر باشد'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'رمز عبور تطابق ندارد'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1400))
    login(
      { displayName: form.displayName, username: form.username, email: form.email },
      'mock-token-456'
    )
    toast.success('ثبت‌نام با موفقیت انجام شد!')
    navigate('/dashboard')
    setLoading(false)
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="min-h-screen bg-olive-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-olive-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-olive-950" />
            </div>
            <span className="text-olive-100 font-medium">اَوسترو میت</span>
          </Link>
          <h1 className="text-olive-100 mb-2" style={{ fontWeight: 700 }}>ایجاد حساب کاربری</h1>
          <p className="text-olive-500 text-sm">رایگان شروع کنید</p>
        </div>

        <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="نام نمایشی"
              icon={User}
              placeholder="مثال: علی رضایی"
              value={form.displayName}
              onChange={set('displayName')}
              error={errors.displayName}
              name="displayName"
            />
            <Input
              label="نام کاربری"
              icon={AtSign}
              placeholder="مثال: ali_rezaei"
              value={form.username}
              onChange={set('username')}
              error={errors.username}
              name="username"
            />
            <Input
              label="ایمیل"
              icon={Mail}
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              name="email"
            />
            <div className="flex flex-col gap-1.5">
              <Input
                label="رمز عبور"
                icon={Lock}
                type="password"
                placeholder="حداقل ۶ کاراکتر"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                name="password"
              />
              <PasswordStrength password={form.password} />
            </div>
            <Input
              label="تکرار رمز عبور"
              icon={Lock}
              type="password"
              placeholder="رمز عبور را دوباره وارد کنید"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
              name="confirmPassword"
            />

            <Button type="submit" loading={loading} fullWidth>
              ایجاد حساب
            </Button>
          </form>
        </div>

        <p className="text-center text-olive-500 text-sm mt-5">
          حساب کاربری دارید؟{' '}
          <Link to="/login" className="text-olive-400 hover:text-olive-200 transition-colors">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  )
}
