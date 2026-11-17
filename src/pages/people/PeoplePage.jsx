import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { peopleService } from '../../services/people'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { primaryButtonClass, secondaryButtonClass } from '../../components/shared/PlanCard'

const fa = (value) => Number(value || 0).toLocaleString('fa-IR')
const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f7cff]/35'
const fieldClass = `min-h-11 w-full rounded-xl border border-[#e5eaf2] bg-white px-3 py-2 text-base text-[#101827] ${focusRing}`
const iconButton = `inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[#e5eaf2] bg-white px-3 text-sm font-bold text-[#34415a] hover:bg-[#eef3ff] ${focusRing}`
const PAGE_SIZE = 50
const MAX_FILE_BYTES = 10 * 1024 * 1024

const errorText = (error, fallback) => {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).flat().find((v) => typeof v === 'string')
  return first || fallback
}

function Modal({ titleId, title, description, onClose, children }) {
  const ref = useDialogFocus(true, onClose)
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#101827]/70 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl" className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 text-[#101827] shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-xl font-extrabold">{title}</h2>
            {description && <p className="mt-2 text-sm leading-7 text-[#46536b]">{description}</p>}
          </div>
          <button type="button" data-autofocus onClick={onClose} aria-label="بستن پنجره" className={`${iconButton} shrink-0`}><X size={20} aria-hidden="true" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function PersonForm({ person, roles, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: person?.first_name || '',
    last_name: person?.last_name || '',
    national_id: person?.national_id || '',
    role: person?.role || 'student',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!form.first_name.trim()) next.first_name = 'نام را وارد کنید.'
    if (!form.last_name.trim()) next.last_name = 'نام خانوادگی را وارد کنید.'
    if (!form.national_id.trim()) next.national_id = 'کد ملی را وارد کنید.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      if (person) await peopleService.update(person.id, form)
      else await peopleService.create(form)
      toast.success(person ? 'تغییرات ذخیره شد' : 'کاربر ثبت شد')
      onSaved()
    } catch (error) {
      const data = error?.response?.data
      if (data && typeof data === 'object' && !data.detail) {
        setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [].concat(v)[0]])))
      } else {
        toast.error(errorText(error, 'ذخیره انجام نشد. دوباره تلاش کنید.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, extra = {}) => (
    <div>
      <label htmlFor={`person-${key}`} className="mb-1.5 block text-sm font-bold">{label}</label>
      <input id={`person-${key}`} value={form[key]} onChange={set(key)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `person-${key}-err` : undefined} className={fieldClass} {...extra} />
      {errors[key] && <p id={`person-${key}-err`} role="alert" className="mt-1.5 text-sm font-bold text-[#a3182b]">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {field('first_name', 'نام', { autoComplete: 'off' })}
      {field('last_name', 'نام خانوادگی', { autoComplete: 'off' })}
      {field('national_id', 'کد ملی', { inputMode: 'numeric', dir: 'ltr', maxLength: 10, placeholder: '۱۰ رقم' })}
      <div>
        <label htmlFor="person-role" className="mb-1.5 block text-sm font-bold">سمت</label>
        <select id="person-role" value={form.role} onChange={set('role')} className={fieldClass}>
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <p className="mt-1.5 text-[13px] leading-6 text-[#46536b]">معلم، مدیر و معاون در جلسه همان دسترسی‌های میزبان را دارند.</p>
      </div>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={`${secondaryButtonClass} sm:w-auto`}>انصراف</button>
        <button type="submit" disabled={saving} className={`${primaryButtonClass} sm:w-auto`}>
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {person ? 'ذخیره تغییرات' : 'ثبت کاربر'}
        </button>
      </div>
    </form>
  )
}

function ImportReport({ report, onManualAdd, onClose }) {
  const problems = [
    ...report.invalid.map((r) => ({ ...r, kind: 'ایراد' })),
    ...report.duplicates.map((r) => ({ ...r, kind: 'تکراری' })),
  ].sort((a, b) => a.row - b.row)
  const ok = problems.length === 0
  return (
    <section aria-labelledby="import-report-title" className="mb-6 rounded-2xl border border-[#e5eaf2] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {ok ? <CheckCircle2 aria-hidden="true" className="mt-1 shrink-0 text-[#0f7a5c]" /> : <AlertCircle aria-hidden="true" className="mt-1 shrink-0 text-[#7a4a05]" />}
          <div>
            <h2 id="import-report-title" className="text-lg font-extrabold">نتیجه بارگذاری اکسل</h2>
            <p className="mt-1 text-sm leading-7 text-[#34415a]" role="status">
              از {fa(report.total_rows)} ردیف، <b>{fa(report.created)}</b> نفر ثبت شد.
              {report.duplicate_count > 0 && <> {fa(report.duplicate_count)} ردیف تکراری بود و دوباره ثبت نشد.</>}
              {report.invalid_count > 0 && <> {fa(report.invalid_count)} ردیف ایراد داشت.</>}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="بستن گزارش" className={iconButton}><X size={18} aria-hidden="true" /></button>
      </div>
      {!ok && (
        <>
          <p className="mt-4 text-sm leading-7 text-[#34415a]">
            کدهای زیر ثبت نشدند. می‌توانید ایراد را در فایل اصلاح کنید یا همان افراد را <button type="button" onClick={onManualAdd} className={`font-bold text-[#3d66e8] underline ${focusRing}`}>دستی وارد کنید</button>.
            {report.truncated && ' (فقط بخشی از ردیف‌ها نمایش داده شده است.)'}
          </p>
          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-[#e5eaf2]">
            <table className="w-full text-sm">
              <caption className="sr-only">فهرست ردیف‌های ثبت‌نشده</caption>
              <thead className="sticky top-0 bg-[#f3f6fc] text-start">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-start font-bold">ردیف</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-bold">نام</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-bold">کد ملی</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-bold">دلیل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f5]">
                {problems.map((p, i) => (
                  <tr key={`${p.row}-${i}`}>
                    <td className="px-3 py-2.5">{fa(p.row)}</td>
                    <td className="px-3 py-2.5">{p.name || '—'}</td>
                    <td className="px-3 py-2.5" dir="ltr">{p.national_id || '—'}</td>
                    <td className="px-3 py-2.5 text-[#46536b]"><span className="font-bold">{p.kind}: </span>{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default function PeoplePage() {
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null) // null | {} (جدید) | person
  const [deleting, setDeleting] = useState(null)
  const [report, setReport] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQ(q.trim()); setPage(1) }, 350)
    return () => window.clearTimeout(timer)
  }, [q])

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['people', debouncedQ, role, page],
    queryFn: () => peopleService.list({ q: debouncedQ || undefined, role: role || undefined, page, page_size: PAGE_SIZE }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
  const people = data?.results || []
  const roles = data?.roles || []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil((data?.count || 0) / PAGE_SIZE))

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['people'] })
    queryClient.invalidateQueries({ queryKey: ['people-picker'] })
  }, [queryClient])

  const remove = useMutation({
    mutationFn: (id) => peopleService.remove(id),
    onSuccess: () => { toast.success('کاربر حذف شد'); setDeleting(null); refresh() },
    onError: (error) => toast.error(errorText(error, 'حذف انجام نشد.')),
  })

  const downloadTemplate = async () => {
    try {
      const { data: blob } = await peopleService.template()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'people-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('دانلود فایل نمونه انجام نشد.')
    }
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) { toast.error('فقط فایل اکسل با پسوند xlsx پذیرفته می‌شود.'); return }
    if (file.size > MAX_FILE_BYTES) { toast.error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.'); return }
    setUploading(true)
    setReport(null)
    try {
      const { data: result } = await peopleService.importFile(file)
      setReport(result)
      refresh()
    } catch (error) {
      toast.error(errorText(error, 'بارگذاری انجام نشد. دوباره تلاش کنید.'))
    } finally {
      setUploading(false)
    }
  }

  const closeEditor = useCallback(() => setEditing(null), [])
  const closeDelete = useCallback(() => setDeleting(null), [])
  const empty = !isLoading && !isError && total === 0

  return (
    <div className="meet-light-page min-h-full p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-5 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(20,35,65,.045)] sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold text-[#3d66e8]">دفترچه‌ی حساب</p>
              <h1 className="text-xl font-extrabold text-[#101827] sm:text-2xl">تعریف کاربران</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68758a]">افراد را یک‌بار ثبت کنید و هنگام ساخت جلسه از همین فهرست انتخاب کنید.</p>
              {!isLoading && !isError && <p className="mt-3 inline-flex min-h-8 items-center rounded-full bg-[#edf2ff] px-3 text-xs font-bold text-[#3d66e8]">{fa(total)} کاربر در دفترچه</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => setEditing({})} className={`${primaryButtonClass} col-span-2 sm:col-span-1 sm:w-auto`}><Plus size={18} aria-hidden="true" />افزودن کاربر</button>
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={`${secondaryButtonClass} sm:w-auto`}>
                {uploading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
                {uploading ? 'در حال خواندن…' : 'بارگذاری اکسل'}
              </button>
              <button type="button" onClick={downloadTemplate} className={`${secondaryButtonClass} col-span-2 sm:col-span-1 sm:w-auto`}><Download size={18} aria-hidden="true" />دانلود فایل نمونه</button>
              <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} className="sr-only" tabIndex={-1} aria-label="انتخاب فایل اکسل" />
            </div>
          </div>
        </header>

        {report && <ImportReport report={report} onClose={() => setReport(null)} onManualAdd={() => setEditing({})} />}

        {empty ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e5eaf2] bg-white p-8 text-center sm:p-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#3d66e8]"><Users aria-hidden="true" /></span>
            <h2 className="mt-4 text-lg font-extrabold">هنوز کاربری تعریف نکرده‌اید</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#46536b]">می‌توانید هر نفر را با فرم اضافه کنید، یا فایل نمونه‌ی اکسل را دانلود، پر و بارگذاری کنید.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => setEditing({})} className={`${primaryButtonClass} sm:w-auto`}><Plus size={18} aria-hidden="true" />افزودن کاربر</button>
              <button type="button" onClick={downloadTemplate} className={`${secondaryButtonClass} sm:w-auto`}><FileSpreadsheet size={18} aria-hidden="true" />دانلود فایل نمونه</button>
            </div>
          </div>
        ) : (
          <section aria-label="فهرست کاربران" className="overflow-hidden rounded-[22px] border border-[#e5eaf2] bg-white shadow-[0_8px_24px_rgba(20,35,65,.035)]">
            <div className="grid gap-3 border-b-2 border-[#e5eaf2] p-4 sm:grid-cols-[1fr_220px]">
              <div>
                <label htmlFor="people-search" className="sr-only">جستجو در نام یا کد ملی</label>
                <div className="relative">
                  <Search size={18} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6b778c]" />
                  <input id="people-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در نام، نام خانوادگی یا کد ملی" className={`${fieldClass} pr-10`} />
                </div>
              </div>
              <div>
                <label htmlFor="people-role" className="sr-only">فیلتر بر اساس سمت</label>
                <select id="people-role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }} className={fieldClass}>
                  <option value="">همه‌ی سمت‌ها</option>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <p className="px-4 pt-3 text-sm text-[#46536b]" role="status" aria-live="polite">
              {isFetching && !isLoading ? 'در حال به‌روزرسانی…' : `${fa(data?.count ?? 0)} نفر نمایش داده می‌شود (از ${fa(total)} نفر)`}
            </p>

            {isLoading ? (
              <div role="status" className="flex justify-center py-16"><Loader2 className="animate-spin text-[#4f7cff]" aria-hidden="true" /><span className="sr-only">در حال دریافت فهرست</span></div>
            ) : isError ? (
              <div role="alert" className="p-6">
                <p className="font-bold">دریافت فهرست ممکن نشد.</p>
                <button type="button" onClick={() => refetch()} className={`mt-3 ${primaryButtonClass} sm:w-auto`}>تلاش دوباره</button>
              </div>
            ) : people.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#46536b]">نتیجه‌ای پیدا نشد. عبارت جستجو یا فیلتر را تغییر دهید.</p>
            ) : (
              <ul className="divide-y divide-[#eef1f5]">
                {people.map((p) => (
                  <li key={p.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#fbfcff] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <p className="text-base font-extrabold">{p.full_name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#46536b]">
                        <span><span className="sr-only">کد ملی: </span><span dir="ltr">{p.national_id}</span></span>
                        <span className="rounded-full bg-[#edf2ff] px-3 py-0.5 text-[13px] font-bold text-[#3d66e8]"><span className="sr-only">سمت: </span>{p.role_label}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(p)} aria-label={`ویرایش ${p.full_name}`} className={iconButton}><Pencil size={17} aria-hidden="true" />ویرایش</button>
                      <button type="button" onClick={() => setDeleting(p)} aria-label={`حذف ${p.full_name}`} className={`${iconButton} !border-[#f0c3ca] !text-[#8f1627] hover:!bg-[#fde4e8]`}><Trash2 size={17} aria-hidden="true" />حذف</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav aria-label="صفحه‌بندی" className="flex items-center justify-between gap-3 border-t-2 border-[#e5eaf2] p-4">
                <button type="button" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page <= 1} className={`${iconButton} disabled:opacity-40`}>قبلی</button>
                <span className="text-sm text-[#34415a]">صفحه {fa(page)} از {fa(pages)}</span>
                <button type="button" onClick={() => setPage((c) => Math.min(pages, c + 1))} disabled={page >= pages} className={`${iconButton} disabled:opacity-40`}>بعدی</button>
              </nav>
            )}
          </section>
        )}
      </div>

      {editing && (
        <Modal titleId="person-title" title={editing.id ? 'ویرایش کاربر' : 'افزودن کاربر'} description="هر چهار فیلد الزامی است. کد ملی باید ۱۰ رقم معتبر و در دفترچه‌ی شما یکتا باشد." onClose={closeEditor}>
          <PersonForm person={editing.id ? editing : null} roles={roles} onClose={closeEditor} onSaved={() => { closeEditor(); refresh() }} />
        </Modal>
      )}

      {deleting && (
        <Modal titleId="delete-title" title="حذف کاربر" description={`«${deleting.full_name}» از دفترچه و از فهرست جلسه‌ها حذف می‌شود. این کار قابل بازگشت نیست.`} onClose={closeDelete}>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDelete} className={`${secondaryButtonClass} sm:w-auto`}>انصراف</button>
            <button type="button" onClick={() => remove.mutate(deleting.id)} disabled={remove.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b42335] px-4 py-3 text-sm font-bold text-white hover:bg-[#98192a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b42335]/35 disabled:opacity-60">
              {remove.isPending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              بله، حذف شود
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
