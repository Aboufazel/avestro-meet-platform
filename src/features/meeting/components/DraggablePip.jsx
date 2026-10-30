import { useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

const MARGIN = 8
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

/**
 * پنجره‌ی شناورِ تصویر معلم (PiP): با کشیدن جابه‌جا می‌شود و به نزدیک‌ترین گوشه می‌چسبد؛
 * با دکمه‌ی گوشه‌اش (یا یک لمس ساده) بین حالت کوچک و بزرگ عوض می‌شود.
 * محدوده‌ی حرکتش نزدیک‌ترین والدِ position‌دار است (صحنه یا تخته، بدون نوار پایین).
 */
export function DraggablePip({ children, initialCorner = 'bl', label = 'تصویر معلم', className = '' }) {
  const ref = useRef(null)
  const gesture = useRef(null)
  const [corner, setCorner] = useState(initialCorner) // 't|b' + 'l|r'
  const [big, setBig] = useState(false)
  const [pos, setPos] = useState(null) // حین کشیدن: { x, y }

  const onPointerDown = (e) => {
    if (e.target.closest('[data-pip-btn]')) return
    const el = ref.current
    const parent = el?.offsetParent
    if (!el || !parent) return
    const r = el.getBoundingClientRect()
    const pr = parent.getBoundingClientRect()
    gesture.current = { sx: e.clientX, sy: e.clientY, ox: r.left - pr.left, oy: r.top - pr.top, w: r.width, h: r.height, pw: pr.width, ph: pr.height, moved: false }
    el.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy
    if (!g.moved && Math.hypot(dx, dy) < 6) return
    g.moved = true
    setPos({ x: clamp(g.ox + dx, 0, g.pw - g.w), y: clamp(g.oy + dy, 0, g.ph - g.h) })
  }
  const onPointerUp = () => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (g.moved && pos) {
      const v = pos.y + g.h / 2 < g.ph / 2 ? 't' : 'b'
      const h = pos.x + g.w / 2 < g.pw / 2 ? 'l' : 'r'
      setCorner(v + h)
    } else {
      setBig((b) => !b)
    }
    setPos(null)
  }

  const anchor = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', transition: 'none' }
    : {
        [corner[1] === 'l' ? 'left' : 'right']: MARGIN,
        [corner[0] === 't' ? 'top' : 'bottom']: MARGIN,
      }

  return (
    <div className="pip-bounds">
      <div
        ref={ref}
        className={`dpip ${big ? 'is-big' : ''} ${pos ? 'is-dragging' : ''} ${className}`}
        style={anchor}
        role="group"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="dpip-video">{children}</div>
        <button type="button" data-pip-btn className="dpip-btn" onClick={() => setBig((b) => !b)}
          aria-label={big ? 'کوچک‌کردن تصویر' : 'بزرگ‌کردن تصویر'}>
          {big ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  )
}
