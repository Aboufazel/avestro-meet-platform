import { memo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Loader2, Presentation, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentsService } from '../../../services/documents'

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx,.odt,.odp'
const MAX_MB = 20
const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${faNum((bytes / 1024 / 1024).toFixed(1))} مگابایت` : `${faNum(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`)

function KindIcon({ kind }) {
  if (kind === 'image') return <ImageIcon size={17} />
  if (kind === 'office') return <Presentation size={17} />
  return <FileText size={17} />
}

/**
 * فایل‌های کلاس (فقط معلم): بارگذاری عکس/PDF/Word/PowerPoint و نمایش در صحنه‌ی کلاس.
 * Word و PowerPoint روی سرور به PDF تبدیل می‌شوند؛ وضعیت تبدیل خودکار به‌روز می‌شود.
 * فایل‌ها با پایان کلاس از سرور پاک می‌شوند.
 */
export const DocumentsModal = memo(function DocumentsModal({ slug, open, activeId, onClose, onShow, onRemoved }) {
  const queryClient = useQueryClient()
  const inputRef = useRef(null)
  const [progress, setProgress] = useState(null) // null | 0..100
  const [dragging, setDragging] = useState(false)

  const { data: documents = [], isLoading, isError } = useQuery({
    queryKey: ['room-documents', slug],
    queryFn: () => documentsService.list(slug).then((r) => r.data),
    enabled: open && Boolean(slug),
    // تا وقتی فایلی در حال تبدیل است، هر چند ثانیه وضعیت را تازه می‌کند
    refetchInterval: (query) => (query.state.data?.some((d) => d.status === 'processing') ? 2500 : false),
  })

  if (!open) return null

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['room-documents', slug] })

  const upload = async (file) => {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`حجم فایل نباید بیشتر از ${faNum(MAX_MB)} مگابایت باشد.`); return }
    setProgress(0)
    try {
      await documentsService.upload(slug, file, setProgress)
      await refresh()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'بارگذاری فایل ناموفق بود.')
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (doc) => {
    try {
      if (doc.id === activeId) onRemoved?.(doc)
      await documentsService.remove(slug, doc.id)
      await refresh()
    } catch {
      toast.error('حذف فایل ناموفق بود.')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/65 p-0 md:p-6" onClick={onClose}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} className="w-full md:max-w-xl max-h-[88vh] flex flex-col rounded-t-[26px] md:rounded-[26px] border room-border room-surface text-white shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b room-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">فایل‌های کلاس</h2>
            <p className="text-[11px] text-white/40 mt-0.5">فایل داخل خود کلاس نمایش داده می‌شود و می‌توانید روی آن بنویسید</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="room-control w-9 h-9 rounded-xl bg-white/[.045] text-white/50 hover:text-white flex items-center justify-center"><X size={17} /></button>
        </div>

        <div className="p-3 shrink-0">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]) }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-5 text-center cursor-pointer transition ${dragging ? 'border-[var(--room-blue)] bg-[var(--room-blue)]/10' : 'room-border bg-white/[.03] hover:bg-white/[.05]'}`}
          >
            {progress === null ? <Upload size={20} className="text-white/60" /> : <Loader2 size={20} className="animate-spin text-white/60" />}
            <span className="text-xs text-white/80">{progress === null ? 'انتخاب فایل یا رها‌کردن اینجا' : `در حال بارگذاری… ${faNum(progress)}٪`}</span>
            <span className="text-[10px] text-white/35">عکس، PDF، Word، PowerPoint · حداکثر {faNum(MAX_MB)} مگابایت</span>
            <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" disabled={progress !== null} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5 min-h-[100px]">
          {isLoading && <p className="text-center text-sm text-white/40 mt-6">در حال بارگذاری…</p>}
          {isError && <p className="text-center text-sm text-[var(--room-danger)] mt-6">دریافت فهرست ناموفق بود. اشتراک فایل برای این کلاس فعال است؟</p>}
          {!isLoading && !isError && documents.length === 0 && <p className="text-center text-xs text-white/35 mt-6">هنوز فایلی بارگذاری نشده است.</p>}
          {documents.map((doc) => {
            const active = doc.id === activeId
            return (
              <div key={doc.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${active ? 'border-[var(--room-blue)]/60 bg-[var(--room-blue)]/10' : 'room-border bg-white/[.03]'}`}>
                <span className="text-white/55 shrink-0"><KindIcon kind={doc.kind} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{doc.title}</p>
                  <p className="text-[10px] mt-0.5 flex items-center gap-1 text-white/40">
                    {doc.status === 'processing' && <><Loader2 size={11} className="animate-spin" /> در حال تبدیل به PDF…</>}
                    {doc.status === 'failed' && <span className="flex items-center gap-1 text-[var(--room-danger)]"><AlertCircle size={11} /> {doc.error || 'ناموفق'}</span>}
                    {doc.status === 'ready' && <><CheckCircle2 size={11} className="text-[var(--room-mint)]" /> آماده · {formatSize(doc.size)}</>}
                  </p>
                </div>
                {doc.status === 'ready' && (
                  <button type="button" disabled={active} onClick={() => { onShow?.(doc); onClose?.() }} className="text-[11px] px-3 py-1.5 rounded-lg bg-[var(--room-blue)] text-white font-medium hover:brightness-110 disabled:opacity-50">
                    {active ? 'در حال نمایش' : 'نمایش در کلاس'}
                  </button>
                )}
                <button type="button" onClick={() => remove(doc)} aria-label={`حذف ${doc.title}`} className="room-control w-8 h-8 rounded-lg bg-white/[.045] text-white/45 hover:text-[var(--room-danger)] flex items-center justify-center"><Trash2 size={15} /></button>
              </div>
            )
          })}
          <p className="text-[10px] text-white/30 text-center mt-2">فایل‌ها بعد از پایان کلاس از سرور پاک می‌شوند.</p>
        </div>
      </div>
    </div>
  )
})
