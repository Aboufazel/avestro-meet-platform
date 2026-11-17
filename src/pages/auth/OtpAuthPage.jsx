import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gift, Phone, ShieldCheck, Sparkles, User, KeyRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useOtpRequest, useOtpVerify } from '../../hooks/useAuth'
import { appRoutes } from '../../routes/appRoutes'
import { OTP_CODE_LENGTH as CODE_LENGTH, PHONE_RE, faNumber as fa, toEnDigits } from '../../utils/phoneInput'

/**
 * ورود و ثبت‌نام یکسان: شماره‌ی موبایل ← کد پیامکی. mode فقط متن‌ها و فیلد نام اختیاری را عوض می‌کند.
 */
export default function OtpAuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [referralCode, setReferralCode] = useState(() => new URLSearchParams(window.location.search).get('ref') || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const codeRef = useRef(null)
  const { mutate: requestCode, isPending: requesting } = useOtpRequest()
  const { mutate: verify, isPending: verifying } = useOtpVerify()
  const hasFreePlan = Boolean(new URLSearchParams(window.location.search).get('free'))
  const search = window.location.search

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  const normalizedPhone = toEnDigits(phone).replace(/\s/g, '')

  function sendCode(e) {
    e?.preventDefault()
    if (!PHONE_RE.test(normalizedPhone)) { setError('شماره موبایل معتبر وارد کنید (مثال: 09123456789)'); return }
    setError('')
    requestCode(normalizedPhone, {
      onSuccess: (data) => { setStep('code'); setCode(''); setResendIn(data?.resend_in ?? 60) },
      onError: (err) => { const wait = err.response?.data?.retry_after; if (err.response?.status === 429 && wait && wait <= 300) { setStep('code'); setResendIn(wait) } },
    })
  }

  function submitCode(e) {
    e?.preventDefault()
    const clean = toEnDigits(code).replace(/\D/g, '')
    if (clean.length !== CODE_LENGTH) { setError(`کد ${fa(CODE_LENGTH)} رقمی را کامل وارد کنید`); return }
    setError('')
    verify({ phone: normalizedPhone, code: clean, display_name: name.trim(), referral_code: referralCode.trim() })
  }

  function onCodeChange(e) {
    const clean = toEnDigits(e.target.value).replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(clean)
    if (clean.length === CODE_LENGTH && !verifying) verify({ phone: normalizedPhone, code: clean, display_name: name.trim(), referral_code: referralCode.trim() })
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#101827] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#54d9b0]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-[#4f7cff]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid lg:grid-cols-[1.08fr_.92fr] gap-5 items-stretch relative">
        <div className="bg-white border border-[#e5eaf2] rounded-[30px] p-6 sm:p-9 shadow-[0_24px_80px_rgba(20,35,65,.08)] order-2 lg:order-1 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between mb-7">
              <div>
                <p className="text-xs text-[#4f7cff] font-medium mb-2">{isRegister ? 'شروع فضای کاری' : 'خوش برگشتی'}</p>
                <h2 className="text-2xl sm:text-3xl font-bold">{isRegister ? 'ساخت حساب با موبایل' : 'ورود با موبایل'}</h2>
              </div>
              <Link to="/" className="text-xs text-[#8d98aa] hover:text-[#4f7cff] inline-flex items-center gap-1">خانه <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            {hasFreePlan && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#bfeedd] bg-[#e8faf4] px-4 py-3 text-sm text-[#1f8f6e]">
                <Gift className="w-5 h-5 shrink-0" /> بعد از تأیید شماره، پلن رایگان شما فعال می‌شود.
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
                <Input label="شماره موبایل" type="tel" inputMode="numeric" autoComplete="tel" placeholder="09123456789" icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} error={error} className="meet-auth-input" dir="ltr" />
                {isRegister && <Input label="نام و نام خانوادگی (اختیاری)" placeholder="نامی که دیگران می‌بینند" icon={User} value={name} onChange={(e) => setName(e.target.value)} className="meet-auth-input" />}
                {isRegister && <Input label="کد معرف (اختیاری)" placeholder="کد معرف دوستتان" icon={Gift} value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="meet-auth-input" />}
                <Button type="submit" fullWidth size="lg" loading={requesting} className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !shadow-[0_12px_28px_rgba(79,124,255,.22)] !rounded-xl !py-3.5">دریافت کد تأیید</Button>
                <p className="text-xs leading-6 text-[#8d98aa] text-center">کد تأیید به شماره شما پیامک می‌شود؛ بدون نیاز به رمز عبور.</p>
              </form>
            ) : (
              <form onSubmit={submitCode} className="flex flex-col gap-4" noValidate>
                <p className="text-sm text-[#536074] leading-7">کد {fa(CODE_LENGTH)} رقمی به شماره <span dir="ltr" className="font-bold text-[#101827]">{normalizedPhone}</span> ارسال شد.</p>
                <Input ref={codeRef} label="کد تأیید" inputMode="numeric" autoComplete="one-time-code" placeholder="- - - - -" icon={KeyRound} value={code} onChange={onCodeChange} error={error} className="meet-auth-input" dir="ltr" maxLength={CODE_LENGTH + 2} />
                <Button type="submit" fullWidth size="lg" loading={verifying} className="!bg-gradient-to-l !from-[#4f7cff] !to-[#6a8fff] !text-white !border-0 !shadow-[0_12px_28px_rgba(79,124,255,.22)] !rounded-xl !py-3.5">{isRegister ? 'تأیید و ساخت حساب' : 'تأیید و ورود'}</Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setStep('phone'); setError(''); setCode('') }} className="text-[#68758a] hover:text-[#4f7cff]">ویرایش شماره</button>
                  {resendIn > 0
                    ? <span className="text-[#8d98aa]">ارسال مجدد تا {fa(resendIn)} ثانیه دیگر</span>
                    : <button type="button" onClick={sendCode} disabled={requesting} className="text-[#4f7cff] font-medium">ارسال مجدد کد</button>}
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 my-7"><div className="h-px flex-1 bg-[#e9edf3]" /><span className="text-[10px] text-[#b0b8c6]">اَوسترو میت</span><div className="h-px flex-1 bg-[#e9edf3]" /></div>
            <div className="flex flex-col items-center gap-2 text-sm text-[#68758a]">
              {isRegister
                ? <p>حساب دارید؟ <Link to={`${appRoutes.auth.login}${search}`} className="text-[#4f7cff] font-medium">وارد شوید</Link></p>
                : <><p>حساب ندارید؟ <Link to={`${appRoutes.auth.register}${search}`} className="text-[#4f7cff] font-medium">ثبت‌نام کنید</Link></p>
                    <Link to={`${appRoutes.auth.passwordLogin}${search}`} className="text-xs text-[#8d98aa] hover:text-[#4f7cff]">ورود با رمز عبور (حساب‌های قبلی)</Link></>}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex meet-dark-panel rounded-[30px] p-10 flex-col justify-between order-1 lg:order-2 overflow-hidden relative">
          <div className="absolute -right-28 -top-28 w-80 h-80 rounded-full bg-[#4f7cff]/10 blur-3xl" />
          <div>
            <Link to="/" className="flex items-center gap-3"><img src="/avestro-logo.png" alt="اَوسترو" className="w-11 h-11 rounded-xl" /><div><p className="font-bold text-sm">اَوسترو میت</p><p className="text-[10px] text-white/35 mt-1 tracking-wide">AVESTRO MEET</p></div></Link>
            <div className="mt-20"><span className="inline-flex items-center gap-2 rounded-full bg-white/[.05] border border-white/[.08] px-3 py-1.5 text-xs text-[#7be7c7]"><Sparkles className="w-3.5 h-3.5" /> فقط با شماره موبایل</span><h1 className="text-4xl font-bold leading-[1.35] mt-5">ورود سریع،<br /><span className="text-[#9eb6ff]">بدون رمز عبور.</span></h1><p className="text-sm text-white/45 leading-8 mt-5 max-w-sm">شماره‌ات را بزن، کد پیامکی را وارد کن و جلسه‌ات را شروع کن.</p></div>
          </div>
          <div className="rounded-2xl bg-white/[.05] border border-white/[.07] p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#e8faf4]/10 text-[#7be7c7] flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div><div><p className="text-sm font-medium">ورود امن</p><p className="text-[10px] text-white/35 mt-1">کد یک‌بارمصرف و محدود به ۲ دقیقه</p></div></div></div>
        </div>
      </div>
    </div>
  )
}
