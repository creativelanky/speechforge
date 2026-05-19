'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Microphone, ChatCircle, UploadSimple, ArrowRight } from '@phosphor-icons/react'
import Image from 'next/image'

export function LandingPage() {
  useEffect(() => {
    const b = document.body
    const html = document.documentElement
    b.style.backgroundColor = 'transparent'
    html.style.backgroundColor = 'transparent'
    b.style.backgroundImage = 'url(/hero-bg.png)'
    b.style.backgroundSize = 'cover'
    b.style.backgroundPosition = 'center top'
    b.style.backgroundRepeat = 'no-repeat'
    b.style.backgroundAttachment = 'fixed'
    return () => {
      b.style.backgroundColor = ''
      html.style.backgroundColor = ''
      b.style.backgroundImage = ''
      b.style.backgroundSize = ''
      b.style.backgroundPosition = ''
      b.style.backgroundRepeat = ''
      b.style.backgroundAttachment = ''
    }
  }, [])

  return (
    <div className="min-h-screen text-[#ededed] overflow-x-hidden relative">

      {/* Dark overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 40%, rgba(8,8,8,0.92) 85%, #080808 100%)' }} />

      {/* All content above overlay */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── Navbar ── */}
        <header className="flex items-center justify-between px-4 md:px-8 h-[60px]">
          <div style={{ width: 146, height: 96, overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/Logo.svg" alt="SpeechForge" width={519} height={236}
              style={{ height: 96, width: 'auto', maxWidth: 'none' }} />
          </div>

<div className="flex items-center gap-2">
            <Link href="/login"
              className="h-9 px-5 rounded-full text-sm font-semibold transition-colors flex items-center"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)' }}>
              Login
            </Link>
            <Link href="/signup"
              className="h-9 px-5 rounded-full text-sm font-bold transition-all hover:opacity-90 flex items-center"
              style={{ background: '#ffffff', color: '#000000' }}>
              Get started free
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="flex flex-col items-center px-6 text-center pt-[10vh] pb-20"
          style={{ minHeight: 'calc(100vh - 60px)' }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 mb-6"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 999,
              padding: '5px 14px 5px 5px',
            }}>
            <span className="text-[11px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: '#3ECF8E', color: '#000', boxShadow: '0 0 10px 2px rgba(62,207,142,0.6)' }}>
              NEW
            </span>
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Interviews · Conversations · Dating
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ maxWidth: 820, margin: '0 auto' }}>
            <span className="block font-semibold leading-[1.08] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(28px, 4vw, 56px)', color: 'rgba(255,255,255,0.42)' }}>
              Train your voice,
            </span>
            <span className="block font-bold leading-[1.08] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(28px, 4vw, 56px)', color: '#ffffff' }}>
              own every room.
            </span>
            <span className="block font-semibold leading-[1.08] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(28px, 4vw, 56px)', color: 'rgba(255,255,255,0.42)' }}>
              with AI that pushes back.
            </span>
          </h1>

          {/* Body */}
          <p className="mt-5 text-[14px] leading-relaxed max-w-[460px]"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            Practice with AI personas that push back — nail job interviews, sharpen your pitches, and build real confidence in dating and everyday conversations.
          </p>

          {/* CTA Buttons */}
          <div className="mt-7 flex flex-row items-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 font-bold text-[15px] transition-all hover:opacity-90"
              style={{ height: 50, padding: '0 24px', borderRadius: 999, background: '#ffffff', color: '#000000' }}>
              Talk to your AI
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center gap-2 font-semibold text-[15px] transition-all"
              style={{ height: 50, padding: '0 24px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)' }}>
              Get started free
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>

          {/* Features row */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-x-12 max-w-2xl w-full px-2 sm:px-0">
            {[
              {
                icon: UploadSimple,
                text: (<><strong className="text-white font-semibold">Practice interview questions</strong> with a realistic AI hiring manager</>),
                active: true,
              },
              {
                icon: Microphone,
                text: (<><strong className="font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Rehearse pitches and talks</strong> with an expert coaching AI</>),
                active: false,
              },
              {
                icon: ChatCircle,
                text: (<><strong className="font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Build social confidence</strong> in dating and real conversations</>),
                active: false,
              },
            ].map(({ icon: Icon, text, active }, i) => (
              <div key={i} className="flex items-start gap-3 text-left">
                <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    border: `1.5px solid ${active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'}`,
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                  <Icon size={16} weight="regular"
                    style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }} />
                </div>
                <p className="text-sm leading-snug"
                  style={{ color: active ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>

        </section>
      </div>
    </div>
  )
}
