'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Microphone, Users, ChatCircle, ArrowUpRight, X, ChatText, UploadSimple, FileText, ArrowLeft, Heart } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/Spinner'

// ── Mode definitions ──────────────────────────────────────────────────────────

const modes = [
  {
    id: 'interview',
    label: 'Interview Prep',
    detail: 'Get grilled on your role by a realistic AI interviewer. Real pressure, real feedback.',
    icon: Users,
    color: '#3B82F6',
  },
  {
    id: 'speaking',
    label: 'Public Speaking',
    detail: 'Rehearse pitches, talks, and presentations with an AI coach who gives honest critique.',
    icon: Microphone,
    color: '#3ECF8E',
  },
  {
    id: 'conversation',
    label: 'Conversations',
    detail: "Talk to any kind of person in any situation — you define who they are and what's at stake.",
    icon: ChatCircle,
    color: '#F5A623',
  },
  {
    id: 'dating',
    label: 'Dating & Romance',
    detail: 'Practice talking to someone you like. Build confidence, charm, and natural chemistry.',
    icon: Heart,
    color: '#EC4899',
  },
]

// ── System prompt builders ────────────────────────────────────────────────────

const backgroundDescriptions: Record<string, string> = {
  american:    'American',
  british:     'British',
  nigerian:    'Nigerian',
  indian:      'Indian',
  chinese:     'Chinese',
  latino:      'Latino',
  arab:        'Arab / Middle Eastern',
  french:      'French',
}

function buildInterviewPrompt(
  role: string, company: string, type: string, level: string,
  gender: string, background: string, resumeText?: string
): string {
  const co = company.trim() ? `at ${company.trim()}` : 'at a well-known tech company'
  const typeMap: Record<string, string> = {
    behavioral: 'behavioral',
    technical: 'technical / coding',
    system: 'system design',
    case: 'case study',
    mixed: 'mixed (behavioral + technical)',
  }
  const pronoun = gender === 'woman' ? 'She/her' : gender === 'man' ? 'He/him' : 'They/them'
  const bgDesc = backgroundDescriptions[background] ?? background
  const personaLine = `You are a ${bgDesc} ${gender === 'nonbinary' ? 'person' : gender} hiring manager. ${pronoun}. Speak and behave authentically to your background and personality — natural speech patterns, cultural nuances. Do not narrate your identity; simply be it.`
  const resumeSection = resumeText?.trim()
    ? `\n\nThe candidate has provided their resume. Use it to ask targeted questions about their experience, gaps, and specific projects:\n\n--- RESUME ---\n${resumeText.trim()}\n--- END RESUME ---`
    : ''
  return `${personaLine}

You are conducting a ${typeMap[type] ?? type} interview for the ${role} position ${co} at the ${level} level.

Run a realistic, challenging interview. Ask one question at a time. Probe deeper after each answer — challenge vague responses, request specific examples, don't let the candidate off easy.

Maintain a professional but direct tone. Never break character. Do not offer coaching or feedback during the interview.${resumeSection}

Start by introducing yourself by name and asking the candidate to tell you about themselves.`
}

function buildSpeakingPrompt(topic: string, audience: string, format: string, goal: string): string {
  const audienceMap: Record<string, string> = {
    technical: 'a technical engineering audience',
    executive: 'a room of senior executives and decision-makers',
    general: 'a general audience with mixed backgrounds',
    investors: 'potential investors and stakeholders',
    students: 'students and early-career professionals',
  }
  const formatMap: Record<string, string> = {
    pitch: 'startup / product pitch',
    conference: 'conference talk',
    team: 'internal team presentation',
    sales: 'sales demo',
    ted: 'TEDx-style talk',
  }
  return `You are an expert public speaking coach. The speaker is rehearsing a ${formatMap[format] ?? format} on the topic "${topic}" for ${audienceMap[audience] ?? audience}.

Their primary goal is to improve their ${goal}.

Start by warmly welcoming them and asking them to begin their presentation whenever they're ready. As they speak, listen carefully. When they pause or finish a section, provide specific, actionable coaching — comment on structure, pacing, word choice, filler words, and engagement. Be encouraging but honest.

If they ask you to play the role of the audience, do so and respond authentically to their presentation.`
}

