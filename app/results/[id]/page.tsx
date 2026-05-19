'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ScoreRing } from '@/components/results/ScoreRing'
import { ScoreBar } from '@/components/results/ScoreBar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { CheckCircle, Star, ArrowLeft } from '@phosphor-icons/react'
import { modeName, scoreColor } from '@/lib/utils'

interface ScoreData {
  overall: number; clarity: number; confidence: number; structure: number; engagement: number
  strengths: string[]; improvements: string[]; summary: string
}
interface SessionData {
  id: string; scenario_id: string; messages: any[]; overall_score: number | null
  clarity_score: number | null; confidence_score: number | null
  structure_score: number | null; engagement_score: number | null
  strengths: string[] | null; improvements: string[] | null; summary: string | null
  scenarios: { title: string; mode: string } | null
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<SessionData | null>(null)
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sessions').select('*, scenarios(title, mode)').eq('id', id).single()
      const sess = data as SessionData | null
      setSession(sess)

      if (sess?.overall_score != null) {
        setScores({ overall: sess.overall_score, clarity: sess.clarity_score ?? 0, confidence: sess.confidence_score ?? 0, structure: sess.structure_score ?? 0, engagement: sess.engagement_score ?? 0, strengths: sess.strengths ?? [], improvements: sess.improvements ?? [], summary: sess.summary ?? '' })
        setLoading(false)
      } else if (sess?.messages && sess.messages.length >= 2) {
        setScoring(true); setLoading(false)
        try {
          const res = await fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: sess.messages, scenarioType: sess.scenarios?.mode ?? 'general', scenarioTitle: sess.scenarios?.title ?? 'Practice Session' }) })
          const scoreData: ScoreData = await res.json()
          setScores(scoreData)
          await supabase.from('sessions').update({ overall_score: scoreData.overall, clarity_score: scoreData.clarity, confidence_score: scoreData.confidence, structure_score: scoreData.structure, engagement_score: scoreData.engagement, strengths: scoreData.strengths, improvements: scoreData.improvements, summary: scoreData.summary }).eq('id', id)
        } catch {}
        setScoring(false)
      } else { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#080808]">
      <Spinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-[580px] h-[580px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(62,207,142,0.07) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)' }} />
      </div>

      <div className="relative px-4 py-6 md:p-8 max-w-4xl mx-auto">
        <button onClick={() => router.push('/home')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#555] hover:text-[#ededed] transition-colors mb-6">
          <ArrowLeft size={15} weight="bold" /> Back to Dashboard
        </button>

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#3ECF8E] mb-2">Session Complete</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">Your Results</h1>
          {session?.scenarios && (
            <p className="text-sm md:text-base text-[#555] mt-1">{session.scenarios.title} · {modeName(session.scenarios.mode)}</p>
          )}
        </div>

        {(scoring || !scores) ? (
          <Card className="p-10 md:p-14 flex flex-col items-center gap-5">
            <Spinner size={40} />
            <p className="text-lg font-bold text-[#ededed]">Analyzing your performance…</p>
            <p className="text-sm text-[#555] text-center max-w-sm">Reviewing the conversation and preparing detailed feedback.</p>
          </Card>
        ) : (
          // Mobile: single column flex, reordered via `order-*`
          // Desktop: 3-col grid, left col (1) + right col (2-3)
          <div className="flex flex-col md:grid md:grid-cols-3 gap-4">

            {/* Score ring — mobile: 1st, desktop: col-1 row-1 */}
            <div className="order-1 md:order-none md:col-span-1">
              <Card className="p-6 md:p-7 flex flex-col items-center gap-4">
                <ScoreRing score={scores.overall} size={120} strokeWidth={6} />
                <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Overall score</p>
              </Card>
            </div>

            {/* Summary — mobile: 2nd, desktop: col-2-3 row-1 */}
            {scores.summary && (
              <div className="order-2 md:order-none md:col-span-2">
                <Card className="p-5 md:p-6 h-full">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">Summary</p>
                  <p className="text-sm md:text-base text-[#888] leading-relaxed">{scores.summary}</p>
                </Card>
              </div>
            )}

            {/* Score breakdown — mobile: 3rd, desktop: col-2-3 row-2 */}
            <div className="order-3 md:order-none md:col-span-2 md:row-start-2">
              <Card className="overflow-hidden">
                <CardHeader>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Score Breakdown</p>
                </CardHeader>
                <div className="px-5 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">
                  <ScoreBar label="Clarity" score={scores.clarity} delay={0} />
                  <ScoreBar label="Confidence" score={scores.confidence} delay={100} />
                  <ScoreBar label="Structure" score={scores.structure} delay={200} />
                  <ScoreBar label="Engagement" score={scores.engagement} delay={300} />
                </div>
              </Card>
            </div>

            {/* Feedback — mobile: 4th, desktop: col-2-3 row-3 */}
            <div className="order-4 md:order-none md:col-span-2 md:row-start-3">
              <Card className="overflow-hidden">
                <CardHeader>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Feedback</p>
                </CardHeader>
                <div>
                  {scores.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 md:px-6 py-3 md:py-4 border-b border-[rgba(255,255,255,0.06)]">
                      <div className="w-5 h-5 rounded-full bg-[rgba(62,207,142,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={12} weight="duotone" className="text-[#3ECF8E]" />
                      </div>
                      <p className="text-sm text-[#888] leading-relaxed">{s}</p>
                    </div>
                  ))}
                  {scores.improvements?.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 md:px-6 py-3 md:py-4 border-b border-[rgba(255,255,255,0.06)] last:border-0">
                      <div className="w-5 h-5 rounded-full bg-[rgba(245,166,35,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                        <Star size={11} weight="duotone" className="text-[#F5A623]" />
                      </div>
                      <p className="text-sm text-[#888] leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sub-scores — mobile: 5th, desktop: col-1 row-2 */}
            <div className="order-5 md:order-none md:col-span-1 md:row-start-2">
              <Card className="overflow-hidden">
                {[
                  { label: 'Clarity', score: scores.clarity },
                  { label: 'Confidence', score: scores.confidence },
                  { label: 'Structure', score: scores.structure },
                  { label: 'Engagement', score: scores.engagement },
                ].map((item, i, arr) => (
                  <div key={item.label}
                    className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
                    <span className="text-sm font-medium text-[#888]">{item.label}</span>
                    <span className="text-base font-bold font-mono" style={{ color: scoreColor(item.score) }}>{item.score}</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* Actions — mobile: 6th, desktop: col-1 row-3 */}
            <div className="order-6 md:order-none md:col-span-1 md:row-start-3 space-y-2">
              <Button variant="primary" fullWidth size="lg" onClick={handleRetry}>Try Again</Button>
              <Button variant="default" fullWidth size="lg" onClick={() => router.push('/home')}>Dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  async function handleRetry() {
    if (!session?.scenario_id) { router.push('/practice'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newSession } = await supabase.from('sessions').insert({ user_id: user.id, scenario_id: session.scenario_id, started_at: new Date().toISOString() }).select('id').single()
    if (newSession?.id) router.push(`/session/${newSession.id}`)
  }
}
