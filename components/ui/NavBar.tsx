'use client'

import { CaretLeft } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavBarProps {
  title?: string
  subtitle?: string
  back?: boolean
  backLabel?: string
  backHref?: string
  right?: React.ReactNode
  transparent?: boolean
  className?: string
}

export function NavBar({ title, subtitle, back, backLabel = 'Back', backHref, right, transparent, className }: NavBarProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between h-11 px-4 border-b border-[rgba(60,60,67,0.12)]',
        transparent ? 'bg-transparent' : 'material-thin sticky top-0 z-40',
        className
      )}
    >
      <div className="flex items-center min-w-[80px]">
        {back && (
          <button
            onClick={handleBack}
            className="ios-press flex items-center gap-0.5 text-[#E8590C] text-[17px] -ml-1"
          >
            <CaretLeft size={22} weight="bold" />
            <span>{backLabel}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col items-center">
        {title && <span className="text-[17px] font-semibold text-black leading-tight">{title}</span>}
        {subtitle && <span className="text-[12px] text-[rgba(60,60,67,0.6)] leading-tight">{subtitle}</span>}
      </div>

      <div className="flex items-center justify-end min-w-[80px]">
        {right}
      </div>
    </div>
  )
}
