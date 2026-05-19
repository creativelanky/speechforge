'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowRight, Microphone, Users, ChatCircle, TrendUp } from '@phosphor-icons/react'
import { formatDuration, formatDate, scoreColor, modeName, modeColor } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Profile { name: string }
interface Session {
  id: string; started_at: string; duration_seconds: number | null
  overall_score: number | null; scenarios: { title: string; mode: string } | null
}

const modes = [
  { id: 'interview', label: 'Interview Prep', subtitle: 'Tech, behavioral and case rounds', icon: Users, color: '#ffffff' },
  { id: 'speaking', label: 'Public Speaking', subtitle: 'Pitches, talks and presentations', icon: Microphone, color: '#ffffff' },
  { id: 'conversation', label: 'Conversations', subtitle: 'Networking, negotiation and more', icon: ChatCircle, color: '#ffffff' },
]

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({ total: 0, minutes: 0, avgScore: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('sessions').select('id, started_at, duration_seconds, overall_score, scenarios(title, mode)').eq('user_id', user.id).not('ended_at', 'is', null).order('started_at', { ascending: false }).limit(5),
      ])
      setProfile(prof)
      const allSess = (sess ?? []) as unknown as Session[]
      setSessions(allSess)
      const minutes = Math.round(allSess.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60)
      const scored = allSess.filter(s => s.overall_score != null)
      const avgScore = scored.length ? Math.round(scored.reduce((a, s) => a + (s.overall_score ?? 0), 0) / scored.length) : 0
      setStats({ total: allSess.length, minutes, avgScore })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-7">
        <p className="text-sm text-[#555] mb-0.5">Good day,</p>
        <h1 className="text-3xl font-bold text-[#ededed]">{loading ? '…' : profile?.name ?? 'Friend'}</h1>
      </div>

      {/* Stats bento row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {[
          { label: 'Total Sessions', value: stats.total, color: '#ffffff' },
          { label: 'Minutes Practiced', value: stats.minutes, color: '#ffffff' },
          { label: 'Average Score', value: stats.avgScore || '—', color: '#ffffff' },
        ].map(s => (
          <Card key={s.label} className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-4">{s.label}</p>
            <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Main bento row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        {/* Practice modes */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Start Practicing</p>
          </div>
          {modes.map(({ id, label, subtitle, icon: Icon, color }) => (
            <Link key={id} href={`/practice?mode=${id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors group border-b border-[rgba(255,255,255,0.05)] last:border-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <Icon size={18} weight="duotone" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-[#ededed] leading-tight">{label}</p>
                <p className="text-sm text-[#555] mt-0.5">{subtitle}</p>
              </div>
              <ArrowRight size={16} weight="bold" className="text-[#444] group-hover:text-[#3ECF8E] transition-colors shrink-0" />
            </Link>
          ))}
        </Card>

        {/* Recent sessions */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Recent Sessions</p>
          </div>
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base font-semibold text-[#ededed] mb-1">No sessions yet</p>
              <p className="text-sm text-[#555] mb-5">Start a practice session to track your progress.</p>
              <Link href="/practice">
                <Button variant="primary" size="sm">Start practicing</Button>
              </Link>
            </div>
          ) : (
            sessions.map(s => (
              <Link key={s.id} href={`/results/${s.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors border-b border-[rgba(255,255,255,0.05)] last:border-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: modeColor(s.scenarios?.mode ?? '') }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#ededed] truncate">{s.scenarios?.title ?? 'Session'}</p>
                  <p className="text-xs text-[#555] mt-0.5">
                    {formatDate(s.started_at)}{s.duration_seconds ? ` · ${formatDuration(s.duration_seconds)}` : ''}
                  </p>
                </div>
                {s.overall_score != null ? (
                  <span className="text-base font-bold font-mono shrink-0" style={{ color: scoreColor(s.overall_score) }}>
                    {s.overall_score}
                  </span>
                ) : <span className="text-sm text-[#444]">—</span>}
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
