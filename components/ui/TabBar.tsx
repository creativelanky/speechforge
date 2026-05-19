'use client'

import { House, Microphone, Clock, User } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/home', icon: House, label: 'Home' },
  { href: '/practice', icon: Microphone, label: 'Practice' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] border-t border-[rgba(60,60,67,0.12)] material-thin z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
    >
      <div className="flex items-center justify-around h-[49px]">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'ios-press flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                active ? 'text-[#E8590C]' : 'text-[rgba(60,60,67,0.4)]'
              )}
            >
              <Icon size={22} weight={active ? 'duotone' : 'regular'} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