function buildConversationPrompt(person: string, situation: string, userGoal: string): string {
  return `You are ${person.trim()}.

The situation is: ${situation.trim()}

The person you are talking to is trying to ${userGoal.trim()}.

Play this role naturally and authentically. Respond the way this person would genuinely respond — with their personality, concerns, objections, and emotions. Do not break character. Do not be artificially easy or cooperative — make the conversation realistic. Speak conversationally, not in lists.

Start the conversation naturally based on the situation described.`
}

function buildDatingPrompt(
  gender: string, vibe: string, interests: string,
  setting: string, difficulty: string
): string {
  const vibeMap: Record<string, string> = {
    intellectual:  'intellectual and thoughtful — you love deep conversations, ideas, and learning',
    adventurous:   'adventurous and spontaneous — you live for experiences, travel, and trying new things',
    funny:         'witty and funny — you use humour naturally and love people who can match your energy',
    reserved:      'a little reserved and observant — you are selective about who you open up to',
    confident:     'confident and direct — you know what you want and you respect people who are upfront',
    creative:      'creative and artistic — you see the world differently and appreciate depth and originality',
    ambitious:     'driven and ambitious — career matters to you and you admire people who are going somewhere',
    carefree:      'laid-back and carefree — you go with the flow and love genuine, effortless connections',
  }
  const settingMap: Record<string, string> = {
    coffee:        'You just matched on a dating app and agreed to meet for coffee. This is your first time meeting in person.',
    party:         'You are both at a mutual friend\'s house party. You noticed each other across the room and started talking.',
    gym:           'You are both regulars at the same gym. You have seen each other around a few times.',
    bookstore:     'You are browsing in a bookstore and reached for the same book at the same time.',
    app:           'You have been texting for a few days after matching on a dating app. This is your first voice/video call.',
    colleague:     'You work in the same company but different teams. You are talking for the first time at a work event.',
  }
  const difficultyMap: Record<string, string> = {
    easy:    'You are warm, friendly, and fairly open. You enjoy the conversation and show genuine interest without playing games.',
    medium:  'You are pleasant but a little guarded. You need the other person to earn your interest — you do not give it away immediately.',
    hard:    'You have high standards and are slow to warm up. You are politely sceptical, a bit hard to impress, and you have been let down before — so you watch for red flags.',
  }
  const interestLine = interests.trim()
    ? `\n\nYour specific interests and personality details: ${interests.trim()}`
    : ''
  const pronounMap: Record<string, string> = { woman: 'She/her', man: 'He/him', nonbinary: 'They/them' }

  return `You are playing the role of a real ${gender} that someone is trying to connect with romantically. ${pronounMap[gender] ?? 'They/them'}.

Your vibe: ${vibeMap[vibe] ?? vibe}${interestLine}

The situation: ${settingMap[setting] ?? setting}

How you respond: ${difficultyMap[difficulty] ?? difficultyMap.medium}

Rules:
- Stay completely in character. You are a real person, not an AI assistant.
- Respond naturally — short to medium replies, like real conversation. Never write lists or long speeches.
- Show genuine emotions: curiosity, amusement, slight boredom if the conversation goes flat, excitement if something clicks.
- Do NOT make it easy. Let the conversation breathe. If something they say is boring or awkward, react honestly.
- If the conversation flows well, warm up gradually. Chemistry should feel earned.
- Never break character. Never mention AI, prompts, or coaching.

Start the conversation naturally based on the setting — just say something a real person would say in that moment.`
}

// ── Pill selector component ───────────────────────────────────────────────────

