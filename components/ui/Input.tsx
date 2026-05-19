'use client'

import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#a0a0a0]">{label}</label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full h-12 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-2xl text-[15px] text-[#ededed] placeholder:text-[#6b6b6b] outline-none transition-colors',
              'focus:border-[#3ECF8E]/50 focus:ring-1 focus:ring-[#3ECF8E]/20',
              isPassword ? 'px-4 pr-11' : 'px-4',
              error && 'border-[#E5484D]/50',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors"
            >
              {showPassword
                ? <EyeSlash size={18} weight="regular" />
                : <Eye size={18} weight="regular" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-[#E5484D]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
