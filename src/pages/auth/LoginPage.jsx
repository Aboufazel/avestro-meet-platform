import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
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
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  })

  const onSubmit = (data) => login(data)

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-[#4f7cff]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-[#54d9b0]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid lg:grid-cols-[.92fr_1.08fr] gap-5 items-stretch relative">
        <div className="hidden lg:flex rounded-[30px] meet-dark-panel p-10 flex-col justify-between min-h-[650px] overflow-hidden relative">
          <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-[#54d9b0]/10 blur-3xl" />
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/avestro-logo.png" alt="اَوسترو" className="w-11 h-11 rounded-xl" />
              <div><p className="font-bold text-sm">اَوسترو میت</p><p className="text-[10px] text-white/35 mt-1 tracking-wide">AVESTRO MEET</p></div>
            </Link>
            <div className="mt-20">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[.05] border border-white/[.08] px-3 py-1.5 text-xs text-[#9eb6ff]">
                <Sparkles className="w-3.5 h-3.5" /> فضای حرفه‌ای جلسه
              </span>
              <h1 className="text-4xl font-bold leading-[1.35] mt-5">جلسه‌ات را<br /><span className="text-[#7be7c7]">با تمرکز شروع کن.</span></h1>
              <p className="text-sm text-white/45 leading-8 mt-5 max-w-sm">از همان هویت بصری اتاق جلسه تا داشبورد؛ همه‌چیز در یک تجربه یکپارچه طراحی شده است.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 relative">
            <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-4"><ShieldCheck className="w-5 h-5 text-[#54d9b0]" /><p className="text-xs font-medium mt-3">حریم خصوصی</p><p className="text-[10px] text-white/35 mt-1">کنترل دسترسی جلسه</p></div>
            <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-4"><Lock className="w-5 h-5 text-[#6c93ff]" /><p className="text-xs font-medium mt-3">ورود امن</p><p className="text-[10px] text-white/35 mt-1">حساب و فضای شخصی</p></div>
          </div>
        </div>

        <div className="bg-white border border-[#e5eaf2] rounded-[30px] p-6 sm:p-9 shadow-[0_24px_80px_rgba(20,35,65,.08)] flex flex-col justify-center">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-3"><img src="/avestro-logo.png" alt="اَوسترو" className="w-10 h-10 rounded-xl" /><span className="font-bold text-sm">اَوسترو میت</span></Link>
            <Link to="/" className="text-xs text-[#68758a] inline-flex items-center gap-1">خانه <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>

          <div className="max-w-md w-full mx-auto">
            <p className="text-xs text-[#4f7cff] font-medium mb-2">خوش برگشتی</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">ورود به حساب</h2>
            <p className="text-sm text-[#8d98aa] mt-2 mb-8">برای ادامه وارد فضای کاری اَوسترو میت شوید.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <Input label="نام کاربری" placeholder="نام کاربری یا ایمیل خود را وارد کنید" icon={Mail} error={errors.username?.message} {...register('username')} className="meet-auth-input" />
              <Input label="رمز عبور" type="password" placeholder="رمز عبور خود را وارد کنید" icon={Lock} error={errors.password?.message} {...register('password')} className="meet-auth-input" />
              <Button type="submit" fullWidth size="lg" loading={isPending} className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !shadow-[0_12px_28px_rgba(79,124,255,.22)] !rounded-xl !py-3.5">ورود به جلسه</Button>
            </form>

            <div className="flex items-center gap-3 my-7"><div className="h-px flex-1 bg-[#e9edf3]" /><span className="text-[10px] text-[#b0b8c6]">اَوسترو میت</span><div className="h-px flex-1 bg-[#e9edf3]" /></div>
            <p className="text-center text-sm text-[#68758a]">حساب ندارید؟ <Link to={appRoutes.auth.register} className="text-[#4f7cff] font-medium hover:text-[#315fdc]">ثبت‌نام کنید</Link></p>
            <Link to="/" className="mt-5 mx-auto w-fit text-xs text-[#8d98aa] hover:text-[#4f7cff] inline-flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> بازگشت به صفحه اصلی</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
