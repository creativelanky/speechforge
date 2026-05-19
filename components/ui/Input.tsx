'use client'

import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#a0a0a0]">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 px-4 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-2xl text-[15px] text-[#ededed] placeholder:text-[#6b6b6b] outline-none transition-colors',
            'focus:border-[#3ECF8E]/50 focus:ring-1 focus:ring-[#3ECF8E]/20',
            error && 'border-[#E5484D]/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#E5484D]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
