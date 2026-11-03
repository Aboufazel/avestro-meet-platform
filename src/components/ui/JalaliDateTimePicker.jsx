import { forwardRef, useMemo } from 'react'
import { X } from 'lucide-react'
import DatePickerModule from 'react-multi-date-picker'
import TimePickerModule from 'react-multi-date-picker/plugins/time_picker'
import { formatLocal, parseLocal, toPersian, persian, persian_fa, unwrap } from '../../utils/jalali'

// این پکیج CommonJS است و در Vite گاهی کل ماژول (نه خود کامپوننت) به‌عنوان default می‌آید
const DatePicker = unwrap(DatePickerModule)
const TimePicker = unwrap(TimePickerModule)

/**
 * انتخاب تاریخ و ساعت شمسی روی react-multi-date-picker.
 *
 * value / onChange: رشته‌ی 'YYYY-MM-DDTHH:mm' (میلادی، وقت محلی) یا '' —
 * دقیقاً مثل <input type="datetime-local">؛ پس فرم‌ها تغییری نمی‌کنند.
 * withTime=false → فقط تاریخ (ساعت ۰۰:۰۰).
 *
 * با react-hook-form از طریق Controller استفاده شود.
 */
export const JalaliDateTimePicker = forwardRef(function JalaliDateTimePicker(
  { label, value, onChange, error, placeholder = 'انتخاب تاریخ و ساعت', withTime = true, id },
  ref
) {
  const dateObj = useMemo(() => {
    const d = parseLocal(value)
    return d ? toPersian(d) : null
  }, [value])

  const handleChange = (picked) => {
    if (!picked) return onChange?.('')
    const d = picked.toDate()
    if (!withTime) d.setHours(0, 0, 0, 0)
    onChange?.(formatLocal(d))
  }

  return (
    <div className="flex flex-col gap-1.5" dir="rtl">
      {label && <label htmlFor={id} className="text-sm text-[#536074]">{label}</label>}

      <div className="relative">
        <DatePicker
          ref={ref}
          id={id}
          value={dateObj}
          onChange={handleChange}
          calendar={persian}
          locale={persian_fa}
          format={withTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD'}
          plugins={withTime ? [<TimePicker key="time" hideSeconds position="bottom" />] : []}
          calendarPosition="bottom-right"
          placeholder={placeholder}
          editable={false}
          containerClassName="w-full"
          inputClass={[
            'w-full! h-auto! bg-[#f8faff]! border! rounded-xl! px-4! py-3! text-[#101827]! text-sm!',
            'focus:outline-none! focus:ring-2! focus:ring-[#4f7cff]/15! focus:border-[#9eb6ff]!',
            error ? 'border-red-400/70!' : 'border-[#e1e6ef]!',
          ].join(' ')}
          zIndex={50}
        />
        {value && (
          <button
            type="button"
            aria-label="پاک کردن"
            onClick={() => onChange?.('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d98aa] hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
})
