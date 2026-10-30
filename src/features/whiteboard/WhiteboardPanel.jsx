import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Check, Circle, Eraser, Hand, Highlighter, Minus, MoreHorizontal, Pencil,
  Redo2, RotateCcw, Shapes, Square, Trash2, Type, Undo2, X, AlertTriangle, Maximize,
} from 'lucide-react'
import './whiteboard.css'

const WIDTH = 1600
const HEIGHT = 1000
const COLORS = ['#172033', '#2563eb', '#dc2626', '#059669', '#9333ea', '#ea580c']
const SHAPE_TOOLS = [
  { id: 'marker', label: 'ماژیک', icon: Highlighter },
  { id: 'line', label: 'خط', icon: Minus },
  { id: 'arrow', label: 'فلش', icon: ArrowLeft },
  { id: 'rect', label: 'مستطیل', icon: Square },
  { id: 'ellipse', label: 'بیضی', icon: Circle },
]
const ERASE_RADIUS_PX = 16
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// ── پاک‌کن: فاصله‌ی نقطه تا هر نوع شیء (واحد: مختصات تخته) ──
const distToSegment = (p, a, b) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
const hitsItem = (item, p, r) => {
  if (item.type === 'path') return item.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < r)
  if (item.type === 'line' || item.type === 'arrow') return distToSegment(p, { x: item.x, y: item.y }, { x: item.endX, y: item.endY }) < r
  if (item.type === 'rect') {
    const x1 = Math.min(item.x, item.endX); const x2 = Math.max(item.x, item.endX)
    const y1 = Math.min(item.y, item.endY); const y2 = Math.max(item.y, item.endY)
    return distToSegment(p, { x: x1, y: y1 }, { x: x2, y: y1 }) < r || distToSegment(p, { x: x2, y: y1 }, { x: x2, y: y2 }) < r ||
      distToSegment(p, { x: x2, y: y2 }, { x: x1, y: y2 }) < r || distToSegment(p, { x: x1, y: y2 }, { x: x1, y: y1 }) < r
  }
  if (item.type === 'ellipse') {
    const rx = Math.abs(item.endX - item.x) / 2 || 1
    const ry = Math.abs(item.endY - item.y) / 2 || 1
    const k = Math.hypot((p.x - (item.x + item.endX) / 2) / rx, (p.y - (item.y + item.endY) / 2) / ry)
    return Math.abs(k - 1) * Math.min(rx, ry) < r
  }
  if (item.type === 'text') {
    const w = (item.text?.length || 1) * item.fontSize * 0.6
    return p.x > item.x - r && p.x < item.x + w + r && p.y > item.y - item.fontSize - r && p.y < item.y + r
  }
  return false
}

/**
 * تخته‌ی مشترک کلاس؛ وضعیت از طریق WebSocket با سایر شرکت‌کنندگان همگام می‌شود.
 * (منطق همگام‌سازی و مجوز: initialObjects / onObjectsChange / onClear / readOnly بدون تغییر.)
 *
 * طراحی: یک نوار ابزار فشرده؛ ابزارهای پرکاربرد مستقیم، بقیه (اشکال، رنگ و ضخامت، بیشتر)
 * فقط با درخواست کاربر در یک پنل کوچک باز می‌شوند. بوم تمام فضای باقی‌مانده را دارد.
 */
