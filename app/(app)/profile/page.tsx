'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Toggle } from '@/components/ui/Toggle'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Profile { id: string; name: string; goal: string; level: string; voice_output: boolean }
interface Stats { total: number; hours: number; avgScore: number }

const goalLabels: Record<string, string> = { interviews: 'Ace Interviews', speaking: 'Public Speaking', conversations: 'Better Conversations', all: 'All of the Above' }
const levelLabels: Record<string, string> = { beginner: 'Just Starting', intermediate: 'Getting There', advanced: 'Refining My Edge' }

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [stats, setStats] = useState<Stats>({ total: 0, hours: 0, avgScore: 0 })
  const [voiceOutput, setVoiceOutput] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions').select('duration_seconds, overall_score').eq('user_id', user.id).not('ended_at', 'is', null),
      ])
      if (prof) { setProfile({ ...prof, id: user.id }); setVoiceOutput(prof.voice_output ?? true) }
      const allSess = sess ?? []
      const hours = parseFloat((allSess.reduce((a: number, s: any) => a + (s.duration_seconds ?? 0), 0) / 3600).toFixed(1))
      const scored = allSess.filter((s: any) => s.overall_score != null)
      const avgScore = scored.length ? Math.round(scored.reduce((a: number, s: any) => a + s.overall_score, 0) / scored.length) : 0
      setStats({ total: allSess.length, hours, avgScore })
    }
    load()
  }, [])

  const toggleVoice = async (val: boolean) => {
    setVoiceOutput(val)
    if (profile) await supabase.from('profiles').update({ voice_output: val }).eq('id', profile.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div className="px-4 py-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#ededed] mb-1">Profile</h1>
        <p className="text-sm text-[#6b6b6b]">Manage your account and preferences.</p>
      </div>

      <div className="space-y-4">
        {/* User info */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(62,207,142,0.15)] border border-[rgba(62,207,142,0.3)] flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-[#3ECF8E]">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#ededed]">{profile?.name ?? '—'}</p>
              <p className="text-xs text-[#6b6b6b] mt-0.5">{email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader><p className="text-xs font-medium uppercase tracking-widest text-[#6b6b6b]">Stats</p></CardHeader>
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {[
              { label: 'Total Sessions', value: stats.total },
              { label: 'Hours Practiced', value: stats.hours },
              { label: 'Average Score', value: stats.avgScore || '—' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[#a0a0a0]">{s.label}</span>
                <span className="text-sm font-semibold font-mono text-[#ededed]">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader><p className="text-xs font-medium uppercase tracking-widest text-[#6b6b6b]">Preferences</p></CardHeader>
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-[#a0a0a0]">Goal</span>
              <span className="text-sm text-[#ededed]">{goalLabels[profile?.goal ?? ''] ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-[#a0a0a0]">Level</span>
              <span className="text-sm text-[#ededed]">{levelLabels[profile?.level ?? ''] ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-[#a0a0a0]">Voice Output</span>
              <Toggle checked={voiceOutput} onChange={toggleVoice} />
            </div>
          </div>
        </Card>

        {/* Sign out */}
        <Button variant="destructive" onClick={handleSignOut}>Sign out</Button>

        <p className="text-xs text-[#6b6b6b]">SpeechForge v1.0.0</p>
      </div>
    </div>
  )
}
