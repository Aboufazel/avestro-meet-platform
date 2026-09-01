import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Mail, Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useLogin } from '../../hooks/useAuth'
import { appRoutes } from '../../routes/appRoutes'

const schema = yup.object({
  username: yup.string().required('نام کاربری الزامی است'),
  password: yup.string().required('رمز عبور الزامی است'),
})

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  })


  const onSubmit = (data)=>{
    login(data)
  }
  return (
    <div className="min-h-screen bg-olive-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/avestro-logo.png" alt="اَوسترو" className="w-16 h-16 mb-4" />
          <h1 className="text-olive-100 text-2xl font-bold">اَوسترو میت</h1>
          <p className="text-olive-500 text-sm mt-1">سمینارهای آنلاین حرفه‌ای</p>
        </div>

        <div className="bg-olive-900 border border-olive-700 rounded-2xl p-8">
          <h2 className="text-olive-100 font-bold text-lg mb-6">ورود به حساب</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="نام کاربری"
              placeholder="نام کاربری یا ایمیل خود را وارد کنید"
              icon={Mail}
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="رمز عبور"
              type="password"
              placeholder="رمز عبور خود را وارد کنید"
              icon={Lock}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth size="lg" loading={isPending}>
              ورود
            </Button>
          </form>

          <p className="text-center text-sm text-olive-600 mt-6">
            حساب ندارید؟{' '}
            <Link to={appRoutes.auth.register} className="text-olive-400 hover:text-olive-200 transition-colors">
              ثبت‌نام کنید
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}