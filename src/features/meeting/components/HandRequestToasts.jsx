import { memo } from 'react'
import { Hand } from 'lucide-react'
import { useMeetingStore } from '../store/meeting-store'

const MAX_VISIBLE = 3

/**
 * اعلان کوچک و غیرمزاحم برای مدرس: «علی احمدی درخواست اجازه صحبت دارد»
 *  • مشاهده درخواست: پنل شرکت‌کنندگان (و صف دست‌های بلندشده) را باز می‌کند
 *  • رد درخواست: دست دانش‌آموز را از سمت سرور پایین می‌آورد
 */
export const HandRequestToasts = memo(function HandRequestToasts({ notices, onDismiss, onDismissAll, onReject }) {
  // وقتی فهرست شرکت‌کنندگان باز است، خودِ صف درخواست‌ها دیده می‌شود؛ اعلان لازم نیست.
  const peopleOpen = useMeetingStore((s) => s.isPanelOpen && s.activePanelTab === 'participants')
  if (!notices.length || peopleOpen) return null
  const visible = notices.slice(0, MAX_VISIBLE)
  const extra = notices.length - visible.length

  const view = (id) => {
    useMeetingStore.setState({ isPanelOpen: true, activePanelTab: 'participants', isChatOpen: false })
    onDismiss(id)
  }

  return (
    <div className="cl-toasts" role="status" aria-live="polite">
      {visible.map((r) => (
        <div className="cl-toast" key={r.id}>
          <Hand size={18} aria-hidden="true" />
          <span className="cl-toast-text"><b>{r.name}</b> درخواست اجازه صحبت دارد</span>
          <button type="button" className="cl-toast-view" onClick={() => view(r.id)}>مشاهده</button>
          <button type="button" className="cl-toast-reject" onClick={() => { onReject(r.key); onDismiss(r.id) }}>رد</button>
        </div>
      ))}
      {extra > 0 && <button type="button" className="cl-toast-more" onClick={onDismissAll}>و {extra} درخواست دیگر · بستن اعلان‌ها</button>}
    </div>
  )
})