export default function WhiteboardPanel({ onClose, initialObjects = [], onObjectsChange, onClear, readOnly = false, isHost = false }) {
  const rootRef = useRef(null)
  const svgRef = useRef(null)
  const textInputRef = useRef(null)
  const [objects, setObjects] = useState(initialObjects)
  const [redoStack, setRedoStack] = useState([])
  const [chosenTool, setTool] = useState('pen')
  // بدون مجوز نوشتن فقط ابزار حرکت فعال است (با گرفتن مجوز هم فوراً همین‌طور می‌شود).
  const tool = readOnly ? 'hand' : chosenTool
  const [color, setColor] = useState(COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draft, setDraft] = useState(null)
  const [gesture, setGesture] = useState(null)
  const [popover, setPopover] = useState(null) // 'shapes' | 'style' | 'more' | null
  const [textEntry, setTextEntry] = useState(null) // { point, value }
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  useEffect(() => { setObjects(initialObjects || []) }, [initialObjects])

  const replaceObjects = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(objects) : next
    setObjects(resolved)
    onObjectsChange?.(resolved)
  }, [objects, onObjectsChange])

  // بستن پنل‌های کوچک با لمس بیرون یا Escape
  useEffect(() => {
    if (!popover) return undefined
    const onDown = (e) => { if (!e.target.closest?.('[data-wb-pop], [data-wb-pop-trigger]')) setPopover(null) }
    const onKey = (e) => { if (e.key === 'Escape') setPopover(null) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey) }
  }, [popover])

  useEffect(() => { if (textEntry) textInputRef.current?.focus() }, [textEntry])

  // ── مختصات: از ماتریس واقعی SVG استفاده می‌شود؛ پس با چرخش محیط کلاس (گوشی عمودی) هم درست است ──
  const toView = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: 0, y: 0, scale: 1 }
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y, scale: Math.hypot(ctm.a, ctm.b) || 1 }
  }, [])
  const toBoard = useCallback((clientX, clientY) => {
    const v = toView(clientX, clientY)
    return { x: (v.x - pan.x) / zoom, y: (v.y - pan.y) / zoom, scale: v.scale }
  }, [toView, pan, zoom])

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

  const eraseAt = (point) => {
    const radius = ERASE_RADIUS_PX / (point.scale * zoom)
    const next = objects.filter((item) => !hitsItem(item, point, radius))
    if (next.length !== objects.length) replaceObjects(next)
  }

  const startGesture = (event) => {
    if (!event.isPrimary) return
    setPopover(null)
    if (readOnly && tool !== 'hand') return
    event.preventDefault()
    svgRef.current?.setPointerCapture?.(event.pointerId)

    if (tool === 'hand') {
      const v = toView(event.clientX, event.clientY)
      setGesture({ kind: 'pan', startX: v.x, startY: v.y, pan })
      return
    }
    const point = toBoard(event.clientX, event.clientY)
    if (tool === 'text') { setTextEntry({ point, value: '' }); return }
    if (tool === 'eraser') { setGesture({ kind: 'erase' }); eraseAt(point); return }

    const type = ['line', 'arrow', 'rect', 'ellipse'].includes(tool) ? tool : 'path'
    setDraft({
      id: makeId(), type, x: point.x, y: point.y, endX: point.x, endY: point.y,
      color: tool === 'marker' ? `${color}88` : color,
      width: tool === 'marker' ? strokeWidth * 3 : strokeWidth,
      points: [{ x: point.x, y: point.y }],
    })
    setGesture({ kind: 'draw' })
  }

  const moveGesture = (event) => {
    if (!gesture) return
    if (gesture.kind === 'pan') {
      const v = toView(event.clientX, event.clientY)
      setPan({ x: gesture.pan.x + (v.x - gesture.startX), y: gesture.pan.y + (v.y - gesture.startY) })
      return
    }
    if (readOnly) return
    const point = toBoard(event.clientX, event.clientY)
    if (gesture.kind === 'erase') { eraseAt(point); return }
    if (gesture.kind !== 'draw') return
    setDraft((current) => {
      if (!current) return current
      if (current.type === 'path') return { ...current, points: [...current.points, { x: point.x, y: point.y }] }
      return { ...current, endX: point.x, endY: point.y }
    })
  }

  const endGesture = () => {
    if (!readOnly && gesture?.kind === 'draw' && draft) {
      const finalObject = draft.type === 'path' && draft.points.length < 2
        ? { ...draft, points: [...draft.points, { x: draft.x + 0.1, y: draft.y + 0.1 }] }
        : draft
      commit(finalObject)
    }
    setDraft(null)
    setGesture(null)
  }

  const submitText = (event) => {
    event?.preventDefault()
    const value = textEntry?.value.trim()
    if (value) {
      commit({ id: makeId(), type: 'text', x: textEntry.point.x, y: textEntry.point.y, text: value, color, fontSize: 36 + strokeWidth * 4 })
    }
    setTextEntry(null)
  }

  const zoomBy = (factor) => setZoom((current) => Math.min(3, Math.max(0.35, Number((current * factor).toFixed(2)))))
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  const allObjects = useMemo(() => (draft ? [...objects, draft] : objects), [objects, draft])

  const renderObject = (item) => {
    const common = { key: item.id, stroke: item.color, strokeWidth: item.width || 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', vectorEffect: 'non-scaling-stroke' }
    if (item.type === 'path') return <polyline {...common} points={item.points.map((p) => `${p.x},${p.y}`).join(' ')} />
    if (item.type === 'line' || item.type === 'arrow') return <line {...common} x1={item.x} y1={item.y} x2={item.endX} y2={item.endY} markerEnd={item.type === 'arrow' ? 'url(#whiteboard-arrow)' : undefined} />
    if (item.type === 'rect') return <rect {...common} x={Math.min(item.x, item.endX)} y={Math.min(item.y, item.endY)} width={Math.abs(item.endX - item.x)} height={Math.abs(item.endY - item.y)} />
    if (item.type === 'ellipse') return <ellipse {...common} cx={(item.x + item.endX) / 2} cy={(item.y + item.endY) / 2} rx={Math.abs(item.endX - item.x) / 2} ry={Math.abs(item.endY - item.y) / 2} />
    if (item.type === 'text') return <text key={item.id} x={item.x} y={item.y} fill={item.color} fontSize={item.fontSize} fontFamily="inherit" direction="rtl" textAnchor="start">{item.text}</text>
    return null
  }

  const activeShape = SHAPE_TOOLS.find((t) => t.id === tool)
  const ShapeIcon = activeShape?.icon || Shapes
  const togglePop = (name) => setPopover((current) => (current === name ? null : name))
  const pick = (id) => { setTool(id); setPopover(null) }

  return (
    <section ref={rootRef} className="wb-root" aria-label="تخته تعاملی" dir="rtl">
      <div className="wb-toolbar" role="toolbar" aria-label="ابزارهای تخته">
        {readOnly ? (
          <>
            <span className="wb-readonly"><Hand size={15} aria-hidden="true" />تخته مدرس · فقط مشاهده</span>
            <span className="wb-spacer" />
          </>
        ) : (
          <>
            <ToolButton id="pen" label="قلم" icon={Pencil} tool={tool} onPick={pick} />
            <ToolButton id="eraser" label="پاک‌کن" icon={Eraser} tool={tool} onPick={pick} />
            <ToolButton id="text" label="متن" icon={Type} tool={tool} onPick={pick} />

            <div className="wb-anchor">
              <button type="button" data-wb-pop-trigger className={`wb-btn ${activeShape ? 'is-active' : ''}`} aria-label="اشکال" title="اشکال" aria-expanded={popover === 'shapes'} onClick={() => togglePop('shapes')}>
                <ShapeIcon size={18} />
              </button>
              {popover === 'shapes' && (
                <div className="wb-pop" data-wb-pop role="menu">
                  {SHAPE_TOOLS.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="menuitem" className={`wb-pop-item ${tool === id ? 'is-active' : ''}`} onClick={() => pick(id)}><Icon size={17} /><span>{label}</span></button>
                  ))}
                </div>
              )}
            </div>

            <ToolButton id="hand" label="حرکت بوم" icon={Hand} tool={tool} onPick={pick} />
            <span className="wb-sep" aria-hidden="true" />

            <div className="wb-anchor">
              <button type="button" data-wb-pop-trigger className="wb-btn" aria-label="رنگ و ضخامت" title="رنگ و ضخامت" aria-expanded={popover === 'style'} onClick={() => togglePop('style')}>
                <span className="wb-swatch" style={{ '--swatch': color }} />
              </button>
              {popover === 'style' && (
                <div className="wb-pop wb-pop-style" data-wb-pop>
                  <div className="wb-colors" role="group" aria-label="رنگ">
                    {COLORS.map((item) => (
                      <button key={item} type="button" aria-label={`رنگ ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} className={`wb-color ${color === item ? 'is-selected' : ''}`} style={{ '--swatch': item }} />
                    ))}
                  </div>
                  <label className="wb-width">
                    <span>ضخامت</span>
                    <input aria-label="ضخامت قلم" type="range" min="1" max="12" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} />
                    <span className="wb-width-preview" style={{ '--w': `${Math.max(2, strokeWidth)}px`, '--swatch': color }} />
                  </label>
                </div>
              )}
            </div>

            <button type="button" className="wb-btn" onClick={undo} disabled={!objects.length} aria-label="واگرد" title="واگرد"><Undo2 size={18} /></button>
            <button type="button" className="wb-btn" onClick={redo} disabled={!redoStack.length} aria-label="انجام مجدد" title="انجام مجدد"><Redo2 size={18} /></button>
            <span className="wb-spacer" />

            <div className="wb-anchor">
              <button type="button" data-wb-pop-trigger className="wb-btn" aria-label="بیشتر" title="بیشتر" aria-expanded={popover === 'more'} onClick={() => togglePop('more')}><MoreHorizontal size={18} /></button>
              {popover === 'more' && (
                <div className="wb-pop wb-pop-end" data-wb-pop role="menu">
                  <button type="button" role="menuitem" className="wb-pop-item" onClick={() => { resetView(); setPopover(null) }}><RotateCcw size={17} /><span>بازنشانی نما</span></button>
                  {isHost && <button type="button" role="menuitem" className="wb-pop-item is-danger" disabled={!objects.length} onClick={() => { setPopover(null); setClearConfirmOpen(true) }}><Trash2 size={17} /><span>پاک‌کردن تخته برای همه</span></button>}
                </div>
              )}
            </div>
          </>
        )}
        {isHost && <button type="button" className="wb-btn wb-close" onClick={onClose} aria-label="بستن تخته برای کلاس" title="بستن تخته برای کلاس"><X size={18} /></button>}
      </div>

      <div className="wb-canvas-wrap">
        <svg
          ref={svgRef}
          className={`wb-canvas ${tool === 'hand' ? 'is-panning' : 'is-drawing'}`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          onPointerDown={startGesture}
          onPointerMove={moveGesture}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onWheel={(event) => { if (event.ctrlKey || event.metaKey) zoomBy(event.deltaY < 0 ? 1.08 : 0.92) }}
          role="application"
          aria-label="بوم تخته"
        >
          <defs>
            <pattern id="whiteboard-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e8edf4" strokeWidth="1" /></pattern>
            <marker id="whiteboard-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke" /></marker>
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <rect x="-12000" y="-12000" width="24000" height="24000" fill="#ffffff" />
            <rect x="-12000" y="-12000" width="24000" height="24000" fill="url(#whiteboard-grid)" />
            {allObjects.map(renderObject)}
          </g>
        </svg>

        {!objects.length && !draft && !readOnly && <div className="wb-empty" aria-hidden="true">با قلم روی بوم بنویسید</div>}

        <div className="wb-zoom" dir="ltr" role="group" aria-label="بزرگ‌نمایی">
          <button type="button" onClick={() => zoomBy(0.87)} aria-label="کوچک‌نمایی">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomBy(1.15)} aria-label="بزرگ‌نمایی">+</button>
          <button type="button" onClick={resetView} aria-label="نمای پیش‌فرض"><Maximize size={14} /></button>
        </div>

        {textEntry && (
          <form className="wb-textbar" onSubmit={submitText}>
            <input
              ref={textInputRef}
              value={textEntry.value}
              onChange={(event) => setTextEntry((current) => ({ ...current, value: event.target.value }))}
              onKeyDown={(event) => { if (event.key === 'Escape') setTextEntry(null) }}
              placeholder="متن را بنویسید و تأیید کنید"
              aria-label="متن روی تخته"
              enterKeyHint="done"
            />
            <button type="submit" className="wb-text-ok" aria-label="افزودن متن" disabled={!textEntry.value.trim()}><Check size={18} /></button>
            <button type="button" className="wb-text-cancel" aria-label="انصراف" onClick={() => setTextEntry(null)}><X size={18} /></button>
          </form>
        )}
      </div>

      {clearConfirmOpen && (
        <div className="wb-modal-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setClearConfirmOpen(false) }}>
          <section className="wb-confirm" role="dialog" aria-modal="true" aria-labelledby="wb-clear-title" dir="rtl">
            <AlertTriangle size={22} className="wb-confirm-icon" aria-hidden="true" />
            <h2 id="wb-clear-title">پاک‌کردن تخته برای همه؟</h2>
            <p>همه‌ی نوشته‌ها و شکل‌ها برای تمام حاضران کلاس پاک می‌شود و قابل بازگشت نیست.</p>
            <div className="wb-confirm-actions">
              <button type="button" onClick={() => setClearConfirmOpen(false)}>انصراف</button>
              <button type="button" className="is-danger" onClick={() => { onClear?.(); setRedoStack([]); setClearConfirmOpen(false) }}><Trash2 size={15} /> پاک‌کردن</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function ToolButton({ id, label, icon: Icon, tool, onPick }) {
  return (
    <button type="button" className={`wb-btn ${tool === id ? 'is-active' : ''}`} aria-label={label} title={label} aria-pressed={tool === id} onClick={() => onPick(id)}>
      <Icon size={18} />
    </button>
  )
}
