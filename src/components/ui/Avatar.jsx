const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export function Avatar({ name = '', size = 'md', src, className = '' }) {
  const initial = name?.charAt(0) || '؟'

  return (
    <div
      className={[
        'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
        'bg-olive-800 border border-olive-700 text-olive-400 font-medium',
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  )
}
