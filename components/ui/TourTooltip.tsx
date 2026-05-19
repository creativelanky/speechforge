'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, ArrowLeft } from '@phosphor-icons/react'

interface Step {
  targetId: string
  title: string
  body: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const STEPS: Step[] = [
  {
    targetId: 'tour-welcome',
    title: '👋 Welcome to SpeechForge!',
    body: 'Your AI-powered speech coach. Let\'s show you around real quick.',
    position: 'bottom',
  },
  {
    targetId: 'tour-practice',
    title: '🎯 Start Practicing',
    body: 'Pick a mode — job interviews, public speaking, dating, or everyday conversations.',
    position: 'top',
  },
  {
    targetId: 'tour-sessions',
    title: '📊 Recent Sessions',
    body: 'Every session is saved here with your score and feedback.',
    position: 'top',
  },
  {
    targetId: 'tour-nav',
    title: '🗂 Navigate',
    body: 'Use the nav to jump between Practice, History, and your Profile.',
    position: 'right',
  },
]

const STORAGE_KEY = 'sf_tour_done'

export function TourTooltip() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    // Delay slightly so the DOM is ready
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return
    const current = STEPS[step]
    const isMobile = window.innerWidth < 768
    const targetId = current.targetId === 'tour-nav'
      ? (isMobile ? 'tour-nav-mobile' : 'tour-nav')
      : current.targetId
    // Override position for mobile nav (it's at the bottom)
    if (current.targetId === 'tour-nav' && isMobile) {
      current.position = 'top'
    }
    const el = document.getElementById(targetId)
    if (!el) return

    const r = el.getBoundingClientRect()
    // Element might be hidden (display:none) — skip if zero rect
    if (r.width === 0 && r.height === 0) return
    setRect(r)

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [visible, step])

  useEffect(() => {
    if (!rect || !tooltipRef.current) return
    const tt = tooltipRef.current
    const tw = tt.offsetWidth
    const th = tt.offsetHeight
    const current = STEPS[step]
    const GAP = 14
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = 0
    let left = 0

    switch (current.position) {
      case 'bottom':
        top = rect.bottom + GAP
        left = rect.left + rect.width / 2 - tw / 2
        break
      case 'top':
        top = rect.top - th - GAP
        left = rect.left + rect.width / 2 - tw / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - th / 2
        left = rect.left - tw - GAP
        break
      case 'right':
        top = rect.top + rect.height / 2 - th / 2
        left = rect.right + GAP
        break
      default:
        top = rect.bottom + GAP
        left = rect.left + rect.width / 2 - tw / 2
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, vw - tw - 12))
    top = Math.max(12, Math.min(top, vh - th - 12))

    setPos({ top, left })
  }, [rect, step])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const prev = () => { if (step > 0) setStep(s => s - 1) }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[998] pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.45)' }} />

      {/* Spotlight — highlight target */}
      {rect && (
        <div className="fixed z-[999] pointer-events-none rounded-xl"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 4px rgba(62,207,142,0.6), 0 0 0 9999px rgba(0,0,0,0.45)',
            borderRadius: 12,
          }} />
      )}

      {/* Tooltip card */}
      <div ref={tooltipRef}
        className="fixed z-[1000] w-[280px] rounded-2xl p-5"
        style={{
          top: pos.top,
          left: pos.left,
          background: 'rgba(18,18,18,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                background: i === step ? '#3ECF8E' : 'rgba(255,255,255,0.15)',
              }} />
          ))}
        </div>

        <p className="text-[15px] font-bold text-[#ededed] mb-1">{current.title}</p>
        <p className="text-[13px] text-[#888] leading-relaxed mb-4">{current.body}</p>

        <div className="flex items-center justify-between">
          <button onClick={dismiss}
            className="text-xs text-[#555] hover:text-[#888] transition-colors">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={prev}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <ArrowLeft size={14} weight="bold" className="text-[#ededed]" />
              </button>
            )}
            <button onClick={next}
              className="flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all"
              style={{ background: '#3ECF8E', color: '#000' }}>
              {step === STEPS.length - 1 ? "Let's go" : 'Next'}
              {step < STEPS.length - 1 && <ArrowRight size={12} weight="bold" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
