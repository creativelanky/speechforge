'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Check } from '@phosphor-icons/react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const purposes = [
  { id: 'interviews', emoji: '🎯', title: 'Ace Job Interviews', subtitle: 'Practice with AI hiring managers' },
  { id: 'speaking', emoji: '🎤', title: 'Public Speaking', subtitle: 'Pitches, talks, presentations' },
  { id: 'dating', emoji: '💘', title: 'Dating & Romance', subtitle: 'Build confidence in social settings' },
  { id: 'conversations', emoji: '💬', title: 'Everyday Conversations', subtitle: 'Networking, negotiation, social' },
]

function OptionCard({ selected, onClick, emoji, title, subtitle }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-full border text-left transition-colors',
        selected
          ? 'bg-[rgba(62,207,142,0.08)] border-[rgba(62,207,142,0.4)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]'
      )}
    >
      <span className="text-xl">{emoji}</span>
      <div className="flex-1">
        <p className={cn('text-sm font-medium', selected ? 'text-[#ededed]' : 'text-[#a0a0a0]')}>{title}</p>
        <p className="text-xs text-[#6b6b6b] mt-0.5">{subtitle}</p>
      </div>
      <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center shrink-0', selected ? 'bg-[#3ECF8E] border-[#3ECF8E]' : 'border-[rgba(255,255,255,0.2)]')}>
        {selected && <Check size={11} weight="bold" className="text-black" />}
      </div>
    </button>
  )
}

function GenderCard({ selected, onClick, emoji, label }: { selected: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border transition-colors',
        selected
          ? 'bg-[rgba(62,207,142,0.08)] border-[rgba(62,207,142,0.4)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]'
      )}
    >
      <span className="text-3xl">{emoji}</span>
      <span className={cn('text-sm font-medium', selected ? 'text-[#ededed]' : 'text-[#a0a0a0]')}>{label}</span>
    </button>
  )
}

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState('')
  const [purpose, setPurpose] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    await supabase.from('profiles').upsert({
      id: user.id,
      gender,
      goal: purpose,
      role: role.trim() || null,
      onboarding_complete: true,
    })
    router.push('/home')
  }

  const Shell = ({ children, s }: { children: React.ReactNode; s: number }) => (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.88)' }} />
      <div className="relative z-10 w-full max-w-[440px] animate-fade-up rounded-3xl p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
        <div className="flex items-center gap-2.5 mb-8">
          <Image src="/Logo.png" alt="SpeechForge" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-sm text-[#ededed]">SpeechForge</span>
        </div>
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={cn('h-0.5 flex-1 rounded-full transition-colors duration-300', i <= s ? 'bg-[#3ECF8E]' : 'bg-[rgba(255,255,255,0.1)]')} />
          ))}
        </div>
        {children}
      </div>
    </div>
  )

  // Step 0 — Gender
  if (step === 0) return (
    <Shell s={0}>
      <p className="text-xs font-medium text-[#3ECF8E] uppercase tracking-widest mb-2">Step 1 of {TOTAL_STEPS}</p>
      <h2 className="text-2xl font-semibold text-[#ededed] mb-1">How do you identify?</h2>
      <p className="text-sm text-[#6b6b6b] mb-6">Helps us personalise your AI coach.</p>
      <div className="flex gap-3 mb-8">
        <GenderCard selected={gender === 'male'} onClick={() => setGender('male')} emoji="🙋‍♂️" label="Male" />
        <GenderCard selected={gender === 'female'} onClick={() => setGender('female')} emoji="🙋‍♀️" label="Female" />
        <GenderCard selected={gender === 'other'} onClick={() => setGender('other')} emoji="✨" label="Other" />
      </div>
      <Button variant="primary" fullWidth disabled={!gender} onClick={() => setStep(1)}>Continue</Button>
    </Shell>
  )

  // Step 1 — Purpose
  if (step === 1) return (
    <Shell s={1}>
      <p className="text-xs font-medium text-[#3ECF8E] uppercase tracking-widest mb-2">Step 2 of {TOTAL_STEPS}</p>
      <h2 className="text-2xl font-semibold text-[#ededed] mb-1">What brings you here?</h2>
      <p className="text-sm text-[#6b6b6b] mb-6">Pick your main focus. You can change this later.</p>
      <div className="space-y-2 mb-8">
        {purposes.map(p => <OptionCard key={p.id} selected={purpose === p.id} onClick={() => setPurpose(p.id)} {...p} />)}
      </div>
      <div className="flex gap-2">
        <Button variant="default" onClick={() => setStep(0)} className="flex-1">Back</Button>
        <Button variant="primary" disabled={!purpose} onClick={() => setStep(2)} className="flex-1">Continue</Button>
      </div>
    </Shell>
  )

  // Step 2 — Role
  return (
    <Shell s={2}>
      <p className="text-xs font-medium text-[#3ECF8E] uppercase tracking-widest mb-2">Step 3 of {TOTAL_STEPS}</p>
      <h2 className="text-2xl font-semibold text-[#ededed] mb-1">What's your role?</h2>
      <p className="text-sm text-[#6b6b6b] mb-6">Optional — helps tailor scenarios to your world.</p>
      <input
        type="text"
        placeholder="e.g. Software Engineer, Student, Sales rep…"
        value={role}
        onChange={e => setRole(e.target.value)}
        autoFocus
        className="w-full h-12 px-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl text-[15px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ECF8E]/50 mb-8"
      />
      <div className="flex gap-2">
        <Button variant="default" onClick={() => setStep(1)} className="flex-1">Back</Button>
        <Button variant="primary" disabled={saving} onClick={handleFinish} className="flex-1">
          {saving ? <Spinner size={14} color="black" /> : "Let's go →"}
        </Button>
      </div>
    </Shell>
  )
}
