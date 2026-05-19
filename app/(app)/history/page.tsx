'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatDuration, scoreColor, modeName, modeColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface Session {
  id: string; started_at: string; duration_seconds: number | null
  overall_score: number | null; scenarios: { title: string; mode: string } | null
}

const filters = ['All', 'Interviews', 'Speaking', 'Conversations']
const filterToMode: Record<string, string | null> = { All: null, Interviews: 'interview', Speaking: 'speaking', Conversations: 'conversation' }

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setLoading(true)
      let query = supabase.from('sessions').select('id, started_at, duration_seconds, overall_score, scenarios(title, mode)').eq('user_id', user.id).not('ended_at', 'is', null).order('started_at', { ascending: false })
      const mode = filterToMode[filter]
      if (mode) query = query.eq('scenarios.mode', mode) as any
      const { data } = await query
      setSessions((data ?? []) as unknown as Session[])
      setLoading(false)
    }
    load()
  }, [filter])

  const grouped: Record<string, Session[]> = {}
  for (const s of sessions) {
    const key = formatDate(s.started_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }
  const dateKeys = Object.keys(grouped)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#ededed] mb-1">History</h1>
        <p className="text-base text-[#555]">Review your past sessions and track progress.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'h-8 px-4 rounded-xl text-sm font-semibold transition-all',
              filter === f
                ? 'bg-[#3ECF8E] text-black'
                : 'backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#555] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.15)]'
            )}
          >{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : dateKeys.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-base font-bold text-[#ededed] mb-1">No sessions found</p>
          <p className="text-sm text-[#555]">{filter === 'All' ? 'Start practicing to build your history.' : `No ${filter.toLowerCase()} sessions yet.`}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(date => (
            <div key={date}>
              <p className="text-xs font-bold uppercase tracking-widest text-[#444] mb-2 px-1">{date}</p>
              <Card className="overflow-hidden">
                {grouped[date].map((s, i) => {
                  const mode = s.scenarios?.mode ?? ''
                  return (
                    <Link key={s.id} href={`/results/${s.id}`}
                      className={cn(
                        'flex items-center gap-4 px-5 py-4 hover:bg-[rgba(255,255,255,0.04)] transition-colors',
                        i < grouped[date].length - 1 && 'border-b border-[rgba(255,255,255,0.06)]'
                      )}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: modeColor(mode) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#ededed] truncate">{s.scenarios?.title ?? 'Session'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold" style={{ color: modeColor(mode) }}>{modeName(mode)}</span>
                          {s.duration_seconds && <span className="text-xs text-[#444]">{formatDuration(s.duration_seconds)}</span>}
                        </div>
                      </div>
                      {s.overall_score != null ? (
                        <span className="text-base font-bold font-mono shrink-0" style={{ color: scoreColor(s.overall_score) }}>{s.overall_score}</span>
                      ) : <span className="text-sm text-[#444]">—</span>}
                    </Link>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