function Pills({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="h-8 px-3.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: value === o.value ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${value === o.value ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
            color: value === o.value ? '#ededed' : '#666',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-[#ccc]">{label}</p>
        {hint && <p className="text-xs text-[#555] mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-2.5 text-sm text-[#ededed] placeholder:text-[#444] outline-none focus:border-[rgba(255,255,255,0.25)] transition-colors"

// ── Main page ─────────────────────────────────────────────────────────────────

function PracticePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [modalStep, setModalStep] = useState(1)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode && modes.find(m => m.id === mode)) setActiveMode(mode)
  }, [searchParams])

  // Interview fields
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [interviewType, setInterviewType] = useState('behavioral')
  const [level, setLevel] = useState('mid')
  const [resumeText, setResumeText] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeParsing, setResumeParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Interviewer persona (step 2)
  const [interviewerGender, setInterviewerGender] = useState('man')
  const [interviewerBackground, setInterviewerBackground] = useState('american')

  // Speaking fields
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('general')
  const [format, setFormat] = useState('conference')
  const [speakingGoal, setSpeakingGoal] = useState('confidence')

  // Conversation fields
  const [person, setPerson] = useState('')
  const [situation, setSituation] = useState('')
  const [userGoal, setUserGoal] = useState('')

  // Dating fields
  const [datingGender, setDatingGender] = useState('woman')
  const [datingVibe, setDatingVibe] = useState('confident')
  const [datingInterests, setDatingInterests] = useState('')
  const [datingSetting, setDatingSetting] = useState('coffee')
  const [datingDifficulty, setDatingDifficulty] = useState('medium')

  const close = () => {
    if (!starting) {
      setActiveMode(null)
      setModalStep(1)
      setResumeText('')
      setResumeFileName('')
    }
  }

  const handleResumeFile = async (file: File) => {
    setResumeParsing(true)
    setResumeFileName(file.name)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse-resume', { method: 'POST', body: form })
      const data = await res.json()
      setResumeText(data.text ?? '')
    } catch {
      setResumeText('')
    } finally {
      setResumeParsing(false)
    }
  }

  const launch = async (sessionMode: 'text' | 'audio') => {
    if (starting) return
    setStarting(true)

    let systemPrompt = ''
    let title = ''

    if (activeMode === 'interview') {
      if (!role.trim()) { setStarting(false); return }
      systemPrompt = buildInterviewPrompt(role, company, interviewType, level, interviewerGender, interviewerBackground, resumeText)
      title = `${level.charAt(0).toUpperCase() + level.slice(1)} ${role} Interview`
    } else if (activeMode === 'speaking') {
      if (!topic.trim()) { setStarting(false); return }
      systemPrompt = buildSpeakingPrompt(topic, audience, format, speakingGoal)
      title = `${topic} — Speaking Coach`
    } else if (activeMode === 'conversation') {
      if (!person.trim() || !situation.trim()) { setStarting(false); return }
      systemPrompt = buildConversationPrompt(person, situation, userGoal || 'navigate this situation effectively')
      title = `Conversation with ${person.split(' ').slice(0, 4).join(' ')}`
    } else if (activeMode === 'dating') {
      systemPrompt = buildDatingPrompt(datingGender, datingVibe, datingInterests, datingSetting, datingDifficulty)
      const genderLabel = datingGender === 'woman' ? 'her' : datingGender === 'man' ? 'him' : 'them'
      title = `Dating practice — getting to know ${genderLabel}`
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: scenario } = await supabase
        .from('scenarios')
        .insert({ title, mode: activeMode!, system_prompt: systemPrompt, context: title, difficulty: 'medium', duration_minutes: 15, user_id: user.id })
        .select('id').single()

      if (!scenario) { setStarting(false); return }

      const { data: session } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, scenario_id: scenario.id, started_at: new Date().toISOString() })
        .select('id').single()

      if (session?.id) router.push(`/session/${session.id}?mode=${sessionMode}`)
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#ededed] mb-1">Practice</h1>
        <p className="text-base text-[#555]">Pick a mode and we'll build a session around you.</p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modes.map(({ id, label, detail, icon: Icon, color }) => (
          <button key={id} onClick={() => setActiveMode(id)} className="group block text-left w-full">
            <div className="relative rounded-3xl flex flex-col p-6 overflow-hidden cursor-pointer transition-all duration-300 group-hover:-translate-y-1.5 group-hover:bg-[rgba(255,255,255,0.07)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${color}14` }}>
                <Icon size={26} weight="duotone" style={{ color }} />
              </div>
              <p className="text-lg font-bold text-[#ededed] leading-tight mb-2">{label}</p>
              <p className="text-sm text-[#555] leading-relaxed mb-5">{detail}</p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[rgba(255,255,255,0.07)]">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}14`, color }}>Customisable</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[#555] transition-all duration-300 group-hover:scale-110">
                  <ArrowUpRight size={13} weight="bold" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Modal ── */}
      {activeMode && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) close() }}>
          <div className="w-full max-w-lg rounded-3xl border border-[rgba(255,255,255,0.1)] backdrop-blur-2xl bg-[rgba(12,12,12,0.95)] p-7 animate-fade-up space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {activeMode === 'interview' && modalStep === 2 && (
                  <button onClick={() => setModalStep(1)}
                    className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#555] hover:text-[#ededed] transition-colors shrink-0">
                    <ArrowLeft size={14} weight="bold" />
                  </button>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-1">
                    {modes.find(m => m.id === activeMode)?.label}
                    {activeMode === 'interview' && <span className="ml-2 text-[#333]">· Step {modalStep} of 2</span>}
                  </p>
                  <h2 className="text-xl font-bold text-[#ededed]">
                    {activeMode === 'interview' && modalStep === 1 ? 'Set up your interview' :
                     activeMode === 'interview' && modalStep === 2 ? 'Your interviewer' :
                     activeMode === 'speaking' ? 'Set up your session' :
                     activeMode === 'dating' ? 'Build your person' :
                     'Describe the conversation'}
                  </h2>
                </div>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#555] hover:text-[#ededed] transition-colors shrink-0">
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* ── Interview step 1 ── */}
            {activeMode === 'interview' && modalStep === 1 && (
              <div className="space-y-5">
                <Field label="Role you're interviewing for" hint="e.g. Senior Software Engineer, Product Manager">
                  <input className={inputCls} placeholder="Senior Software Engineer" value={role} onChange={e => setRole(e.target.value)} />
                </Field>
                <Field label="Company" hint="Optional — leave blank for a generic interview">
                  <input className={inputCls} placeholder="Google, a startup, any company…" value={company} onChange={e => setCompany(e.target.value)} />
                </Field>
                <Field label="Interview type">
                  <Pills value={interviewType} onChange={setInterviewType} options={[
                    { value: 'behavioral', label: 'Behavioral' },
                    { value: 'technical', label: 'Technical' },
                    { value: 'system', label: 'System Design' },
                    { value: 'case', label: 'Case Study' },
                    { value: 'mixed', label: 'Mixed' },
                  ]} />
                </Field>
                <Field label="Your level">
                  <Pills value={level} onChange={setLevel} options={[
                    { value: 'junior', label: 'Junior' },
                    { value: 'mid', label: 'Mid-level' },
                    { value: 'senior', label: 'Senior' },
                    { value: 'lead', label: 'Lead / Staff' },
                  ]} />
                </Field>
                <Field label="Resume" hint="Optional — AI will tailor questions to your experience">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeFile(f) }}
                  />
                  {resumeFileName ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(62,207,142,0.12)] flex items-center justify-center shrink-0">
                        {resumeParsing ? <Spinner size={14} color="#3ECF8E" /> : <FileText size={16} weight="duotone" className="text-[#3ECF8E]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#ededed] truncate">{resumeFileName}</p>
                        <p className="text-xs text-[#555]">{resumeParsing ? 'Parsing…' : 'Ready'}</p>
                      </div>
                      <button type="button" onClick={() => { setResumeText(''); setResumeFileName(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#555] hover:text-[#ededed] transition-colors shrink-0">
                        <X size={11} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-full border border-dashed border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.03)] transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                        <UploadSimple size={16} weight="bold" className="text-[#555] group-hover:text-[#ededed] transition-colors" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#666] group-hover:text-[#ededed] transition-colors">Upload resume</p>
                        <p className="text-xs text-[#444]">PDF or TXT</p>
                      </div>
                    </button>
                  )}
                </Field>
                <button
                  onClick={() => { if (role.trim()) setModalStep(2) }}
                  disabled={!role.trim()}
                  className="w-full h-11 rounded-full text-sm font-bold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', color: '#ededed' }}>
                  Next — Choose your interviewer →
                </button>
              </div>
            )}

            {/* ── Interview step 2: interviewer persona ── */}
            {activeMode === 'interview' && modalStep === 2 && (
              <div className="space-y-6">
                <Field label="Gender">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'man',      label: 'Man',        emoji: '👨' },
                      { value: 'woman',    label: 'Woman',      emoji: '👩' },
                      { value: 'nonbinary', label: 'Non-binary', emoji: '🧑' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setInterviewerGender(opt.value)}
                        className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                        style={{
                          background: interviewerGender === opt.value ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${interviewerGender === opt.value ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs font-semibold" style={{ color: interviewerGender === opt.value ? '#ededed' : '#666' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Background">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'american',  label: 'American',  emoji: '🇺🇸' },
                      { value: 'british',   label: 'British',   emoji: '🇬🇧' },
                      { value: 'nigerian',  label: 'Nigerian',  emoji: '🇳🇬' },
                      { value: 'indian',    label: 'Indian',    emoji: '🇮🇳' },
                      { value: 'chinese',   label: 'Chinese',   emoji: '🇨🇳' },
                      { value: 'latino',    label: 'Latino',    emoji: '🌎' },
                      { value: 'arab',      label: 'Arab',      emoji: '🇦🇪' },
                      { value: 'french',    label: 'French',    emoji: '🇫🇷' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setInterviewerBackground(opt.value)}
                        className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all"
                        style={{
                          background: interviewerBackground === opt.value ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${interviewerBackground === opt.value ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-[11px] font-semibold" style={{ color: interviewerBackground === opt.value ? '#ededed' : '#666' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Start buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={() => launch('text')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.18)] hover:bg-[rgba(59,130,246,0.13)] hover:border-[rgba(59,130,246,0.3)] transition-all disabled:opacity-40">
                    <ChatText size={20} weight="duotone" className="text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#ededed]">Text mode</p>
                      <p className="text-xs text-[#555]">Type your responses</p>
                    </div>
                    {starting && <Spinner size={14} color="#3B82F6" />}
                  </button>
                  <button onClick={() => launch('audio')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(62,207,142,0.07)] border border-[rgba(62,207,142,0.18)] hover:bg-[rgba(62,207,142,0.13)] hover:border-[rgba(62,207,142,0.3)] transition-all disabled:opacity-40">
                    <Microphone size={20} weight="duotone" className="text-[#3ECF8E]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#3ECF8E]">Audio mode</p>
                      <p className="text-xs text-[#555]">Speak naturally</p>
                    </div>
                    {starting && <Spinner size={14} color="#3ECF8E" />}
                  </button>
                </div>
              </div>
            )}

            {/* ── Speaking fields ── */}
            {activeMode === 'speaking' && (
              <div className="space-y-5">
                <Field label="What are you presenting?" hint="Topic, title, or subject">
                  <input className={inputCls} placeholder="The future of AI in healthcare" value={topic} onChange={e => setTopic(e.target.value)} />
                </Field>
                <Field label="Format">
                  <Pills value={format} onChange={setFormat} options={[
                    { value: 'pitch', label: 'Pitch' },
                    { value: 'conference', label: 'Conference talk' },
                    { value: 'team', label: 'Team update' },
                    { value: 'sales', label: 'Sales demo' },
                    { value: 'ted', label: 'TEDx-style' },
                  ]} />
                </Field>
                <Field label="Audience">
                  <Pills value={audience} onChange={setAudience} options={[
                    { value: 'technical', label: 'Engineers' },
                    { value: 'executive', label: 'Executives' },
                    { value: 'investors', label: 'Investors' },
                    { value: 'general', label: 'General' },
                    { value: 'students', label: 'Students' },
                  ]} />
                </Field>
                <Field label="What do you want to improve most?">
                  <Pills value={speakingGoal} onChange={setSpeakingGoal} options={[
                    { value: 'confidence', label: 'Confidence' },
                    { value: 'structure', label: 'Structure' },
                    { value: 'pacing', label: 'Pacing' },
                    { value: 'engagement', label: 'Engagement' },
                  ]} />
                </Field>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={() => launch('text')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.18)] hover:bg-[rgba(59,130,246,0.13)] hover:border-[rgba(59,130,246,0.3)] transition-all disabled:opacity-40">
                    <ChatText size={20} weight="duotone" className="text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#ededed]">Text mode</p>
                      <p className="text-xs text-[#555]">Type your responses</p>
                    </div>
                    {starting && <Spinner size={14} color="#3B82F6" />}
                  </button>
                  <button onClick={() => launch('audio')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(62,207,142,0.07)] border border-[rgba(62,207,142,0.18)] hover:bg-[rgba(62,207,142,0.13)] hover:border-[rgba(62,207,142,0.3)] transition-all disabled:opacity-40">
                    <Microphone size={20} weight="duotone" className="text-[#3ECF8E]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#3ECF8E]">Audio mode</p>
                      <p className="text-xs text-[#555]">Speak naturally</p>
                    </div>
                    {starting && <Spinner size={14} color="#3ECF8E" />}
                  </button>
                </div>
              </div>
            )}

            {/* ── Conversation fields ── */}
            {activeMode === 'conversation' && (
              <div className="space-y-5">
                <Field label="Who do you want to talk to?" hint="Describe the person — their role, personality, relationship to you">
                  <textarea className={`${inputCls} resize-none h-20`}
                    placeholder="e.g. My direct manager who tends to be dismissive of new ideas and is under a lot of pressure from leadership…"
                    value={person} onChange={e => setPerson(e.target.value)} />
                </Field>
                <Field label="What's the situation?" hint="Set the scene">
                  <textarea className={`${inputCls} resize-none h-20`}
                    placeholder="e.g. I'm asking for a raise after being passed over for promotion. It's our quarterly 1-on-1…"
                    value={situation} onChange={e => setSituation(e.target.value)} />
                </Field>
                <Field label="What's your goal?" hint="What do you want to walk away with?">
                  <input className={inputCls} placeholder="e.g. Get a commitment on timeline for the next promotion cycle"
                    value={userGoal} onChange={e => setUserGoal(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={() => launch('text')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.18)] hover:bg-[rgba(59,130,246,0.13)] hover:border-[rgba(59,130,246,0.3)] transition-all disabled:opacity-40">
                    <ChatText size={20} weight="duotone" className="text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#ededed]">Text mode</p>
                      <p className="text-xs text-[#555]">Type your responses</p>
                    </div>
                    {starting && <Spinner size={14} color="#3B82F6" />}
                  </button>
                  <button onClick={() => launch('audio')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(62,207,142,0.07)] border border-[rgba(62,207,142,0.18)] hover:bg-[rgba(62,207,142,0.13)] hover:border-[rgba(62,207,142,0.3)] transition-all disabled:opacity-40">
                    <Microphone size={20} weight="duotone" className="text-[#3ECF8E]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#3ECF8E]">Audio mode</p>
                      <p className="text-xs text-[#555]">Speak naturally</p>
                    </div>
                    {starting && <Spinner size={14} color="#3ECF8E" />}
                  </button>
                </div>
              </div>
            )}

            {/* ── Dating fields ── */}
            {activeMode === 'dating' && (
              <div className="space-y-5">
                <Field label="Who do you want to talk to?">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'woman',    label: 'Woman',      emoji: '👩' },
                      { value: 'man',      label: 'Man',        emoji: '👨' },
                      { value: 'nonbinary', label: 'Non-binary', emoji: '🧑' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setDatingGender(opt.value)}
                        className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                        style={{
                          background: datingGender === opt.value ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${datingGender === opt.value ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-xs font-semibold" style={{ color: datingGender === opt.value ? '#EC4899' : '#666' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Their vibe" hint="Pick the personality that matches who you want to practice with">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'intellectual', label: 'Intellectual', emoji: '📚' },
                      { value: 'adventurous',  label: 'Adventurous',  emoji: '🌍' },
                      { value: 'funny',        label: 'Funny',        emoji: '😂' },
                      { value: 'reserved',     label: 'Reserved',     emoji: '🌙' },
                      { value: 'confident',    label: 'Confident',    emoji: '💫' },
                      { value: 'creative',     label: 'Creative',     emoji: '🎨' },
                      { value: 'ambitious',    label: 'Ambitious',    emoji: '🚀' },
                      { value: 'carefree',     label: 'Carefree',     emoji: '🌊' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setDatingVibe(opt.value)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
                        style={{
                          background: datingVibe === opt.value ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${datingVibe === opt.value ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="text-[10px] font-semibold leading-tight text-center" style={{ color: datingVibe === opt.value ? '#EC4899' : '#666' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Their interests" hint="Optional — makes the conversation feel more specific and real">
                  <input className={inputCls}
                    placeholder="e.g. loves hiking, hates small talk, big into sci-fi, works in tech…"
                    value={datingInterests} onChange={e => setDatingInterests(e.target.value)} />
                </Field>

                <Field label="Where you met">
                  <Pills value={datingSetting} onChange={setDatingSetting} options={[
                    { value: 'coffee',    label: 'Coffee date' },
                    { value: 'party',     label: 'Party' },
                    { value: 'app',       label: 'Dating app' },
                    { value: 'gym',       label: 'Gym' },
                    { value: 'bookstore', label: 'Bookstore' },
                    { value: 'colleague', label: 'Work event' },
                  ]} />
                </Field>

                <Field label="Difficulty">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'easy',   label: 'Friendly',       sub: 'Warm & open' },
                      { value: 'medium', label: 'Neutral',         sub: 'Takes some effort' },
                      { value: 'hard',   label: 'Hard to impress', sub: 'High standards' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setDatingDifficulty(opt.value)}
                        className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-2xl transition-all"
                        style={{
                          background: datingDifficulty === opt.value ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${datingDifficulty === opt.value ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="text-sm font-bold" style={{ color: datingDifficulty === opt.value ? '#EC4899' : '#aaa' }}>{opt.label}</span>
                        <span className="text-[10px] text-[#555]">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={() => launch('text')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.18)] hover:bg-[rgba(59,130,246,0.13)] hover:border-[rgba(59,130,246,0.3)] transition-all disabled:opacity-40">
                    <ChatText size={20} weight="duotone" className="text-[#3B82F6]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#ededed]">Text mode</p>
                      <p className="text-xs text-[#555]">Type your responses</p>
                    </div>
                    {starting && <Spinner size={14} color="#3B82F6" />}
                  </button>
                  <button onClick={() => launch('audio')} disabled={starting}
                    className="flex items-center justify-center gap-2.5 p-4 rounded-full bg-[rgba(236,72,153,0.07)] border border-[rgba(236,72,153,0.18)] hover:bg-[rgba(236,72,153,0.13)] hover:border-[rgba(236,72,153,0.3)] transition-all disabled:opacity-40">
                    <Microphone size={20} weight="duotone" className="text-[#EC4899]" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#EC4899]">Audio mode</p>
                      <p className="text-xs text-[#555]">Speak naturally</p>
                    </div>
                    {starting && <Spinner size={14} color="#EC4899" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticePageInner />
    </Suspense>
  )
}
