import { RotateCw } from 'lucide-react'

/**
 * گیت ورود کلاس آنلاین (فقط kind = class — نه سمینار).
 *
 * وقتی کاربر می‌خواد وارد کلاس آنلاین بشه و گوشی‌ش عمودی است، این صفحه‌ی
 * زیبا نمایش داده می‌شه و پیشنهاد می‌کنه گوشی رو افقی بگیره (تجربه‌ی کامل
 * با صفحه‌ی بزرگ‌تر). استثنا: چون حالت عمودی هم چیدمان کامل و کاربردی دارد
 * (تخته تمام‌عرض + مدرس شناور + داک پایین)، لینک کم‌رنگ «ادامه با حالت
 * عمودی» هم هست. به‌محض چرخاندن گوشی، والد (RoomPage) این کامپوننت رو
 * حذف می‌کنه و کاربر مستقیم وارد کلاس می‌شه.
 *
 * نکته: این کامپوننت باید بیرون از room-shell رندر بشه.
 */
export function RotateDeviceGate({ onContinue }) {
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
        <p className="rg-text">برای تجربه‌ی کامل کلاس، گوشی خود را ۹۰ درجه بچرخان. تخته، صدا و گفتگو در حالت عمودی هم در دسترس است.</p>

        {onContinue && (
          <button type="button" className="rg-continue" onClick={onContinue}>
            ادامه با حالت عمودی
          </button>
        )}
      </div>
    </div>
  )
}
