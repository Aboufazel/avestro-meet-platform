import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CornerUpLeft, Loader2, FileWarning, Check } from 'lucide-react'
import WhiteboardPanel from '../../whiteboard/WhiteboardPanel'
import { documentsService } from '../../../services/documents'
import { getCurrentExternalId } from '../store/meeting-actions'
import './document-stage.css'

const TARGET_WIDTH = 1800
const MAX_CACHED_PAGES = 8
const EMPTY = []
const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

const LABELS = {
  readOnly: 'سند کلاس · فقط مشاهده',
  close: 'بستن سند برای کلاس',
  clear: 'پاک‌کردن نوشته‌های این صفحه',
  clearTitle: 'پاک‌کردن نوشته‌های این صفحه؟',
  clearText: 'همه‌ی نوشته‌های روی این صفحه برای تمام حاضران پاک می‌شود. خودِ فایل تغییری نمی‌کند.',
  empty: 'روی سند بنویسید',
}

// pdf.js فقط وقتی سندی باز شود بارگذاری می‌شود (bundle اصلی سبک می‌ماند)
async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

/** فایل را می‌گیرد و صفحه‌ها را (PDF با pdf.js، عکس مستقیم) به تصویر تبدیل می‌کند؛ کش کوچک دارد. */
function useDocumentPages(slug, doc) {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [pageCount, setPageCount] = useState(0)
  const pdfRef = useRef(null)
  const cacheRef = useRef(new Map())
  const docId = doc?.id
  const kind = doc?.kind
  const mime = doc?.mime

  useEffect(() => {
    if (!docId) return undefined
    let cancelled = false
    const cache = cacheRef.current
    setStatus('loading')
    setPageCount(0)
    ;(async () => {
      try {
        const response = await fetch(documentsService.fileUrl(slug, docId, getCurrentExternalId()))
        if (!response.ok) throw new Error('http')
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        if (kind === 'image') {
          const objectUrl = URL.createObjectURL(new Blob([buffer], { type: mime || 'image/png' }))
          const size = await new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
            img.onerror = reject
            img.src = objectUrl
          })
          cache.set(1, { src: objectUrl, ...size })
          setPageCount(1)
        } else {
          const pdfjs = await loadPdfjs()
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
          if (cancelled) { pdf.destroy(); return }
          pdfRef.current = pdf
          setPageCount(pdf.numPages)
        }
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      pdfRef.current?.destroy?.()
      pdfRef.current = null
      cache.forEach((entry) => { if (entry.src?.startsWith('blob:')) URL.revokeObjectURL(entry.src) })
      cache.clear()
    }
  }, [slug, docId, kind, mime])

  const getPage = useCallback(async (number) => {
    const cache = cacheRef.current
    if (cache.has(number)) return cache.get(number)
    const pdf = pdfRef.current
    if (!pdf || number < 1 || number > pdf.numPages) return null
    const page = await pdf.getPage(number)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: Math.min(3, TARGET_WIDTH / base.width) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' }).promise
    const entry = { src: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height }
    cache.set(number, entry)
    if (cache.size > MAX_CACHED_PAGES) cache.delete(cache.keys().next().value)
    page.cleanup()
    return entry
  }, [])

  return { status, pageCount, getPage }
}

/**
 * صحنه‌ی سند: فایل داخل خود کلاس نمایش داده می‌شود و روی آن همان موتور تخته می‌نویسد.
 * معلم صفحه را عوض می‌کند و برای همه همگام می‌شود؛ دانش‌آموز فقط اگر معلم اجازه داده باشد
 * ورق می‌زند یا می‌نویسد.
 */
