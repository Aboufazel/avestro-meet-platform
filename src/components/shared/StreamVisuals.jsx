/* تصویرسازی‌های متحرک انتقال تصویر؛ تزئینی و پنهان از صفحه‌خوان.
   انیمیشن‌ها با CSS/SMIL هستند و با prefers-reduced-motion متوقف می‌شوند. */
const CSS = `
.sv-ring{transform-box:fill-box;transform-origin:center;animation:sv-ring 3s ease-out infinite}
.sv-ring.b{animation-delay:1.5s}
@keyframes sv-ring{0%{transform:scale(.55);opacity:.7}100%{transform:scale(1.6);opacity:0}}
.sv-live{animation:sv-live 1.6s ease-in-out infinite}
@keyframes sv-live{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.sv-ring,.sv-live{animation:none}.sv-pkt{display:none}}
`
const VIEWERS = [34, 104, 174, 244]

export function StreamFlow({className = ''}) {
    return <svg viewBox="0 0 640 330" className={className} role="img" aria-label="تصویر از سخنران به همه شرکت‌کنندگان منتقل می‌شود" fill="none">
        <style>{CSS}</style>
        <defs>
            <linearGradient id="svg-line" x1="1" x2="0"><stop stopColor="#54d9b0"/><stop offset="1" stopColor="#4f7cff"/></linearGradient>
            <radialGradient id="svg-hub"><stop stopColor="#4f7cff" stopOpacity=".55"/><stop offset="1" stopColor="#4f7cff" stopOpacity="0"/></radialGradient>
        </defs>
        {/* مسیرها */}
        <path id="p-in" d="M560 150 H360" stroke="url(#svg-line)" strokeWidth="2" strokeDasharray="3 7" opacity=".6"/>
        {VIEWERS.map((y, i) => <path key={y} id={`p-${i}`} d={`M300 150 C230 150 200 ${y + 26} 130 ${y + 26}`} stroke="url(#svg-line)" strokeWidth="2" strokeDasharray="3 7" opacity=".5"/>)}
        {/* بسته‌های تصویر */}
        {[0, 1, 2].map(k => <rect key={k} className="sv-pkt" width="14" height="9" rx="2" fill="#54d9b0">
            <animateMotion dur="2.4s" begin={`${k * .8}s`} repeatCount="indefinite"><mpath href="#p-in"/></animateMotion></rect>)}
        {VIEWERS.map((y, i) => <rect key={y} className="sv-pkt" width="12" height="8" rx="2" fill="#9eb6ff">
            <animateMotion dur="2.2s" begin={`${i * .45}s`} repeatCount="indefinite"><mpath href={`#p-${i}`}/></animateMotion></rect>)}
        {/* سرور */}
        <circle cx="330" cy="150" r="70" fill="url(#svg-hub)"/>
        <circle className="sv-ring" cx="330" cy="150" r="34" stroke="#6c93ff" strokeWidth="1.5"/>
        <circle className="sv-ring b" cx="330" cy="150" r="34" stroke="#54d9b0" strokeWidth="1.5"/>
        <circle cx="330" cy="150" r="30" fill="#111a2a" stroke="#4f7cff" strokeWidth="2"/>
        <path d="M318 142h24M318 150h24M318 158h24" stroke="#9eb6ff" strokeWidth="3" strokeLinecap="round"/>
        {/* سخنران */}
        <rect x="560" y="112" width="68" height="76" rx="14" fill="#111a2a" stroke="#54d9b0" strokeWidth="2"/>
        <circle cx="594" cy="142" r="11" fill="#31584f"/><path d="M574 176c4-12 36-12 40 0" stroke="#54d9b0" strokeWidth="3" strokeLinecap="round"/>
        <circle className="sv-live" cx="616" cy="124" r="3.5" fill="#ef6678"/>
        {/* بینندگان */}
        {VIEWERS.map(y => <g key={y}><rect x="30" y={y} width="100" height="52" rx="10" fill="#111a2a" stroke="#6c93ff" strokeOpacity=".6" strokeWidth="1.5"/>
            <circle cx="80" cy={y + 20} r="7" fill="#24344d"/><rect x="62" y={y + 33} width="36" height="6" rx="3" fill="#24344d"/></g>)}
        <text x="594" y="214" textAnchor="middle" fontSize="12" fill="#68758a">سخنران</text>
        <text x="330" y="214" textAnchor="middle" fontSize="12" fill="#68758a">اَوسترو میت</text>
        <text x="80" y="322" textAnchor="middle" fontSize="12" fill="#68758a">شرکت‌کنندگان</text>
    </svg>
}