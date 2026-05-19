'use client'

import { SquaresFour, Microphone, Clock, User } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/home', icon: SquaresFour, label: 'Dashboard' },
  { href: '/practice', icon: Microphone, label: 'Practice' },
  { href: '/history', icon: Clock, label: 'History' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] h-[calc(100vh-24px)] sticky top-3 shrink-0 flex-col rounded-2xl overflow-hidden backdrop-blur-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] m-3" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[rgba(255,255,255,0.06)]">
          <Image src="/Logo.png" alt="SpeechForge" width={28} height={28} className="rounded-md shrink-0" />
          <span className="font-bold text-[15px] text-[#ededed] tracking-tight">SpeechForge</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-full text-sm transition-all duration-150',
                  active
                    ? 'bg-[rgba(62,207,142,0.1)] text-[#3ECF8E] border border-[rgba(62,207,142,0.15)]'
                    : 'text-[#666] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#ededed] border border-transparent'
                )}>
                <Icon size={17} weight={active ? 'duotone' : 'regular'} />
                <span className="font-semibold">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.07)]">
          <div className="px-3 py-2.5 rounded-xl bg-[rgba(62,207,142,0.06)] border border-[rgba(62,207,142,0.12)]">
            <p className="text-xs font-bold text-[#3ECF8E] mb-0.5">Free Plan</p>
            <p className="text-xs text-[#555]">Unlimited sessions</p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-around px-2"
        style={{
          height: 64,
          background: 'rgba(14,14,14,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center justify-center flex-1 h-full">
              <div className="flex flex-col items-center justify-center gap-1 px-4 py-1.5 rounded-full transition-all duration-200"
                style={{ background: active ? 'rgba(62,207,142,0.18)' : 'transparent' }}>
                <Icon size={20} weight={active ? 'duotone' : 'regular'}
                  style={{ color: active ? '#3ECF8E' : '#555' }} />
                <span className="text-[10px] font-semibold" style={{ color: active ? '#3ECF8E' : '#555' }}>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
