'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', fullWidth, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-full transition-colors duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#3ECF8E]/50 disabled:opacity-40 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-[#3ECF8E] text-black hover:bg-[#2db77c]',
      default: 'bg-[#242424] border border-[rgba(255,255,255,0.1)] text-[#ededed] hover:bg-[#2a2a2a] hover:border-[rgba(255,255,255,0.2)]',
      outline: 'bg-transparent border border-[rgba(255,255,255,0.1)] text-[#ededed] hover:bg-[#1a1a1a] hover:border-[rgba(255,255,255,0.2)]',
      ghost: 'bg-transparent text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#ededed]',
      destructive: 'bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.3)] text-[#E5484D] hover:bg-[rgba(229,72,77,0.2)]',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-12 px-5 text-[15px] gap-2',
      lg: 'h-13 px-6 text-base gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
