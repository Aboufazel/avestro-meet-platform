import { useEffect } from 'react'
import { X } from 'lucide-react'

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          'relative w-full bg-olive-900 border border-olive-700 rounded-2xl shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          sizeClasses[size],
        ].join(' ')}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-olive-700">
            <h3 className="text-olive-100">{title}</h3>
            <button
              onClick={onClose}
              className="text-olive-500 hover:text-olive-300 transition-colors p-1 rounded-lg hover:bg-olive-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
