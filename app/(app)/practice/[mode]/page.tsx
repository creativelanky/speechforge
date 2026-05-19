'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowLeft, Shuffle, Clock, Microphone, ChatText, X, ArrowUpRight } from '@phosphor-icons/react'
import { cn, difficultyColor } from '@/lib/utils'
import Link from 'next/link'

interface Scenario { id: string; title: string; context: string; difficulty: string; duration_minutes: number }

const modeConfig: Record<string, { label: string; color: string }> = {
  interview:    { label: 'Interview Prep',   color: '#3B82F6' },
  speaking:     { label: 'Public Speaking',  color: '#3ECF8E' },
  conversation: { label: 'Conversations',    color: '#F5A623' },
}

const diffStyles: Record<string, { bg: string; text: string; label: string }> = {
  easy:   { bg: 'rgba(62,207,142,0.1)',  text: '#3ECF8E', label: 'Easy' },
  medium: { bg: 'rgba(245,166,35,0.1)',  text: '#F5A623', label: 'Medium' },
  hard:   { bg: 'rgba(229,72,77,0.1)',   text: '#E5484D', label: 'Hard' },
}

export default function ScenarioPage() {
  const { mode } = useParams<{ mode: string }>()
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Scenario | null>(null)
  const supabase = createClient()
  const config = modeConfig[mode] ?? { label: mode, color: '#3ECF8E' }

  useEffect(() => {
    supabase.from('scenarios').select('id, title, context, difficulty, duration_minutes').eq('mode', mode).order('difficulty').then(({ data }) => {
      setScenarios(data ?? [])
      setLoading(false)
    })
  }, [mode])

  const startSession = async (scenarioId: string, sessionMode: 'text' | 'audio') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: session } = await supabase.from('sessions').insert({ user_id: user.id, scenario_id: scenarioId, started_at: new Date().toISOString() }).select('id').single()
    if (session?.id) router.push(`/session/${session.id}?mode=${sessionMode}`)
  }

  const startRandom = () => {
    if (scenarios.length === 0) return
    setSelected(scenarios[Math.floor(Math.random() * scenarios.length)])
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/practice"
          className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#555] hover:text-[#ededed] transition-colors shrink-0">
          <ArrowLeft size={16} weight="bold" />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: config.color }}>{config.label}</p>
          <h1 className="text-2xl font-bold text-[#ededed] leading-tight">Choose a scenario</h1>
        </div>
        <button onClick={startRandom}
          className="ml-auto flex items-center gap-2 h-9 px-4 rounded-full backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm font-semibold text-[#555] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.15)] transition-all">
          <Shuffle size={14} weight="bold" />
          Random
        </button>
      </div>

      {/* Scenario grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {scenarios.map(s => {
            const diff = diffStyles[s.difficulty] ?? diffStyles.medium
            const isSelected = selected?.id === s.id
            return (
              <button key={s.id} onClick={() => setSelected(s)}
                className="group relative rounded-3xl flex flex-col p-6 overflow-hidden text-left cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  background: isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                }}>

                {/* Difficulty badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: diff.bg, color: diff.text }}>
                    {diff.label}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#444]">
                    <Clock size={12} weight="duotone" />
                    <span>~{s.duration_minutes} min</span>
                  </div>
                </div>

                {/* Title */}
                <p className="text-lg font-bold leading-snug mb-3 transition-colors duration-200"
                  style={{ color: isSelected ? '#ededed' : '#aaa' }}>
                  {s.title}
                </p>

                {/* Context */}
                <p className="text-sm text-[#555] leading-relaxed flex-1">{s.context}</p>

                {/* Select indicator */}
                <div className="mt-6 flex items-center justify-end">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 bg-[rgba(255,255,255,0.06)] text-[#555]">
                    <ArrowUpRight size={13} weight="bold" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Mode picker modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-end justify-center z-50 p-6 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="rounded-3xl border border-[rgba(255,255,255,0.1)] backdrop-blur-2xl bg-[rgba(14,14,14,0.92)] w-full max-w-lg p-7 animate-fade-up">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.12)] mx-auto mb-6" />

            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: config.color }}>
                  {config.label}
                </p>
                <h2 className="text-xl font-bold text-[#ededed] leading-tight">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#555] hover:text-[#ededed] transition-colors">
                <X size={15} weight="bold" />
              </button>
            </div>

            <p className="text-sm text-[#555] leading-relaxed mb-8">{selected.context}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => startSession(selected.id, 'text')}
                className="flex flex-col items-center gap-3 p-6 rounded-full bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] hover:bg-[rgba(59,130,246,0.12)] hover:border-[rgba(59,130,246,0.3)] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(59,130,246,0.12)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChatText size={24} weight="duotone" className="text-[#3B82F6]" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-[#ededed] mb-0.5">Text</p>
                  <p className="text-xs text-[#555]">Type your responses</p>
                </div>
              </button>

              <button onClick={() => startSession(selected.id, 'audio')}
                className="flex flex-col items-center gap-3 p-6 rounded-full bg-[rgba(62,207,142,0.06)] border border-[rgba(62,207,142,0.15)] hover:bg-[rgba(62,207,142,0.12)] hover:border-[rgba(62,207,142,0.3)] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(62,207,142,0.12)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Microphone size={24} weight="duotone" className="text-[#3ECF8E]" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-[#3ECF8E] mb-0.5">Audio</p>
                  <p className="text-xs text-[#555]">Speak naturally</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-[#444] text-center">Audio mode uses your microphone for a fully spoken session</p>
          </div>
        </div>
      )}
    </div>
  )
}
