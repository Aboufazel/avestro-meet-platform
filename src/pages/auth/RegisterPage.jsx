import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Mail, Lock, User } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRegister } from '../../hooks/useAuth'
import { appRoutes } from '../../routes/appRoutes'

const schema = yup.object({
  display_name: yup.string().required('نام نمایشی الزامی است'),
  username: yup.string()
    .required('نام کاربری الزامی است')
    .min(3, 'حداقل ۳ کاراکتر')
    .matches(/^[a-zA-Z0-9._]+$/, 'فقط حروف انگلیسی، اعداد، نقطه و آندرلاین'),
  email: yup.string().required('ایمیل الزامی است').email('ایمیل معتبر وارد کنید'),
  password: yup.string().required('رمز عبور الزامی است').min(8, 'حداقل ۸ کاراکتر'),
  confirm_password: yup.string()
    .required('تکرار رمز عبور الزامی است')
    .oneOf([yup.ref('password')], 'رمز عبور مطابقت ندارد'),
})

export default function RegisterPage() {
  const { mutate: register, isPending } = useRegister()

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  })

  function onSubmit({ confirm_password, ...data }) {
    register(data)
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
          <h2 className="text-olive-100 font-bold text-lg mb-6">ایجاد حساب جدید</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="نام نمایشی"
              placeholder="نامی که دیگران می‌بینند"
              icon={User}
              error={errors.display_name?.message}
              {...formRegister('display_name')}
            />
            <Input
              label="نام کاربری"
              placeholder="username"
              icon={User}
              error={errors.username?.message}
              {...formRegister('username')}
            />
            <Input
              label="ایمیل"
              type="email"
              placeholder="example@email.com"
              icon={Mail}
              error={errors.email?.message}
              {...formRegister('email')}
            />
            <Input
              label="رمز عبور"
              type="password"
              placeholder="حداقل ۸ کاراکتر"
              icon={Lock}
              error={errors.password?.message}
              {...formRegister('password')}
            />
            <Input
              label="تکرار رمز عبور"
              type="password"
              placeholder="رمز عبور را تکرار کنید"
              icon={Lock}
              error={errors.confirm_password?.message}
              {...formRegister('confirm_password')}
            />
            <Button type="submit" fullWidth size="lg" loading={isPending}>
              ثبت‌نام
            </Button>
          </form>

          <p className="text-center text-sm text-olive-600 mt-6">
            حساب دارید؟{' '}
            <Link to={appRoutes.auth.login} className="text-olive-400 hover:text-olive-200 transition-colors">
              وارد شوید
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}