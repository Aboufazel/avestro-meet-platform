const paddingClasses = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export function Card({ children, className = '', padding = 'md' }) {
  return (
    <div
      className={[
        'bg-olive-900 border border-olive-700 rounded-2xl',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