export const DocumentStage = memo(function DocumentStage({
  slug, state, canControl, onPage, onClose, onSettings, onClearPage, onAnnotate,
}) {
  const doc = state.document
  const { status, pageCount, getPage } = useDocumentPages(slug, doc)
  const teacherPage = state.page || 1
  const canBrowse = canControl || Boolean(state.students_can_browse)
  const writable = canControl || Boolean(state.students_can_annotate)

  // دانش‌آموزِ آزاد برای ورق‌زدن: شماره‌ی صفحه‌ی شخصی؛ با عوض‌شدن صفحه‌ی معلم دوباره دنبال معلم می‌شود
  const [localPage, setLocalPage] = useState(null)
  useEffect(() => { setLocalPage(null) }, [teacherPage, doc?.id])

  const wanted = canControl || !canBrowse || !localPage ? teacherPage : localPage
  const current = Math.min(Math.max(1, wanted), pageCount || 1)

  const [pageData, setPageData] = useState(null) // null = در حال ساخت، 'error'، یا {src,width,height}
  useEffect(() => {
    if (status !== 'ready') return undefined
    let cancelled = false
    setPageData(null)
    getPage(current)
      .then((data) => { if (!cancelled) setPageData(data || 'error') })
      .catch(() => { if (!cancelled) setPageData('error') })
    getPage(current + 1).catch(() => {}) // پیش‌بارگذاری صفحه‌ی بعد
    return () => { cancelled = true }
  }, [status, current, getPage])

  const goTo = (number) => {
    const next = Math.min(Math.max(1, number), pageCount || 1)
    if (next === current) return
    if (canControl) onPage?.(next)
    else setLocalPage(next)
  }

  const objects = useMemo(() => state.annotations?.[String(current)] || EMPTY, [state.annotations, current])
  const ready = pageData && pageData !== 'error'

  const background = ready ? (
    <>
      <rect x={-12000} y={-12000} width={24000} height={24000} fill="#dfe5ee" />
      <rect x={0} y={0} width={pageData.width} height={pageData.height} fill="#ffffff" />
      <image href={pageData.src} x={0} y={0} width={pageData.width} height={pageData.height} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
    </>
  ) : null

  const moreExtra = canControl ? (
    <>
      <button type="button" role="menuitemcheckbox" aria-checked={Boolean(state.students_can_annotate)} className="wb-pop-item" onClick={() => onSettings?.({ students_can_annotate: !state.students_can_annotate })}>
        <span className="ds-check">{state.students_can_annotate && <Check size={14} />}</span><span>دانش‌آموزان بتوانند بنویسند</span>
      </button>
      <button type="button" role="menuitemcheckbox" aria-checked={Boolean(state.students_can_browse)} className="wb-pop-item" onClick={() => onSettings?.({ students_can_browse: !state.students_can_browse })}>
        <span className="ds-check">{state.students_can_browse && <Check size={14} />}</span><span>دانش‌آموزان آزادانه ورق بزنند</span>
      </button>
    </>
  ) : null

  return (
    <div className="ds-root" dir="rtl">
      {status === 'error' || pageData === 'error' ? (
        <div className="ds-center"><FileWarning size={28} aria-hidden="true" /><p>نمایش سند ممکن نشد. دوباره باز کنید یا فایل دیگری انتخاب کنید.</p>{canControl && <button type="button" onClick={onClose}>بستن سند</button>}</div>
      ) : !ready ? (
        <div className="ds-center"><Loader2 size={26} className="ds-spin" aria-hidden="true" /><p>در حال آماده‌سازی سند…</p></div>
      ) : (
        <>
          <WhiteboardPanel
            key={`${doc.id}:${current}`}
            initialObjects={objects}
            onObjectsChange={(next) => onAnnotate?.(current, next)}
            onClose={onClose}
            onClear={() => onClearPage?.(current)}
            readOnly={!writable}
            isHost={canControl}
            canvasWidth={pageData.width}
            canvasHeight={pageData.height}
            background={background}
            labels={LABELS}
            moreExtra={moreExtra}
          />
          <div className="ds-pager" dir="ltr" role="group" aria-label="صفحه‌های سند">
            {canBrowse && <button type="button" onClick={() => goTo(current + 1)} disabled={current >= pageCount} aria-label="صفحه‌ی بعد"><ChevronLeft size={18} /></button>}
            <span>{faNum(current)} / {faNum(pageCount || 1)}</span>
            {canBrowse && <button type="button" onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="صفحه‌ی قبل"><ChevronRight size={18} /></button>}
            {!canControl && canBrowse && localPage && localPage !== teacherPage && (
              <button type="button" className="ds-follow" onClick={() => setLocalPage(null)}><CornerUpLeft size={14} /> صفحه‌ی معلم</button>
            )}
          </div>
        </>
      )}
    </div>
  )
})
