import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ArrowRight, Calendar, Clock, Users, Loader2, ShieldCheck, Video, UserRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useRoom } from '../../hooks/useRooms'
import { appRoutes } from '../../routes/appRoutes'

const guestSchema = yup.object({ guest_name: yup.string().required('نام الزامی است').min(2, 'حداقل ۲ کاراکتر') })
const statusConfig = {
  live: { label: 'در جریان', dot: 'bg-[#54d9b0]', tone: 'text-[#239c79]', bg: 'bg-[#e8faf4]' },
  scheduled: { label: 'زمان‌بندی شده', dot: 'bg-[#4f7cff]', tone: 'text-[#4f7cff]', bg: 'bg-[#edf2ff]' },
  ended: { label: 'پایان یافته', dot: 'bg-[#9aa4b4]', tone: 'text-[#68758a]', bg: 'bg-[#f1f3f6]' },
}

export default function JoinPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const [mode, setMode] = useState(token ? 'select' : 'guest')
  const { data: room, isLoading, isError } = useRoom(slug)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(guestSchema) })

  const handleJoinAsUser = () => navigate(`/room/${slug}`)
  const handleJoinAsGuest = (data) => { sessionStorage.setItem('guest_name', data.guest_name); navigate(`/room/${slug}`) }

  if (isLoading) return <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center"><div className="w-12 h-12 rounded-2xl bg-white border border-[#e5eaf2] shadow-lg flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#4f7cff] animate-spin" /></div></div>

  if (isError || !room) return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-96 h-96 rounded-full bg-[#4f7cff]/10 blur-3xl -top-40 -right-40" />
      <div className="relative bg-white border border-[#e5eaf2] rounded-[28px] p-8 max-w-md w-full text-center shadow-[0_24px_70px_rgba(20,35,65,.08)]">
        <img src="/avestro-logo.png" alt="اَوسترو" className="w-12 h-12 mx-auto rounded-xl mb-5" />
        <p className="text-lg sm:text-xl font-bold">رویداد یافت نشد</p><p className="text-sm text-[#8d98aa] mt-2 mb-7">لینک اشتباه است یا رویداد حذف شده است.</p>
        <Link to="/"><Button variant="secondary" className="!text-[#101827] !border-[#e5eaf2] !bg-white hover:!bg-[#edf2ff]">بازگشت به خانه</Button></Link>
      </div>
    </div>
  )

  const status = statusConfig[room.status] || statusConfig.scheduled

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827] relative overflow-hidden py-2.5 sm:py-8 px-3 sm:px-4">
      <div className="absolute -top-44 -right-44 w-[34rem] h-[34rem] rounded-full bg-[#4f7cff]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-44 -left-44 w-[34rem] h-[34rem] rounded-full bg-[#54d9b0]/10 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <header className="flex items-center justify-between mb-3 sm:mb-5 px-1">
          <Link to="/" className="flex items-center gap-3"><img src="/avestro-logo.png" alt="اَوسترو" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" /><div><p className="font-bold text-sm">اَوسترو میت</p><p className="text-[9px] text-[#9aa4b4] mt-0.5 tracking-wide">AVESTRO MEET</p></div></Link>
          <Link to="/" className="text-xs text-[#68758a] hover:text-[#4f7cff] inline-flex items-center gap-1.5">صفحه اصلی <ArrowRight className="w-3.5 h-3.5" /></Link>
        </header>

        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-3 sm:gap-4 items-stretch">
          <section className="meet-dark-panel rounded-[22px] sm:rounded-[28px] p-4 sm:p-9 min-h-0 lg:min-h-[470px] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-[#4f7cff]/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs bg-white/[.05] border border-white/[.08] text-white/65"><span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${room.status === 'live' ? 'animate-pulse' : ''}`} /> {status.label}</div>
              <h1 className="text-2xl sm:text-4xl font-bold mt-4 sm:mt-7 leading-tight">{room.title}</h1>
              {room.description && <p className="text-sm text-white/45 leading-7 mt-4 max-w-xl">{room.description}</p>}
            </div>
            <div className="relative grid grid-cols-2 gap-2 sm:gap-3 mt-5 sm:mt-10">
              <div className="rounded-xl sm:rounded-2xl bg-white/[.05] border border-white/[.07] p-3 sm:p-4"><Users className="w-4 h-4 text-[#54d9b0]" /><p className="text-lg font-bold mt-3">{room.active_participants_count || 0}<span className="text-white/25 text-sm font-normal"> / {room.max_participants}</span></p><p className="text-[10px] text-white/35 mt-1">شرکت‌کننده</p></div>
              <div className="rounded-xl sm:rounded-2xl bg-white/[.05] border border-white/[.07] p-3 sm:p-4"><Video className="w-4 h-4 text-[#9eb6ff]" /><p className="text-sm font-medium mt-3">جلسه آنلاین</p><p className="text-[10px] text-white/35 mt-1">آماده ورود</p></div>
              {room.scheduled_at && <div className="col-span-2 rounded-2xl bg-white/[.04] border border-white/[.07] p-4 flex flex-wrap gap-5 text-xs text-white/50"><span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-[#6c93ff]" />{new Date(room.scheduled_at).toLocaleDateString('fa-IR')}</span><span className="inline-flex items-center gap-2"><Clock className="w-4 h-4 text-[#54d9b0]" />{new Date(room.scheduled_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></div>}
            </div>
          </section>

          <section className="bg-white border border-[#e5eaf2] rounded-[22px] sm:rounded-[28px] p-4 sm:p-8 shadow-[0_24px_70px_rgba(20,35,65,.07)] flex flex-col justify-center">
            {room.status === 'ended' ? (
              <div className="text-center"><div className="w-14 h-14 rounded-2xl bg-[#f1f3f6] text-[#68758a] mx-auto flex items-center justify-center"><Clock className="w-6 h-6" /></div><p className="font-bold text-lg mt-5">این رویداد پایان یافته است</p><p className="text-xs text-[#8d98aa] mt-2 mb-4 sm:mb-6">برای مشاهده جلسات دیگر به صفحه اصلی برگردید.</p><Link to="/"><Button variant="secondary" className="!text-[#101827] !border-[#e5eaf2] !bg-white hover:!bg-[#edf2ff]">بازگشت به خانه</Button></Link></div>
            ) : mode === 'select' ? (
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#edf2ff] text-[#4f7cff] flex items-center justify-center mb-5"><UserRound className="w-5 h-5" /></div>
                <h2 className="text-lg sm:text-xl font-bold">ورود به جلسه</h2><p className="text-xs text-[#8d98aa] mt-2 mb-4 sm:mb-6">روش ورود خود را انتخاب کنید.</p>
                {token ? (
                  <>
                    <div className="flex items-center gap-3 p-3.5 bg-[#f8faff] rounded-2xl border border-[#e5eaf2] mb-3"><Avatar name={user?.display_name || user?.username} size="sm" /><div className="min-w-0"><p className="text-sm font-medium truncate">{user?.display_name || user?.username}</p><p className="text-[11px] text-[#9aa4b4] truncate mt-1">{user?.email}</p></div><span className="mr-auto w-2 h-2 rounded-full bg-[#54d9b0]" /></div>
                    <Button fullWidth size="lg" onClick={handleJoinAsUser} className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !rounded-xl">ورود با حساب کاربری</Button>
                    <Button fullWidth variant="ghost" onClick={() => setMode('guest')} className="!text-[#68758a] hover:!bg-[#f4f7fb] mt-2">ورود به عنوان مهمان</Button>
                  </>
                ) : (
                  <>
                    <Link to={`${appRoutes.auth.login}?next=/join/${slug}`} className="w-full block"><Button fullWidth size="lg" className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !rounded-xl">ورود با حساب کاربری</Button></Link>
                    <Button fullWidth variant="secondary" size="lg" onClick={() => setMode('guest')} className="!text-[#101827] !border-[#e5eaf2] !bg-white hover:!bg-[#edf2ff] mt-2">ورود به عنوان مهمان</Button>
                  </>
                )}
                <div className="flex items-center justify-center gap-2 text-[10px] text-[#9aa4b4] mt-7"><ShieldCheck className="w-3.5 h-3.5 text-[#54d9b0]" /> ورود امن و بدون پیچیدگی</div>
              </div>
            ) : (
              <div>
                <button onClick={() => setMode(token ? 'select' : 'guest')} className="text-xs text-[#8d98aa] hover:text-[#4f7cff] inline-flex items-center gap-1 mb-6"><ArrowRight className="w-3.5 h-3.5" /> بازگشت</button>
                <h2 className="text-lg sm:text-xl font-bold">ورود به عنوان مهمان</h2><p className="text-xs text-[#8d98aa] mt-2 mb-4 sm:mb-6">نامی که سایر شرکت‌کنندگان در جلسه می‌بینند.</p>
                <form onSubmit={handleSubmit(handleJoinAsGuest)} className="flex flex-col gap-4"><Input label="نام شما" placeholder="مثلاً عباس" error={errors.guest_name?.message} {...register('guest_name')} className="meet-auth-input" /><Button type="submit" fullWidth size="lg" className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !rounded-xl">ورود به جلسه</Button></form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
