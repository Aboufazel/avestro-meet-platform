import { RotateCw } from 'lucide-react'

/**
 * گیت اجباری ورود کلاس آنلاین (فقط kind = class — نه سمینار).
 *
 * وقتی کاربر می‌خواد وارد کلاس آنلاین بشه و گوشی‌ش عمودی است، این صفحه‌ی
 * زیبا «به‌تنهایی و بدون هیچ راه دیگری» نمایش داده می‌شه: تا کاربر گوشی رو
 * واقعاً افقی نچرخونه، هیچ راهی برای ورود نداره و چیزی جز همین صفحه دیده
 * نمی‌شه. به‌محض چرخاندن گوشی، والد (RoomPage) این کامپوننت رو حذف می‌کنه
 * و کاربر مستقیم وارد کلاس می‌شه.
 *
 * نکته: این کامپوننت باید بیرون از room-shell رندر بشه تا تحت تأثیر
 * چرخش مجازی محیط کلاس (data-fl) قرار نگیره.
 */
export function RotateDeviceGate() {
  return (
    <div className="rg-root" dir="rtl" role="dialog" aria-modal="true" aria-label="برای ورود به کلاس، گوشی را افقی قرار بده">
      <span className="rg-glow rg-glow-blue" aria-hidden="true" />
      <span className="rg-glow rg-glow-mint" aria-hidden="true" />

      <div className="rg-card">
        <span className="rg-pill"><span className="rg-pill-dot" aria-hidden="true" /> کلاس آنلاین</span>

        <div className="rg-stage" aria-hidden="true">
          <span className="rg-ring" />
          <span className="rg-halo" />
          <span className="rg-phone">
            <span className="rg-phone-line" />
            <span className="rg-phone-line rg-phone-line-short" />
          </span>
          <span className="rg-rotate-badge"><RotateCw size={15} strokeWidth={2.4} /></span>
        </div>

        <h2 className="rg-title">گوشی را افقی قرار بده</h2>
        <p className="rg-text">برای ورود به کلاس آنلاین، گوشی خود را ۹۰ درجه بچرخان. ورود به کلاس فقط با حالت افقی انجام می‌شود.</p>
      </div>
    </div>
  )
}
