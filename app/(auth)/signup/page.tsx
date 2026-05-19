'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import Image from 'next/image'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Please meet all password requirements'); return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/onboarding')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.88)' }} />
      <div className="relative z-10 w-full max-w-[420px] animate-fade-up rounded-3xl p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
        <div className="flex items-center gap-2.5 mb-8">
          <Image src="/Logo.svg" alt="SpeechForge" width={36} height={36} />
        </div>

        <h1 className="text-xl font-semibold text-[#ededed] mb-1">Create an account</h1>
        <p className="text-sm text-[#6b6b6b] mb-6">Start your speech coaching journey</p>

        <button
          onClick={handleGoogle}
          className="w-full h-12 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-full flex items-center justify-center gap-2 text-[15px] font-medium text-[#ededed] hover:bg-[#242424] hover:border-[rgba(255,255,255,0.2)] transition-colors mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          <span className="text-xs text-[#6b6b6b]">or</span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <Input type="email" placeholder="you@example.com" label="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <Input type="password" placeholder="Min. 8 characters" label="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />

          {password.length > 0 && (
            <div className="space-y-1.5 px-1">
              {[
                { label: 'At least 8 characters', met: password.length >= 8 },
                { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
                { label: 'One number', met: /[0-9]/.test(password) },
                { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
              ].map(({ label, met }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${met ? 'bg-[#3ECF8E]' : 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)]'}`}>
                    {met && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4L3 5.5L6.5 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                  </div>
                  <span className={`text-xs transition-colors ${met ? 'text-[#3ECF8E]' : 'text-[#555]'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.2)] rounded-md">
              <p className="text-xs text-[#E5484D]">{error}</p>
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={loading || !email || !password} className="mt-1">
            {loading ? <Spinner size={16} color="black" /> : 'Create account'}
          </Button>
        </form>

        <p className="text-sm text-[#6b6b6b] mt-5 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[#3ECF8E] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
