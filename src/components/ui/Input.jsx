import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Input({
  label,
  placeholder,
  error,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  className = '',
  name,
  id,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="text-sm text-olive-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <span className="absolute right-3 text-olive-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          id={id || name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={[
            'w-full bg-olive-900 border rounded-xl px-4 py-2.5 text-olive-100 placeholder:text-olive-600',
            'focus:outline-none focus:ring-2 focus:ring-olive-500/50 focus:border-olive-500',
            'transition-all duration-200',
            Icon ? 'pr-10' : '',
            isPassword ? 'pl-10' : '',
            error ? 'border-red-500/60' : 'border-olive-700',
          ].join(' ')}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute left-3 text-olive-500 hover:text-olive-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
