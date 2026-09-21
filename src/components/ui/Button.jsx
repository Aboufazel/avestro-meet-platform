import { Loader2 } from 'lucide-react'

const variantClasses = {
  primary: 'bg-gradient-to-l from-[#4f7cff] to-[#6a8fff] text-white hover:brightness-[1.03] active:scale-[.98] border border-transparent shadow-[0_10px_24px_rgba(79,124,255,.18)]',
  secondary: 'bg-white text-[#101827] border border-[#e2e7ef] hover:bg-[#edf2ff] hover:border-[#b9c8ef] active:scale-[.98]',
  ghost: 'bg-transparent text-[#68758a] hover:bg-[#f4f7fb] hover:text-[#101827] active:scale-[.98] border border-transparent',
  danger: 'bg-[#ef6678]/10 text-[#d84d61] border border-[#ef6678]/25 hover:bg-[#ef6678]/15 active:scale-[.98]',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-base rounded-xl gap-2',
  lg: 'px-6 py-3 text-lg rounded-xl gap-2',
}

export function Button({ children, variant = 'primary', size = 'md', fullWidth = false, loading = false, disabled = false, icon: Icon, onClick, type = 'button', className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={['inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none', variantClasses[variant], sizeClasses[size], fullWidth ? 'w-full' : '', disabled || loading ? 'opacity-50 cursor-not-allowed' : '', className].join(' ')}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  )
}
