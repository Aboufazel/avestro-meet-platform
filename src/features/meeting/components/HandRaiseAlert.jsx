import { Hand, Eye, X } from 'lucide-react'

/**
 * اعلان درون‌کلاسی «درخواست اجازه صحبت» — فقط برای مدرس.
 *
 * کوچک، واضح و غیرمزاحم؛ حتی وقتی پنل شرکت‌کنندگان بسته است دیده می‌شود.
 * دو اقدام مشخص دارد: مشاهده درخواست (بازکردن پنل شرکت‌کنندگان) و رد درخواست.
 * درخواست‌ها صف می‌شوند و یکی‌یکی نمایش داده می‌شوند؛ اعلان تکراری ساخته نمی‌شود.
 */
export function HandRaiseAlert({ alert, remaining = 0, onView, onDeny }) {
  if (!alert) return null

  return (
    <div className="cl-hand-alert" role="status" aria-live="polite">
      <span className="cl-hand-alert-icon"><Hand size={15} /></span>
      <div className="cl-hand-alert-body">
        <strong>{alert.name}</strong>
        <span>درخواست اجازه صحبت دارد{remaining > 0 ? ` · ${remaining} درخواست دیگر در صف` : ''}</span>
      </div>
      <div className="cl-hand-alert-actions">
        <button type="button" className="cl-hand-alert-view" onClick={() => onView?.(alert)}>
          <Eye size={14} />
          مشاهده درخواست
        </button>
        <button type="button" className="cl-hand-alert-deny" onClick={() => onDeny?.(alert)} title="رد درخواست">
          <X size={14} />
          رد
        </button>
      </div>
    </div>
  )
}
