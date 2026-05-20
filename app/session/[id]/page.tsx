'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useSpeech } from '@/hooks/useSpeech'
import { getAudioProgress, unlockAudio, setTTSDebug } from '@/lib/speech'
import { Waveform } from '@/components/session/Waveform'
import { Microphone, MicrophoneSlash, PaperPlaneRight, SpeakerHigh, SpeakerSlash, X, Lightning } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatDuration } from '@/lib/utils'

interface Message { role: 'user' | 'assistant'; content: string }
interface Scenario { id: string; title: string; mode: string; system_prompt: string }

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionMode = searchParams.get('mode') === 'audio' ? 'audio' : 'text'
  const supabase = createClient()

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoListenPending, setAutoListenPending] = useState(false)
  const [awaitingTap, setAwaitingTap] = useState(sessionMode === 'audio')
  const [ttsLog, setTtsLog] = useState<string[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>(undefined)
  const startTimeRef = useRef(Date.now())
  const abortRef = useRef<AbortController>(undefined)
  const sendMessageRef = useRef<(text: string) => void>(() => {})
  const ttsGenRef = useRef(0)

  const { isListening, transcript, supported, startListening, stopListening, speakText, stopSpeakingFn } = useSpeech()

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.from('sessions').select('scenario_id, scenarios(id, title, mode, system_prompt)').eq('id', id).single()
      const sc = (session as any)?.scenarios as Scenario | null
      if (!sc) { router.push('/practice'); return }
      setScenario(sc)
      setLoading(false)
      if (sessionMode !== 'audio') setTimeout(() => sendToAI([], sc), 300)
    }
    load()
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(timerRef.current); abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    setTTSDebug(msg => setTtsLog(l => [...l.slice(-6), msg]))
    return () => setTTSDebug(null)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const sendToAI = async (msgs: Message[], sc: Scenario) => {
    setIsTyping(true)
    setStreaming(true)
    setIsSpeaking(false)
    abortRef.current = new AbortController()
    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    // Sentence-by-sentence TTS: start speaking first sentence as soon as it
    // arrives from the stream instead of waiting for the full response.
    const gen = ++ttsGenRef.current
    const queue: string[] = []
    let busy = false
    let offset = 0  // chars of fullText already fed into queue
    let streamDone = false

    const tryDrain = () => {
      if (busy || queue.length === 0 || gen !== ttsGenRef.current) return
      const sentence = queue.shift()!
      busy = true
      setIsSpeaking(true)
      speakText(sentence, () => {
        if (gen !== ttsGenRef.current) return
        busy = false
        if (queue.length > 0) { tryDrain(); return }
        if (streamDone) { setIsSpeaking(false); setAutoListenPending(true) }
      })
    }

    const feedText = (text: string, final: boolean) => {
      if (!voiceEnabled || sessionMode !== 'audio') return
      const chunk = text.slice(offset)
      const re = /[^.!?]+[.!?]+\s*/g
      let m: RegExpExecArray | null
      let consumed = 0
      while ((m = re.exec(chunk)) !== null) {
        const s = m[0].trim()
        if (s.length > 5) queue.push(s)
        consumed = m.index + m[0].length
      }
      offset += consumed
      if (final) {
        const leftover = text.slice(offset).trim()
        if (leftover.length > 0) queue.push(leftover)
      }
      tryDrain()
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, systemPrompt: sc.system_prompt }),
        signal: abortRef.current.signal,
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setIsTyping(false)

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const { text } = JSON.parse(data)
                if (text) {
                  fullText += text
                  setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u })
                  feedText(fullText, false)
                }
              } catch {}
            }
          }
        }
      }
      setStreaming(false)
      streamDone = true

      if (voiceEnabled && fullText) {
        if (sessionMode === 'audio') {
          feedText(fullText, true)
          if (!busy && queue.length === 0) setAutoListenPending(true)
        } else {
          speakText(fullText)
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') { setIsTyping(false); setStreaming(false); setIsSpeaking(false) }
    }
  }

  // Auto-listen trigger for audio mode
  useEffect(() => {
    if (sessionMode !== 'audio') return
    if (!autoListenPending) return
    if (isSpeaking) return
    if (streaming) return
    if (isListening) return
    setAutoListenPending(false)
    startListening(text => { if (text.trim()) sendMessageRef.current(text) })
  }, [autoListenPending, isSpeaking, streaming, isListening, sessionMode])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !scenario || streaming) return
    unlockAudio()
    ttsGenRef.current++
    setInput('')
    stopSpeakingFn()
    setIsSpeaking(false)
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    await sendToAI(newMessages, scenario)
  }, [messages, scenario, streaming])

  // Keep ref in sync so callbacks that close over it always get the latest version
  sendMessageRef.current = sendMessage

  const handleEnd = async () => {
    if (ending) return
    setEnding(true)
    ttsGenRef.current++
    abortRef.current?.abort()
    clearInterval(timerRef.current)
    stopSpeakingFn()
    stopListening()
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    await supabase.from('sessions').update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds, messages }).eq('id', id)
    router.push(`/results/${id}`)
  }

  const agentName = scenario?.system_prompt.match(/You are ([^,\.]+)/)?.[1] ?? 'AI Coach'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]"><Spinner /></div>

  const speakingText = isSpeaking
    ? [...messages].reverse().find(m => m.role === 'assistant')?.content ?? ''
    : ''

  if (sessionMode === 'audio') {
    return <AudioSession
      agentName={agentName}
      scenario={scenario}
      messages={messages}
      isSpeaking={isSpeaking}
      isListening={isListening}
      isTyping={isTyping}
      streaming={streaming}
      transcript={transcript}
      speakingText={speakingText}
      elapsed={elapsed}
      ending={ending}
      supported={supported}
      voiceEnabled={voiceEnabled}
      awaitingTap={awaitingTap}
      ttsLog={ttsLog}
      scrollRef={scrollRef}
      onTap={() => {
        unlockAudio()
        setAwaitingTap(false)
        if (scenario) sendToAI([], scenario)
      }}
      onToggleVoice={() => { setVoiceEnabled(v => !v); if (voiceEnabled) { stopSpeakingFn(); setIsSpeaking(false) } }}
      onMic={() => isListening ? stopListening() : startListening(text => { if (text.trim()) sendMessageRef.current(text) })}
      onEnd={handleEnd}
    />
  }

  return (
    <div className="flex h-screen bg-[#080808] relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(62,207,142,0.06) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 65%)' }} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 relative">
        <div className="flex items-center justify-between px-6 h-14 border-b border-[rgba(255,255,255,0.07)] backdrop-blur-xl bg-[rgba(8,8,8,0.6)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#3ECF8E] rounded flex items-center justify-center">
              <Lightning size={12} weight="fill" className="text-black" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#ededed] leading-tight">{scenario?.title}</p>
              <p className="text-xs text-[#6b6b6b] capitalize leading-tight">{scenario?.mode}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-[#E5484D] font-medium">{formatDuration(elapsed)}</span>
            <button onClick={() => { unlockAudio(); setVoiceEnabled(v => !v); if (voiceEnabled) stopSpeakingFn() }} className="text-[#6b6b6b] hover:text-[#ededed] transition-colors">
              {voiceEnabled ? <SpeakerHigh size={17} weight="duotone" /> : <SpeakerSlash size={17} weight="duotone" />}
            </button>
            <button
              onClick={() => { if (messages.length <= 1) router.back(); else handleEnd() }}
              disabled={ending}
              className="flex items-center gap-1.5 h-7 px-3 bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.2)] rounded-full text-xs font-medium text-[#E5484D] hover:bg-[rgba(229,72,77,0.2)] transition-colors disabled:opacity-50"
            >
              {ending ? <Spinner size={12} color="#E5484D" /> : <><X size={13} weight="bold" /> End session</>}
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="flex flex-col gap-1 max-w-[72%]">
                  <p className="text-xs text-[#6b6b6b] px-1">{agentName}</p>
                  <div className="backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl rounded-tl-sm px-4 py-3 text-sm text-[#ededed] leading-relaxed">
                    {m.content}
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1 h-4 bg-[#3ECF8E] ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              )}
              {m.role === 'user' && (
                <div className="max-w-[72%] bg-[#3ECF8E] rounded-xl rounded-tr-sm px-4 py-3 text-sm text-black leading-relaxed font-medium">
                  {m.content}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex flex-col gap-1 max-w-[72%]">
              <p className="text-xs text-[#6b6b6b] px-1">{agentName}</p>
              <div className="backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#6b6b6b]"
                    style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div className="h-2" />
        </div>

        <div className="border-t border-[rgba(255,255,255,0.08)] px-6 py-4 shrink-0">
          {(isListening || transcript) && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 backdrop-blur-xl bg-[rgba(255,255,255,0.04)] rounded-xl border border-[rgba(255,255,255,0.08)]">
              <Waveform active={isListening} color="#3ECF8E" />
              <span className="text-xs text-[#6b6b6b] flex-1 truncate">
                {transcript || 'Listening — speak naturally…'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {supported !== false && (
              <button
                onClick={() => isListening ? stopListening() : startListening(text => { if (text.trim()) sendMessageRef.current(text) })}
                disabled={streaming}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40',
                  isListening ? 'bg-[#E5484D] text-white' : 'backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[#6b6b6b] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.2)]'
                )}
              >
                {isListening ? <MicrophoneSlash size={16} weight="duotone" /> : <Microphone size={16} weight="duotone" />}
              </button>
            )}
            <div className="flex-1 flex items-center backdrop-blur-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl h-9 px-3 gap-2 focus-within:border-[rgba(255,255,255,0.25)]">
              <input
                type="text"
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                disabled={streaming}
                className="flex-1 bg-transparent text-sm text-[#ededed] placeholder:text-[#6b6b6b] outline-none"
              />
              {input.trim() && (
                <button onClick={() => sendMessage(input)} className="w-5 h-5 rounded bg-[#3ECF8E] flex items-center justify-center shrink-0 hover:bg-[#2db77c] transition-colors">
                  <PaperPlaneRight size={11} weight="fill" className="text-black" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AudioSessionProps {
  agentName: string
  scenario: Scenario | null
  messages: Message[]
  isSpeaking: boolean
  isListening: boolean
  isTyping: boolean
  streaming: boolean
  transcript: string
  speakingText: string
  elapsed: number
  ending: boolean
  supported: boolean | null | undefined
  voiceEnabled: boolean
  awaitingTap: boolean
  ttsLog: string[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  onTap: () => void
  onToggleVoice: () => void
  onMic: () => void
  onEnd: () => void
}

function KaraokeText({ text, progress }: { text: string; progress: number }) {
  const words = text.trim().split(/\s+/)
  const currentIndex = Math.floor(progress * words.length)
  return (
    <p className="text-base md:text-xl font-bold leading-snug tracking-tight">
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            marginRight: '0.3em',
            color: i < currentIndex ? 'rgba(255,255,255,0.9)'
              : i === currentIndex ? '#ffffff'
              : 'rgba(255,255,255,0.28)',
            textShadow: i === currentIndex ? '0 0 16px rgba(255,255,255,0.5)' : 'none',
            transition: 'color 0.12s ease, text-shadow 0.12s ease',
            display: 'inline-block',
          }}
        >
          {word}
        </span>
      ))}
    </p>
  )
}

function AudioSession({ agentName, scenario, messages, isSpeaking, isListening, isTyping, streaming, transcript, speakingText, elapsed, ending, supported, voiceEnabled, awaitingTap, ttsLog, scrollRef, onTap, onToggleVoice, onMic, onEnd }: AudioSessionProps) {
  const [karaokeProgress, setKaraokeProgress] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!isSpeaking) { setKaraokeProgress(0); return }
    const tick = () => {
      setKaraokeProgress(getAudioProgress())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isSpeaking])

  const statusText = awaitingTap ? 'Tap to begin'
    : isListening ? 'Listening…'
    : isSpeaking ? 'Speaking…'
    : isTyping || streaming ? 'Thinking…'
    : 'Your turn'

  const mascotColor = isListening ? '#3ECF8E' : isSpeaking ? '#3B82F6' : 'rgba(255,255,255,0.5)'
  const ringActive = isSpeaking || isListening

  const card = 'rounded-3xl border border-[rgba(255,255,255,0.08)] backdrop-blur-xl bg-[rgba(255,255,255,0.04)]'

  const captionBg = isSpeaking
    ? 'linear-gradient(150deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 50%, rgba(0,0,0,0) 100%)'
    : isListening
    ? 'linear-gradient(150deg, rgba(62,207,142,0.08) 0%, rgba(62,207,142,0.02) 50%, rgba(0,0,0,0) 100%)'
    : 'linear-gradient(150deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)'
  const captionBorder = isSpeaking
    ? '1px solid rgba(59,130,246,0.18)'
    : isListening
    ? '1px solid rgba(62,207,142,0.18)'
    : '1px solid rgba(255,255,255,0.07)'

  const AgentFace = ({ size = 64 }: { size?: number }) => (
    <div className="relative flex items-center justify-center">
      {ringActive && (
        <div className="absolute rounded-full animate-ping"
          style={{ width: size * 1.5, height: size * 1.5, backgroundColor: mascotColor, opacity: 0.06 }} />
      )}
      <div className="absolute rounded-full transition-all duration-500"
        style={{ width: size * 1.25, height: size * 1.25,
          border: `1.5px solid ${ringActive ? mascotColor : 'rgba(255,255,255,0.07)'}`,
          opacity: ringActive ? 0.4 : 1 }} />
      <div className="relative rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          width: size, height: size,
          background: isSpeaking
            ? 'radial-gradient(circle at 40% 35%, rgba(59,130,246,0.3), rgba(59,130,246,0.06))'
            : isListening
            ? 'radial-gradient(circle at 40% 35%, rgba(62,207,142,0.3), rgba(62,207,142,0.06))'
            : 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.07), rgba(255,255,255,0.01))',
          border: `1.5px solid ${isSpeaking ? 'rgba(59,130,246,0.3)' : isListening ? 'rgba(62,207,142,0.3)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: ringActive ? `0 0 28px ${mascotColor}25` : 'none',
        }}>
        <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 52 52" fill="none">
          <circle cx="18" cy="22" r={isListening ? 4 : 3} fill={mascotColor} />
          <circle cx="34" cy="22" r={isListening ? 4 : 3} fill={mascotColor} />
          {isListening
            ? <path d="M16 33 Q26 40 36 33" stroke={mascotColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            : isSpeaking
            ? <path d="M16 33 Q21 29 26 33 Q31 37 36 33" stroke={mascotColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            : <path d="M18 33 Q26 38 34 33" stroke={mascotColor} strokeWidth="2" strokeLinecap="round" fill="none" />
          }
        </svg>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-[#080808] flex flex-col md:flex-row md:p-3 md:gap-3 overflow-hidden relative">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(62,207,142,0.07) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)' }} />
      </div>

      {/* Tap-to-begin overlay */}
      {awaitingTap && (
        <div onClick={onTap} className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 cursor-pointer"
          style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="w-24 h-24 rounded-full bg-[rgba(62,207,142,0.08)] border border-[rgba(62,207,142,0.25)] flex items-center justify-center animate-pulse">
            <Microphone size={34} weight="duotone" className="text-[#3ECF8E]" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold text-[#ededed]">Ready to begin</p>
            <p className="text-sm text-[#6b6b6b]">{agentName} will speak first</p>
          </div>
          <p className="text-xs text-[#3b3b3b]">{scenario?.title}</p>
        </div>
      )}

      {/* ── Mobile top header (hidden on md+) ────────────── */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.07)] shrink-0">
        <AgentFace size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#ededed] leading-tight truncate">{agentName}</p>
          <p className="text-xs font-medium transition-colors duration-300 leading-tight"
            style={{ color: isListening ? '#3ECF8E' : isSpeaking ? '#3B82F6' : '#555' }}>
            {statusText}
          </p>
        </div>
        <span className="text-sm font-mono text-[#E5484D] shrink-0">{formatDuration(elapsed)}</span>
        <button onClick={onToggleVoice} className="text-[#555] hover:text-[#aaa] transition-colors shrink-0">
          {voiceEnabled ? <SpeakerHigh size={18} weight="duotone" /> : <SpeakerSlash size={18} weight="duotone" />}
        </button>
        <button onClick={onEnd} disabled={ending}
          className="flex items-center gap-1 h-7 px-3 bg-[rgba(229,72,77,0.1)] border border-[rgba(229,72,77,0.2)] rounded-full text-xs font-medium text-[#E5484D] hover:bg-[rgba(229,72,77,0.2)] disabled:opacity-50 shrink-0">
          {ending ? <Spinner size={11} color="#E5484D" /> : <><X size={11} weight="bold" />End</>}
        </button>
      </div>

      {/* ── Desktop left column (hidden on mobile) ────────── */}
      <div className="hidden md:flex flex-col gap-3 w-60 shrink-0">

        {/* Mascot card */}
        <div className={`${card} p-6 flex flex-col items-center gap-4`}>
          <AgentFace size={64} />
          <div className="text-center">
            <p className="text-base font-bold text-[#ededed] leading-tight">{agentName}</p>
            <p className="text-sm font-medium mt-1 transition-colors duration-300"
              style={{ color: isListening ? '#3ECF8E' : isSpeaking ? '#3B82F6' : '#555' }}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Timer card */}
        <div className={`${card} px-6 py-4 flex flex-col gap-1`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#444]">Duration</p>
          <p className="text-3xl font-mono font-semibold text-[#E5484D] tabular-nums leading-none">{formatDuration(elapsed)}</p>
          <p className="text-xs text-[#444] truncate mt-0.5">{scenario?.title}</p>
        </div>

        {/* Controls card */}
        <div className={`${card} p-4 flex flex-col gap-2`}>
          <button onClick={onToggleVoice}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors text-left">
            {voiceEnabled
              ? <SpeakerHigh size={19} weight="duotone" className="text-[#3ECF8E] shrink-0" />
              : <SpeakerSlash size={19} weight="duotone" className="text-[#555] shrink-0" />}
            <span className="text-sm font-medium text-[#aaa]">{voiceEnabled ? 'Voice on' : 'Voice off'}</span>
          </button>
          <button onClick={onEnd} disabled={ending}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-full bg-[rgba(229,72,77,0.08)] hover:bg-[rgba(229,72,77,0.14)] transition-colors text-left disabled:opacity-50">
            {ending ? <Spinner size={16} color="#E5484D" /> : <X size={19} weight="bold" className="text-[#E5484D] shrink-0" />}
            <span className="text-sm font-medium text-[#E5484D]">End session</span>
          </button>
        </div>

        {/* Mic card */}
        <div className={`${card} flex-1 flex flex-col items-center justify-center gap-3`}>
          {supported === false ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] flex items-center justify-center opacity-30">
                <MicrophoneSlash size={22} weight="duotone" className="text-[#6b6b6b]" />
              </div>
              <p className="text-xs text-[#555] text-center px-4">Mic unavailable</p>
            </>
          ) : (
            <>
              <button onClick={onMic} disabled={streaming || isTyping || isSpeaking}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-20',
                  isListening
                    ? 'bg-[#E5484D] shadow-[0_0_40px_rgba(229,72,77,0.45)]'
                    : 'bg-[#1c1c1c] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[#222]'
                )}>
                {isListening
                  ? <MicrophoneSlash size={26} weight="duotone" className="text-white" />
                  : <Microphone size={26} weight="duotone" className="text-[#555]" />}
              </button>
              <p className="text-xs font-medium text-[#444]">
                {isListening ? 'Tap to stop' : 'Tap to speak'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Main content area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 md:gap-3 min-w-0 p-3 md:p-0 overflow-hidden">

        {/* Live caption card */}
        <div className="rounded-2xl md:rounded-3xl flex-[2] md:flex-[3] flex flex-col relative overflow-hidden"
          style={{
            background: captionBg,
            border: captionBorder,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            transition: 'background 0.5s ease, border-color 0.5s ease',
          }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: isSpeaking
                ? 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)'
                : isListening
                ? 'radial-gradient(circle, rgba(62,207,142,0.1) 0%, transparent 70%)'
                : 'none',
            }} />

          <div className="p-5 md:p-8 flex flex-col h-full relative">
            <p className="text-xs font-bold uppercase tracking-widest mb-3 md:mb-5 transition-colors duration-300"
              style={{ color: isSpeaking ? 'rgba(59,130,246,0.5)' : isListening ? 'rgba(62,207,142,0.5)' : 'rgba(255,255,255,0.15)' }}>
              {isSpeaking ? agentName : isListening ? 'You' : 'Live caption'}
            </p>

            <div className="flex-1 flex items-center overflow-hidden">
              {isSpeaking && speakingText ? (
                <KaraokeText text={speakingText} progress={karaokeProgress} />
              ) : isListening ? (
                <p className="text-base md:text-2xl font-semibold leading-snug tracking-tight">
                  {transcript
                    ? <span className="text-white">{transcript}</span>
                    : <span className="text-[rgba(255,255,255,0.15)]">Listening…</span>
                  }
                </p>
              ) : isTyping || streaming ? (
                <div className="flex items-center gap-2 md:gap-3">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.2)', animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              ) : (
                <p className="text-base text-[rgba(255,255,255,0.1)] font-medium">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Conversation history */}
        <div className={`${card} flex-[2] flex flex-col min-h-0`}>
          <div className="px-4 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3 shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#444]">Conversation</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-5 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-[rgba(255,255,255,0.1)] mt-4 text-center">Conversation will appear here</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: m.role === 'user' ? 'rgba(255,255,255,0.35)' : 'rgba(62,207,142,0.5)' }}>
                  {m.role === 'user' ? 'You' : agentName}
                </p>
                <p className="text-xs md:text-sm text-[rgba(255,255,255,0.5)] leading-relaxed">
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                    <span className="inline-block w-1 h-3 bg-[#3ECF8E] ml-0.5 animate-pulse rounded-sm" />
                  )}
                </p>
              </div>
            ))}
            <div className="h-1" />
          </div>
        </div>

        {/* TTS debug overlay — remove once audio is confirmed working */}
        {ttsLog.length > 0 && (
          <div className="fixed bottom-32 left-3 right-3 z-[9999] rounded-xl p-3 text-left md:hidden"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(229,72,77,0.4)' }}>
            <p className="text-[10px] font-bold text-[#E5484D] mb-1 uppercase tracking-widest">TTS Debug</p>
            {ttsLog.map((m, i) => (
              <p key={i} className="text-[10px] text-[#aaa] leading-relaxed font-mono">{m}</p>
            ))}
          </div>
        )}

        {/* Mobile mic bar (hidden on md+) */}
        <div className="md:hidden flex items-center justify-center gap-5 shrink-0 py-1">
          {supported !== false && (
            <button onClick={onMic} disabled={streaming || isTyping || isSpeaking}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-20',
                isListening
                  ? 'bg-[#E5484D] shadow-[0_0_32px_rgba(229,72,77,0.45)]'
                  : 'bg-[#1c1c1c] border border-[rgba(255,255,255,0.09)]'
              )}>
              {isListening
                ? <MicrophoneSlash size={22} weight="duotone" className="text-white" />
                : <Microphone size={22} weight="duotone" className="text-[#555]" />}
            </button>
          )}
          <p className="text-xs font-medium text-[#444]">
            {isListening ? 'Tap to stop' : 'Tap to speak'}
          </p>
        </div>
      </div>
    </div>
  )
}
