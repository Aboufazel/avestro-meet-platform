import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Video } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'نام کاربری الزامی است'
    if (form.password.length < 6) e.password = 'رمز عبور حداقل ۶ کاراکتر باشد'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    login(
      { displayName: 'کاربر نمونه', username: form.username, email: `${form.username}@example.com` },
      'mock-token-123'
    )
    toast.success('ورود موفق! خوش آمدید')
    navigate('/dashboard')
    setLoading(false)
  }

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

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
          <h1 className="text-olive-100 mb-2" style={{ fontWeight: 700 }}>ورود به حساب</h1>
          <p className="text-olive-500 text-sm">خوش آمدید، وارد شوید</p>
        </div>

        <div className="bg-olive-900 border border-olive-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="نام کاربری یا ایمیل"
              icon={User}
              placeholder="username@example.com"
              value={form.username}
              onChange={set('username')}
              error={errors.username}
              name="username"
            />
            <Input
              label="رمز عبور"
              icon={Lock}
              type="password"
              placeholder="رمز عبور خود را وارد کنید"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              name="password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={set('remember')}
                  className="w-4 h-4 rounded border-olive-700 bg-olive-800 accent-olive-500"
                />
                <span className="text-olive-400 text-sm">مرا به خاطر بسپار</span>
              </label>
              <a href="#" className="text-olive-500 hover:text-olive-300 text-sm transition-colors">
                فراموشی رمز عبور
              </a>
            </div>

            <Button type="submit" loading={loading} fullWidth>
              ورود به حساب
            </Button>
          </form>
        </div>

        <p className="text-center text-olive-500 text-sm mt-5">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="text-olive-400 hover:text-olive-200 transition-colors">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  )
}
