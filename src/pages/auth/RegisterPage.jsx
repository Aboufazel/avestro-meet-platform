import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ArrowRight, Mail, Lock, User, Phone, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRegister } from '../../hooks/useAuth'
import { appRoutes } from '../../routes/appRoutes'

const emailSchema = yup.object({
  display_name: yup.string().required('نام نمایشی الزامی است'),
  username: yup.string().required('نام کاربری الزامی است').min(3, 'حداقل ۳ کاراکتر').matches(/^[a-zA-Z0-9._]+$/, 'فقط حروف انگلیسی، اعداد، نقطه و آندرلاین'),
  email: yup.string().required('ایمیل الزامی است').email('ایمیل معتبر وارد کنید'),
  password: yup.string().required('رمز عبور الزامی است').min(8, 'حداقل ۸ کاراکتر'),
  confirm_password: yup.string().required('تکرار رمز عبور الزامی است').oneOf([yup.ref('password')], 'رمز عبور مطابقت ندارد'),
})
const phoneSchema = yup.object({
  display_name: yup.string().required('نام نمایشی الزامی است'),
  username: yup.string().required('نام کاربری الزامی است').min(3, 'حداقل ۳ کاراکتر').matches(/^[a-zA-Z0-9._]+$/, 'فقط حروف انگلیسی، اعداد، نقطه و آندرلاین'),
  phone_number: yup.string().required('شماره موبایل الزامی است').matches(/^09[0-9]{9}$/, 'شماره موبایل معتبر وارد کنید (مثال: 09123456789)'),
  password: yup.string().required('رمز عبور الزامی است').min(8, 'حداقل ۸ کاراکتر'),
  confirm_password: yup.string().required('تکرار رمز عبور الزامی است').oneOf([yup.ref('password')], 'رمز عبور مطابقت ندارد'),
})
const tabs = [{ id: 'email', label: 'با ایمیل', icon: Mail }, { id: 'phone', label: 'با موبایل', icon: Phone }]

export default function RegisterPage() {
  const { mutate: register, isPending } = useRegister()
  const [activeTab, setActiveTab] = useState('email')
  const { register: formRegister, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(activeTab === 'email' ? emailSchema : phoneSchema) })

  function handleTabChange(tab) { setActiveTab(tab); reset() }
  function onSubmit({ confirm_password, ...data }) { register({ ...data, register_type: activeTab }) }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#54d9b0]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-[#4f7cff]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl grid lg:grid-cols-[1.08fr_.92fr] gap-5 items-stretch relative">
        <div className="bg-white border border-[#e5eaf2] rounded-[30px] p-6 sm:p-9 shadow-[0_24px_80px_rgba(20,35,65,.08)] order-2 lg:order-1">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-7">
              <div><p className="text-xs text-[#4f7cff] font-medium mb-2">شروع فضای کاری</p><h2 className="text-2xl sm:text-3xl font-bold">ایجاد حساب جدید</h2></div>
              <Link to="/" className="text-xs text-[#8d98aa] hover:text-[#4f7cff] inline-flex items-center gap-1">خانه <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#f5f7fb] rounded-2xl p-1.5 border border-[#e8ecf2] mb-6">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => handleTabChange(id)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-[#101827] shadow-[0_4px_14px_rgba(20,35,65,.07)] border border-[#e6eaf1]' : 'text-[#8d98aa] hover:text-[#68758a]'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input label="نام نمایشی" placeholder="نامی که دیگران می‌بینند" icon={User} error={errors.display_name?.message} {...formRegister('display_name')} className="meet-auth-input" />
              <Input label="نام کاربری" placeholder="username" icon={User} error={errors.username?.message} {...formRegister('username')} className="meet-auth-input" />
              {activeTab === 'email' ? <Input label="ایمیل" type="email" placeholder="example@email.com" icon={Mail} error={errors.email?.message} {...formRegister('email')} className="meet-auth-input" /> : <Input label="شماره موبایل" type="tel" placeholder="09123456789" icon={Phone} error={errors.phone_number?.message} {...formRegister('phone_number')} className="meet-auth-input" />}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="رمز عبور" type="password" placeholder="حداقل ۸ کاراکتر" icon={Lock} error={errors.password?.message} {...formRegister('password')} className="meet-auth-input" />
                <Input label="تکرار رمز عبور" type="password" placeholder="تکرار رمز" icon={Lock} error={errors.confirm_password?.message} {...formRegister('confirm_password')} className="meet-auth-input" />
              </div>
              <Button type="submit" fullWidth size="lg" loading={isPending} className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !shadow-[0_12px_28px_rgba(79,124,255,.22)] !rounded-xl !py-3.5">ساخت حساب و ورود</Button>
            </form>

            <p className="text-center text-sm text-[#68758a] mt-6">حساب دارید؟ <Link to={appRoutes.auth.login} className="text-[#4f7cff] font-medium">وارد شوید</Link></p>
          </div>
        </div>

        <div className="hidden lg:flex meet-dark-panel rounded-[30px] p-10 flex-col justify-between order-1 lg:order-2 overflow-hidden relative">
          <div className="absolute -right-28 -top-28 w-80 h-80 rounded-full bg-[#4f7cff]/10 blur-3xl" />
          <div>
            <Link to="/" className="flex items-center gap-3"><img src="/avestro-logo.png" alt="اَوسترو" className="w-11 h-11 rounded-xl" /><div><p className="font-bold text-sm">اَوسترو میت</p><p className="text-[10px] text-white/35 mt-1 tracking-wide">AVESTRO MEET</p></div></Link>
            <div className="mt-20"><span className="inline-flex items-center gap-2 rounded-full bg-white/[.05] border border-white/[.08] px-3 py-1.5 text-xs text-[#7be7c7]"><Sparkles className="w-3.5 h-3.5" /> آماده‌ی یک تجربه تازه</span><h1 className="text-4xl font-bold leading-[1.35] mt-5">فضای کاری تو،<br /><span className="text-[#9eb6ff]">یک قدم ساده‌تر.</span></h1><p className="text-sm text-white/45 leading-8 mt-5 max-w-sm">حساب خودت را بساز و جلسه‌ها، اتاق‌ها و رویدادها را از یک فضای مرتب مدیریت کن.</p></div>
          </div>
          <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#e8faf4]/10 text-[#7be7c7] flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div><div><p className="text-sm font-medium">یک حساب، یک تجربه</p><p className="text-[10px] text-white/35 mt-1">دسکتاپ و موبایل با یک زبان بصری</p></div></div></div>
        </div>
      </div>
    </div>
  )
}
