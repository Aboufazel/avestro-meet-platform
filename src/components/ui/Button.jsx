import { Loader2 } from 'lucide-react'

const variantClasses = {
  primary:
    'bg-olive-500 text-olive-950 hover:bg-olive-400 active:scale-95 border border-olive-500',
  secondary:
    'bg-transparent text-olive-300 border border-olive-700 hover:bg-olive-800 hover:border-olive-600 active:scale-95',
  ghost:
    'bg-transparent text-olive-400 hover:bg-olive-800 active:scale-95 border border-transparent',
  danger:
    'bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600/30 active:scale-95',
}

const sizeClasses = {
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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].join(' ')}
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
