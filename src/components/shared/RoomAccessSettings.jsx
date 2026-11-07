import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { AlertCircle, Loader2, Search, Users } from 'lucide-react'
import { peopleService } from '../../services/people'
import { appRoutes } from '../../routes/appRoutes'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2c55d4]/35'
const fieldClass = `min-h-11 w-full rounded-xl border-2 border-[#c3cee2] bg-white px-3 py-2 text-sm text-[#101827] ${focusRing}`
const smallButton = `inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#c3cee2] bg-white px-4 py-2 text-sm font-bold text-[#34415a] hover:bg-[#eef3ff] disabled:opacity-50 ${focusRing}`
const PICKER_SIZE = 200

/**
 * تنظیم دسترسی جلسه: «ورود مهمان» + انتخاب افراد از دفترچه‌ی «تعریف کاربران».
 * کنترل‌شده: allowGuests/onAllowGuests و selected(آرایه‌ی id)/onSelected.
 */
export function RoomAccessSettings({ allowGuests, onAllowGuests, selected, onSelected }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['people-picker', q.trim(), role],
    queryFn: () => peopleService.list({ q: q.trim() || undefined, role: role || undefined, page_size: PICKER_SIZE }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
  const people = data?.results || []
  const roles = data?.roles || []
  const total = data?.total ?? 0
  const chosen = new Set(selected)
  const visibleIds = people.map((p) => p.id)
  const allVisibleChosen = visibleIds.length > 0 && visibleIds.every((id) => chosen.has(id))

  const toggle = (id) => onSelected(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const toggleVisible = () => {
    if (allVisibleChosen) onSelected(selected.filter((id) => !visibleIds.includes(id)))
    else onSelected([...new Set([...selected, ...visibleIds])])
  }
  const needsPeople = !allowGuests && selected.length === 0

  return (
    <fieldset className="rounded-2xl border-2 border-[#d9e1ee] bg-white p-4 sm:p-5">
      <legend className="px-2 text-base font-extrabold text-[#101827]">دسترسی و افراد جلسه</legend>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#d9e1ee] bg-[#f8faff] p-4">
        <input type="checkbox" checked={allowGuests} onChange={(e) => onAllowGuests(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#2c55d4]" />
        <span>
          <span className="block text-sm font-extrabold text-[#101827]">اجازه‌ی ورود مهمان</span>
          <span className="mt-1 block text-[13px] leading-6 text-[#46536b]">
            {allowGuests
              ? 'هر کس با لینک می‌تواند با یک نام دلخواه وارد شود. افراد انتخاب‌شده هم می‌توانند با کد ملی وارد شوند.'
              : 'فقط افراد انتخاب‌شده با وارد کردن کد ملی وارد می‌شوند و نام ثبت‌شده‌شان در جلسه نمایش داده می‌شود.'}
          </span>
        </span>
      </label>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-[#101827]">افراد این جلسه</h3>
          <p className="text-sm font-bold text-[#1f3f9c]" role="status" aria-live="polite">{fa(selected.length)} نفر انتخاب شده</p>
        </div>
        <p className="mt-1 text-[13px] leading-6 text-[#46536b]">معلم، مدیر و معاون با ورود از راه کد ملی همان دسترسی‌های میزبان را دارند.</p>

        {needsPeople && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff0cf] p-3 text-sm leading-6 text-[#7a4a05]">
            <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            با غیرفعال‌بودن ورود مهمان، حداقل یک نفر را برای جلسه انتخاب کنید.
          </p>
        )}

        {isLoading ? (
          <div role="status" className="flex justify-center py-8"><Loader2 className="animate-spin text-[#2c55d4]" aria-hidden="true" /><span className="sr-only">در حال دریافت فهرست</span></div>
        ) : isError ? (
          <div role="alert" className="mt-3 rounded-xl border-2 border-[#f0c3ca] p-4 text-sm">
            دریافت فهرست کاربران ممکن نشد. <button type="button" onClick={() => refetch()} className={`font-bold underline ${focusRing}`}>تلاش دوباره</button>
          </div>
        ) : total === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-[#c3cee2] p-5 text-center">
            <Users aria-hidden="true" className="mx-auto text-[#6b778c]" />
            <p className="mt-2 text-sm font-bold">هنوز کاربری تعریف نکرده‌اید</p>
            <p className="mt-1 text-[13px] text-[#46536b]">ابتدا افراد را در بخش «تعریف کاربران» اضافه کنید.</p>
            <Link to={appRoutes.dashboard.people} target="_blank" rel="noreferrer" className={`mt-3 ${smallButton}`}>رفتن به تعریف کاربران</Link>
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <label htmlFor="picker-search" className="sr-only">جستجو در افراد</label>
                <Search size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6b778c]" />
                <input id="picker-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا کد ملی" className={`${fieldClass} pr-10`} />
              </div>
              <div>
                <label htmlFor="picker-role" className="sr-only">فیلتر سمت</label>
                <select id="picker-role" value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
                  <option value="">همه‌ی سمت‌ها</option>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={toggleVisible} disabled={visibleIds.length === 0} className={smallButton}>
                {allVisibleChosen ? 'برداشتن انتخاب نتایج' : `انتخاب همه‌ی نتایج (${fa(visibleIds.length)})`}
              </button>
              {selected.length > 0 && <button type="button" onClick={() => onSelected([])} className={smallButton}>پاک‌کردن همه‌ی انتخاب‌ها</button>}
            </div>

            {people.length === 0 ? (
              <p className="mt-3 text-sm text-[#46536b]">نتیجه‌ای پیدا نشد.</p>
            ) : (
              <ul className="mt-3 max-h-72 divide-y divide-[#eef1f5] overflow-y-auto rounded-xl border-2 border-[#e5eaf2]" aria-busy={isFetching}>
                {people.map((p) => (
                  <li key={p.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[#f3f6fc]">
                      <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} className="h-5 w-5 shrink-0 accent-[#2c55d4]" />
                      <span className="min-w-0 flex-1 text-sm font-bold text-[#101827]">{p.full_name}</span>
                      <span className="shrink-0 rounded-full bg-[#e6edff] px-2.5 py-0.5 text-[13px] font-bold text-[#1f3f9c]">{p.role_label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {(data?.count ?? 0) > PICKER_SIZE && <p className="mt-2 text-[13px] text-[#46536b]">فقط {fa(PICKER_SIZE)} نتیجه‌ی اول نمایش داده می‌شود؛ برای محدودتر شدن جستجو کنید.</p>}
          </>
        )}
      </div>
    </fieldset>
  )
}
