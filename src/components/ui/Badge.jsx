const variantClasses = {
  live: 'bg-olive-500/20 text-olive-400 border-olive-500/40',
  scheduled: 'bg-olive-800 text-olive-300 border-olive-700',
  ended: 'bg-olive-900 text-olive-600 border-olive-800',
}

export function Badge({ variant = 'scheduled', children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border',
        variantClasses[variant] || variantClasses.scheduled,
        className,
      ].join(' ')}
    >
      {variant === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-olive-500" />
        </span>
      )}
      {children}
    </span>
  )
}
