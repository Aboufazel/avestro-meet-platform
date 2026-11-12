import { memo, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CornerUpLeft, Plus } from 'lucide-react'
import WhiteboardPanel from './WhiteboardPanel'
import './whiteboard-stage.css'

const EMPTY = []
const LABELS = {
  clear: 'پاک‌کردن این صفحه',
  clearTitle: 'پاک‌کردن این صفحه؟',
  clearText: 'همه‌ی نوشته‌ها و شکل‌های این صفحه برای تمام حاضران پاک می‌شود. صفحه‌های دیگر دست‌نخورده می‌مانند.',
}
const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

/**
 * تخته‌ی چندصفحه‌ای.
 * معلم صفحه می‌سازد و بین صفحه‌ها می‌رود؛ همه‌ی دانش‌آموزان صفحه‌ی معلم را دنبال می‌کنند.
 * دانش‌آموز می‌تواند صفحه‌های قبلی را مرور کند (تا صفحه‌ی فعلی معلم)، نه صفحه‌های بعدی را؛
 * با عوض‌شدن صفحه‌ی معلم دوباره دنبال او می‌شود. نوشتن دانش‌آموز فقط روی صفحه‌ی معلم است.
 */
export const WhiteboardStage = memo(function WhiteboardStage({
  state, views, canControl, studentsCanDraw, onClose, onObjects, onPage, onAddPage, onView,
}) {
  const teacherPage = state?.page || 1
  const pageCount = state?.page_count || 1
  const lastPage = canControl ? pageCount : teacherPage

  const [localPage, setLocalPage] = useState(null)
  useEffect(() => { setLocalPage(null) }, [teacherPage])
  const current = canControl || !localPage ? teacherPage : Math.min(localPage, teacherPage)
  const browsing = !canControl && current !== teacherPage

  const objects = state?.pages?.[String(current)] || (current === teacherPage ? state?.objects : null) || EMPTY
  const view = views?.[String(current)] || null
  const writable = canControl || (Boolean(studentsCanDraw) && current === teacherPage)

  const goTo = (number) => {
    const next = Math.min(Math.max(1, number), lastPage)
    if (next === current) return
    if (canControl) onPage?.(next)
    else setLocalPage(next === teacherPage ? null : next)
  }

  // میزبان: نمای خودش را می‌فرستد؛ دانش‌آموزِ روی صفحه‌ی معلم: نمای معلم را دنبال می‌کند؛
  // دانش‌آموزِ در حال مرور: فقط از آخرین نمای معلم روی آن صفحه شروع می‌کند و نمای محلی دارد.
  const viewProps = canControl
    ? { initialView: view, onViewChange: (next, final) => onView?.(current, next, final) }
    : browsing
      ? { initialView: view }
      : { followView: view }

  return (
    <div className="wbs-root" dir="rtl">
      <WhiteboardPanel
        key={`wb-page-${current}`}
        initialObjects={objects}
        onObjectsChange={(next) => onObjects?.(next, current)}
        onClose={onClose}
        onClear={() => onObjects?.([], current)}
        readOnly={!writable}
        isHost={canControl}
        labels={LABELS}
        {...viewProps}
      />
      <div className="wbs-pager" dir="ltr" role="group" aria-label="صفحه‌های تخته">
        <button type="button" onClick={() => goTo(current + 1)} disabled={current >= lastPage} aria-label="صفحه‌ی بعد"><ChevronLeft size={18} /></button>
        <span>{faNum(current)} / {faNum(lastPage)}</span>
        <button type="button" onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="صفحه‌ی قبل"><ChevronRight size={18} /></button>
        {canControl && (
          <button type="button" className="wbs-add" onClick={onAddPage} disabled={pageCount >= 20} aria-label="صفحه‌ی جدید" title="صفحه‌ی جدید"><Plus size={16} /></button>
        )}
        {browsing && (
          <button type="button" className="wbs-follow" onClick={() => setLocalPage(null)}><CornerUpLeft size={14} /> صفحه‌ی معلم</button>
        )}
      </div>
    </div>
  )
})
