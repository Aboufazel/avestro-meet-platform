
import { Loader2 } from 'lucide-react'

const variants = {
  primary: {
    backgroundColor: '#4f7cff',
    backgroundImage: 'linear-gradient(to left, #4f7cff, #6a8fff)',
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: '0 10px 24px rgba(79,124,255,.18)',
  },
  secondary: {
    backgroundColor: '#ffffff',
    color: '#101827',
    border: '1px solid #e2e7ef',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#68758a',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: '#fff0f2',
    color: '#d84d61',
    border: '1px solid rgba(239,102,120,.25)',
  },
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-base rounded-xl gap-2',
  lg: 'px-6 py-3 text-lg rounded-xl gap-2',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={variants[variant] || variants.primary}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-200 select-none',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[#4f7cff] focus-visible:ring-offset-2',
        'active:scale-[.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:brightness-[1.03]',
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}

      {children}
    </button>
  )
}
