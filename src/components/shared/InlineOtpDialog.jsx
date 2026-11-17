import { useEffect, useRef, useState } from 'react'
import { KeyRound, Phone, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/auth'
import { OTP_CODE_LENGTH, PHONE_RE, faNumber, toEnDigits } from '../../utils/phoneInput'

const errText = (error, fallback) => {
  const detail = error?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}

/**
 * ورود/ثبت‌نام درجا با شماره و کد پیامکی (بدون ترک صفحه)؛ بعد از تأیید، onVerified(data) صدا زده می‌شود.
 * نام اختیاری است و بعداً در پروفایل تکمیل می‌شود.
 */
export default function InlineOtpDialog({ open, onClose, onVerified, title = 'تأیید شماره موبایل' }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const verifyingRef = useRef(false)
  const normalized = toEnDigits(phone).replace(/\s/g, '')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open, step])

  if (!open) return null

  async function sendCode(e) {
    e?.preventDefault()
    if (!PHONE_RE.test(normalized)) { setError('شماره موبایل معتبر وارد کنید (مثال: 09123456789)'); return }
    setError(''); setBusy(true)
    try {
      const { data } = await authService.otpRequest(normalized)
      setStep('code'); setCode(''); setResendIn(data?.resend_in ?? 60)
    } catch (err) {
      const wait = err.response?.data?.retry_after
      if (err.response?.status === 429 && wait && wait <= 300) { setStep('code'); setResendIn(wait) }
      setError(errText(err, 'ارسال کد ناموفق بود'))
    } finally { setBusy(false) }
  }

  async function verify(value) {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setError(''); setBusy(true)
    try {
      const { data } = await authService.otpVerify({ phone: normalized, code: value })
      await onVerified(data)
    } catch (err) {
      setError(errText(err, 'کد واردشده درست نیست.'))
      toast.dismiss()
    } finally { setBusy(false); verifyingRef.current = false }
  }

  function onCodeChange(e) {
    const clean = toEnDigits(e.target.value).replace(/\D/g, '').slice(0, OTP_CODE_LENGTH)
    setCode(clean)
    if (clean.length === OTP_CODE_LENGTH) verify(clean)
  }

  const field = 'mt-2 min-h-12 w-full rounded-xl border border-[#dce4f1] bg-white px-3 text-left text-base outline-none focus:border-[#315bd5] focus:ring-4 focus:ring-[#4f7cff]/20'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#101d3b]/55 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="otp-dialog-title" dir="rtl" className="w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(16,29,59,.35)] sm:rounded-[28px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="otp-dialog-title" className="text-lg font-extrabold text-[#101827]">{title}</h2>
            <p className="mt-1.5 text-xs leading-6 text-[#68758a]">برای ادامه خرید، شماره موبایل خود را تأیید کنید؛ حساب شما همین‌جا ساخته می‌شود و بدون رمز عبور وارد می‌شوید.</p>
          </div>
          <button type="button" aria-label="بستن" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-[#8d98aa] hover:bg-[#f1f4f9]"><X size={18} /></button>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendCode} noValidate>
            <label className="block text-xs font-bold text-[#46536b]">شماره موبایل
              <div className="relative"><Phone size={16} className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[#8d98aa]" />
                <input ref={inputRef} type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${field} pr-10`} /></div>
            </label>
            {error && <p role="alert" className="mt-2 text-xs text-[#a3182b]">{error}</p>}
            <button type="submit" disabled={busy} className="mt-4 min-h-12 w-full rounded-xl bg-[#315bd5] px-4 text-sm font-extrabold text-white hover:bg-[#3d66e8] disabled:opacity-60">{busy ? 'در حال ارسال…' : 'دریافت کد تأیید'}</button>
          </form>
        ) : (
          <div>
            <p className="text-sm leading-7 text-[#536074]">کد {faNumber(OTP_CODE_LENGTH)} رقمی به <span dir="ltr" className="font-bold text-[#101827]">{normalized}</span> ارسال شد.</p>
            <label className="mt-2 block text-xs font-bold text-[#46536b]">کد تأیید
              <div className="relative"><KeyRound size={16} className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-[#8d98aa]" />
                <input ref={inputRef} inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="- - - - -" value={code} onChange={onCodeChange} disabled={busy} className={`${field} pr-10 tracking-[.4em]`} /></div>
            </label>
            {error && <p role="alert" className="mt-2 text-xs text-[#a3182b]">{error}</p>}
            <p className="mt-3 text-[11px] text-[#7b879b]">{busy ? 'در حال بررسی…' : 'با وارد کردن آخرین رقم، کد خودکار بررسی می‌شود.'}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setStep('phone'); setError(''); setCode('') }} className="text-[#68758a] hover:text-[#315bd5]">ویرایش شماره</button>
              {resendIn > 0 ? <span className="text-[#8d98aa]">ارسال مجدد تا {faNumber(resendIn)} ثانیه</span>
                : <button type="button" onClick={sendCode} disabled={busy} className="font-bold text-[#315bd5]">ارسال مجدد کد</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
