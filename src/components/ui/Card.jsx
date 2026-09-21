const paddingClasses = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export function Card({ children, className = '', padding = 'md' }) {
  return (
    <div
      className={[
        'bg-white border border-[#e5eaf2] rounded-[22px] shadow-[0_12px_38px_rgba(20,35,65,.055)]',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
