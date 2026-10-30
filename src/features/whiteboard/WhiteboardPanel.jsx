import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft, ArrowLeft, Check, Circle, Eraser, Hand, Minus,
  MousePointer2, Pencil, Redo2, RotateCcw, Square, Type, Undo2, X, Trash2, AlertTriangle,
} from 'lucide-react'
import './whiteboard.css'

const WIDTH = 1600
const HEIGHT = 1000
const COLORS = ['#172033', '#2563eb', '#dc2626', '#059669', '#9333ea', '#ea580c']
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** تخته‌ی مشترک کلاس؛ وضعیت از طریق WebSocket با سایر شرکت‌کنندگان همگام می‌شود. */
export default function WhiteboardPanel({ onClose, initialObjects = [], onObjectsChange, onClear, readOnly = false, isHost = false }) {
  const svgRef = useRef(null)
  const [objects, setObjects] = useState(initialObjects)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [textEntry, setTextEntry] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [textPosition, setTextPosition] = useState(null)
  const [isClearing, setIsClearing] = useState(false)
  useEffect(() => { setObjects(initialObjects || []) }, [initialObjects])

  const replaceObjects = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(objects) : next
    setObjects(resolved)
    onObjectsChange?.(resolved)
  }, [objects, onObjectsChange])
  const [redoStack, setRedoStack] = useState([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#172033')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draft, setDraft] = useState(null)
  const [gesture, setGesture] = useState(null)
  const [status, setStatus] = useState(readOnly ? 'نمایش تخته معلم' : 'تخته مشترک کلاس · تغییرات برای حاضران ارسال می‌شود')

  const toCanvasPoint = useCallback((event) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const viewX = (event.clientX - rect.left) * WIDTH / rect.width
    const viewY = (event.clientY - rect.top) * HEIGHT / rect.height
    return { x: (viewX - pan.x) / zoom, y: (viewY - pan.y) / zoom }
  }, [pan, zoom])

  const commit = useCallback((next) => {
    replaceObjects([...objects, next])
    setRedoStack([])
  }, [objects, replaceObjects])

  const undo = useCallback(() => {
    if (!objects.length || readOnly) return
    setRedoStack((redo) => [objects[objects.length - 1], ...redo])
    replaceObjects(objects.slice(0, -1))
  }, [objects, readOnly, replaceObjects])

  const redo = useCallback(() => {
    if (!redoStack.length || readOnly) return
    const [first, ...rest] = redoStack
    setRedoStack(rest)
    replaceObjects([...objects, first])
  }, [objects, redoStack, readOnly, replaceObjects])

  const startGesture = (event) => {
    if (event.button !== 0) return
    if (readOnly && tool !== 'hand') return
    event.preventDefault()
    svgRef.current?.setPointerCapture?.(event.pointerId)
    const point = toCanvasPoint(event)
    if (tool === 'hand') {
      const rect = svgRef.current.getBoundingClientRect()
      setGesture({ kind: 'pan', clientX: event.clientX, clientY: event.clientY, pan, rectWidth: rect.width, rectHeight: rect.height })
      return
    }
    if (tool === 'text') {
      setTextPosition(point)
      setTextValue('')
      setTextEntry(true)
      return
    }
    if (tool === 'eraser') {
      setGesture({ kind: 'erase', last: point })
      replaceObjects(objects.filter((item) => {
        if (item.type !== 'path') return true
        return !item.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < 28 / zoom)
      }))
      return
    }
    const type = ['line', 'arrow', 'rect', 'ellipse'].includes(tool) ? tool : 'path'
    const next = { id: makeId(), type, x: point.x, y: point.y, endX: point.x, endY: point.y, color: tool === 'marker' ? `${color}88` : color, width: tool === 'marker' ? strokeWidth * 3 : strokeWidth, points: [{ x: point.x, y: point.y }] }
    setDraft(next)
    setGesture({ kind: 'draw', start: point, type })
  }

  const moveGesture = (event) => {
    if (!gesture) return
    if (readOnly && gesture.kind !== 'pan') return
    if (gesture.kind === 'pan') {
      const scaleX = WIDTH / gesture.rectWidth
      const scaleY = HEIGHT / gesture.rectHeight
      setPan({ x: gesture.pan.x + (event.clientX - gesture.clientX) * scaleX, y: gesture.pan.y + (event.clientY - gesture.clientY) * scaleY })
      return
    }
    const point = toCanvasPoint(event)
    if (gesture.kind === 'erase') {
      replaceObjects(objects.filter((item) => {
        if (item.type !== 'path') return true
        return !item.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < 28 / zoom)
      }))
      return
    }
    if (gesture.kind !== 'draw' || !draft) return
    setDraft((current) => {
      if (!current) return current
      if (current.type === 'path') return { ...current, points: [...current.points, point] }
      return { ...current, endX: point.x, endY: point.y }
    })
  }

  const endGesture = () => {
    if (readOnly) { setDraft(null); setGesture(null); return }
    if (gesture?.kind === 'draw' && draft) {
      const finalObject = draft.type === 'path' && draft.points.length < 2
        ? { ...draft, points: [...draft.points, { x: draft.x + 0.1, y: draft.y + 0.1 }] }
        : draft
      commit(finalObject)
    }
    setDraft(null)
    setGesture(null)
  }

  const submitText = (event) => {
    event.preventDefault()
    const value = textValue.trim()
    if (!value || !textPosition) return
    commit({ id: makeId(), type: 'text', x: textPosition.x, y: textPosition.y, text: value, color, fontSize: Math.max(18, strokeWidth * 7) })
    setTextEntry(false)
    setTextPosition(null)
    setTextValue('')
  }

  const zoomBy = (factor) => setZoom((current) => Math.min(3, Math.max(0.35, Number((current * factor).toFixed(2)))))
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  const allObjects = useMemo(() => draft ? [...objects, draft] : objects, [objects, draft])

  const renderObject = (item) => {
    const common = { key: item.id, stroke: item.color, strokeWidth: item.width || 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', vectorEffect: 'non-scaling-stroke' }
    if (item.type === 'path') return <polyline {...common} points={item.points.map((p) => `${p.x},${p.y}`).join(' ')} />
    if (item.type === 'line' || item.type === 'arrow') return <line {...common} x1={item.x} y1={item.y} x2={item.endX} y2={item.endY} markerEnd={item.type === 'arrow' ? 'url(#whiteboard-arrow)' : undefined} />
    if (item.type === 'rect') return <rect {...common} x={Math.min(item.x, item.endX)} y={Math.min(item.y, item.endY)} width={Math.abs(item.endX - item.x)} height={Math.abs(item.endY - item.y)} />
    if (item.type === 'ellipse') return <ellipse {...common} cx={(item.x + item.endX) / 2} cy={(item.y + item.endY) / 2} rx={Math.abs(item.endX - item.x) / 2} ry={Math.abs(item.endY - item.y) / 2} />
    if (item.type === 'text') return <text key={item.id} x={item.x} y={item.y} fill={item.color} fontSize={item.fontSize} fontFamily="inherit" direction="rtl" textAnchor="start">{item.text}</text>
    return null
  }

  const tools = [
    { id: 'pen', label: 'قلم', icon: Pencil }, { id: 'marker', label: 'ماژیک', icon: Pencil },
    { id: 'eraser', label: 'پاک‌کن', icon: Eraser }, { id: 'line', label: 'خط', icon: Minus },
    { id: 'arrow', label: 'فلش', icon: ArrowLeft }, { id: 'rect', label: 'مستطیل', icon: Square },
    { id: 'ellipse', label: 'بیضی', icon: Circle }, { id: 'text', label: 'متن', icon: Type },
    { id: 'hand', label: 'حرکت بوم', icon: Hand },
  ]

  return (
    <section className="wb-root" aria-label="تخته تعاملی" dir="rtl">
      <header className="wb-header">
        <div className="wb-heading"><span className="wb-heading-icon"><Pencil size={18} /></span><div><strong>تخته تعاملی</strong><small>بوم آزاد کلاس</small></div></div>
        <div className="wb-header-actions">
          <span className={`wb-local-badge ${readOnly ? 'is-viewer' : 'is-live'}`}>{readOnly ? 'نمایش زنده' : 'همگام‌سازی زنده'}</span>
          {isHost && <button type="button" className="wb-close" onClick={onClose} title="بستن تخته برای کلاس"><X size={18} /><span>بستن تخته برای کلاس</span></button>}
        </div>
      </header>
      <div className="wb-toolbar" role="toolbar" aria-label="ابزارهای تخته">
        <div className="wb-tool-group">
          {tools.map(({ id, label, icon: Icon }) => <button key={id} type="button" title={readOnly && id !== 'hand' ? 'ویرایش تخته در اختیار معلم است' : label} aria-label={label} aria-pressed={tool === id} disabled={readOnly && id !== 'hand'} onClick={() => setTool(id)} className={`wb-tool ${tool === id ? 'is-active' : ''}`}><Icon size={17} /><span>{label}</span></button>)}
        </div>
        {!readOnly && <><div className="wb-tool-divider" />
        <div className="wb-colors" aria-label="رنگ قلم">
          {COLORS.map((item) => <button key={item} type="button" aria-label={`رنگ ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} className={`wb-color ${color === item ? 'is-selected' : ''}`} style={{ '--swatch': item }} />)}
        </div>
        <label className="wb-width-control"><span>ضخامت</span><input aria-label="ضخامت قلم" type="range" min="1" max="12" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></label>
        <div className="wb-tool-divider wb-divider-small" />
        <button type="button" className="wb-icon-action" onClick={undo} disabled={!objects.length} title="واگرد"><Undo2 size={17} /></button>
        <button type="button" className="wb-icon-action" onClick={redo} disabled={!redoStack.length} title="انجام مجدد"><Redo2 size={17} /></button>
        <button type="button" className="wb-icon-action" onClick={resetView} title="بازنشانی نما"><RotateCcw size={17} /></button>
        {isHost && <button type="button" className="wb-icon-action wb-clear" onClick={() => objects.length && setClearConfirmOpen(true)} disabled={!objects.length} title="پاک‌کردن محتوای تخته برای همه"><Eraser size={17} /></button>}</>}
      </div>
      <div className="wb-workspace">
        <div className="wb-canvas-wrap">
          <svg ref={svgRef} className={`wb-canvas ${tool === 'hand' ? 'is-panning' : 'is-drawing'}`} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onPointerDown={startGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); zoomBy(event.deltaY < 0 ? 1.08 : 0.92) } }} role="application" aria-label="بوم رسم؛ برای بزرگ‌نمایی از کنترل‌های پایین استفاده کنید">
            <defs>
              <pattern id="whiteboard-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e8edf4" strokeWidth="1" /></pattern>
              <marker id="whiteboard-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke" /></marker>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="#ffffff" />
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              <rect x="-12000" y="-12000" width="24000" height="24000" fill="#ffffff" />
              <rect x="-12000" y="-12000" width="24000" height="24000" fill="url(#whiteboard-grid)" />
              {allObjects.map(renderObject)}
            </g>
          </svg>
          {!objects.length && !draft && <div className="wb-empty-hint"><span><MousePointer2 size={20} /></span><strong>از اینجا شروع کنید</strong><small>ابزار قلم را انتخاب کنید و روی بوم بنویسید؛ با ابزار دست، بوم را جابه‌جا کنید.</small></div>}
          <div className="wb-zoom-controls" dir="ltr"><button type="button" onClick={() => zoomBy(1.15)} aria-label="بزرگ‌نمایی">+</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => zoomBy(0.87)} aria-label="کوچک‌نمایی">−</button><button type="button" onClick={resetView} aria-label="نمای پیش‌فرض"><ArrowDownLeft size={15} /></button></div>
          <div className="wb-canvas-status"><span className="wb-status-dot" />{status}</div>
        </div>
      </div>
      <footer className="wb-footer"><span><Check size={14} /> {readOnly ? 'تخته معلم به‌صورت زنده نمایش داده می‌شود.' : 'تغییرات تخته برای حاضران کلاس همگام می‌شود.'}</span><span>برای حرکت بوم: ابزار دست · برای زوم: Ctrl/⌘ + چرخ ماوس</span></footer>
      {textEntry && <div className="wb-text-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTextEntry(false) }}>
        <form className="wb-text-dialog" role="dialog" aria-modal="true" aria-labelledby="wb-text-title" dir="rtl" onSubmit={submitText}>
          <div className="wb-text-dialog-heading"><Type size={17} /><strong id="wb-text-title">افزودن متن به تخته</strong></div>
          <input autoFocus value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="متن درس را بنویسید..." aria-label="متن روی تخته" />
          <div className="wb-text-dialog-actions">
            <button type="button" onClick={() => setTextEntry(false)}>انصراف</button>
            <button type="submit" disabled={!textValue.trim()}>افزودن به تخته</button>
          </div>
        </form>
      </div>}
      {clearConfirmOpen && <div className="wb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClearConfirmOpen(false) }}>
        <section className="wb-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="wb-clear-title" dir="rtl">
          <div className="wb-confirm-icon"><AlertTriangle size={23} /></div>
          <button type="button" className="wb-modal-x" onClick={() => setClearConfirmOpen(false)} aria-label="بستن"><X size={18} /></button>
          <h2 id="wb-clear-title">پاک‌کردن محتوای تخته؟</h2>
          <p>تمام نوشته‌ها و شکل‌های این تخته برای همه‌ی افراد کلاس پاک می‌شود. این کار قابل بازگشت نیست.</p>
          <div className="wb-modal-actions">
            <button type="button" className="wb-modal-cancel" onClick={() => setClearConfirmOpen(false)}>انصراف</button>
            <button type="button" className="wb-modal-confirm" disabled={isClearing} onClick={() => { setIsClearing(true); onClear?.(); setRedoStack([]); setStatus('تخته پاک شد'); setClearConfirmOpen(false); setIsClearing(false) }}><Trash2 size={16} /> پاک‌کردن تخته</button>
          </div>
        </section>
      </div>}
    </section>
  )
}
