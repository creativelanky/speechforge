'use client'

// ── TTS ────────────────────────────────────────────────────────────────────────
//
// iOS Safari blocks audio from async code unless the element/context was
// "unlocked" by an earlier user gesture on the SAME object.
// We unlock three independent paths in unlockAudio() so at least one works.

let _ctx: AudioContext | null = null
let _ctxSource: AudioBufferSourceNode | null = null
let _ctxStartTime = 0
let _ctxDuration = 0

let _player: HTMLAudioElement | null = null
let _playerUrl: string | null = null

let _synthReady = false

// AudioContext routes through earpiece on iOS — skip it, use HTMLAudioElement instead
const _isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

// Debug callback — set from the session page to surface errors visually on mobile
let _debug: ((msg: string) => void) | null = null
export function setTTSDebug(cb: ((msg: string) => void) | null) { _debug = cb }
function dbg(msg: string) { console.log('[tts]', msg); _debug?.(msg) }

// Call SYNCHRONOUSLY at the very top of a tap/click handler, before any await
export function unlockAudio(): void {
  if (typeof window === 'undefined') return

  // 1. AudioContext — play a real (non-empty) silent buffer to activate on iOS
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext
  if (AC && !_ctx) {
    try {
      _ctx = new AC() as AudioContext
      const buf = _ctx.createBuffer(1, _ctx.sampleRate, _ctx.sampleRate) // 1 sec silence
      const src = _ctx.createBufferSource()
      src.buffer = buf
      src.connect(_ctx.destination)
      src.start(0)
      _ctx.resume().catch(() => {})
    } catch {}
  }

  // 2. HTMLAudioElement — play silent data URI to unlock this element for reuse
  if (!_player) {
    try {
      _player = new Audio()
      // Set these before play() — some iOS versions check them
      _player.setAttribute('playsinline', '')
      _player.volume = 1
      _player.muted = false
      // 1-sample valid WAV
      _player.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      _player.play().catch(() => {})
    } catch {}
  }

  // 3. SpeechSynthesis — speaking an empty utterance unlocks it for async calls
  if (!_synthReady && 'speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.rate = 16 // finish instantly
      window.speechSynthesis.speak(u)
      _synthReady = true
    } catch {}
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function stopCtxSource() {
  if (_ctxSource) {
    try { _ctxSource.stop() } catch {}
    _ctxSource.onended = null
    _ctxSource = null
  }
}

function stopPlayer() {
  if (_player) {
    _player.pause()
    _player.onended = null
    _player.onerror = null
  }
  if (_playerUrl) {
    URL.revokeObjectURL(_playerUrl)
    _playerUrl = null
  }
}

function speakSynth(text: string, onEnd?: () => void): void {
  window.speechSynthesis?.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  setTimeout(() => window.speechSynthesis?.speak(u), 50)
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  stopSpeaking()

  // Safety net: if everything fails silently, still call onEnd after 20s
  // so audio-mode sessions don't freeze on "Speaking…" forever
  let settled = false
  const done = () => { if (!settled) { settled = true; onEnd?.() } }
  const safety = setTimeout(done, 20_000)

  const finish = () => { clearTimeout(safety); done() }

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      try {
        const body = await res.json()
        dbg(`API ${res.status}: ${JSON.stringify(body).slice(0, 120)}`)
      } catch {
        dbg(`API error ${res.status}`)
      }
      speakSynth(text, finish)
      return
    }

    const arrayBuffer = await res.arrayBuffer()
    dbg(`audio ${(arrayBuffer.byteLength / 1024).toFixed(1)}kb ctx=${_ctx?.state ?? 'none'} player=${!!_player} synth=${_synthReady}`)

    // ── Path 1: AudioContext (skip on iOS — routes to earpiece, not speaker) ─
    if (_ctx && !_isIOS) {
      try {
        if (_ctx.state === 'suspended') await _ctx.resume()
        const audioBuf = await _ctx.decodeAudioData(arrayBuffer.slice(0))
        _ctxDuration = audioBuf.duration
        _ctxStartTime = _ctx.currentTime
        const src = _ctx.createBufferSource()
        _ctxSource = src
        src.buffer = audioBuf
        src.connect(_ctx.destination)
        src.onended = () => { _ctxSource = null; finish() }
        src.start(0)
        dbg(`playing via AudioContext (${audioBuf.duration.toFixed(1)}s)`)
        return
      } catch (e) {
        dbg(`AudioContext failed: ${e}`)
      }
    }

    // ── Path 2: pre-unlocked HTMLAudioElement ──────────────────────────────
    if (_player) {
      try {
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        _playerUrl = url
        _player.src = url
        _player.onended = () => { URL.revokeObjectURL(url); _playerUrl = null; finish() }
        _player.onerror = (e) => { dbg(`player onerror: ${e}`); URL.revokeObjectURL(url); _playerUrl = null; finish() }
        await _player.play()
        dbg('playing via HTMLAudioElement')
        return
      } catch (e) {
        dbg(`HTMLAudioElement failed: ${e}`)
      }
    }

    // ── Path 3: browser speech synthesis ──────────────────────────────────
    dbg('falling back to SpeechSynthesis')
    speakSynth(text, finish)
  } catch (e) {
    dbg(`speak error: ${e}`)
    speakSynth(text, finish)
  }
}

export function stopSpeaking(): void {
  stopCtxSource()
  stopPlayer()
  window.speechSynthesis?.cancel()
}

export function getAudioProgress(): number {
  if (_ctxSource && _ctx && _ctxDuration > 0) {
    return Math.min((_ctx.currentTime - _ctxStartTime) / _ctxDuration, 1)
  }
  if (_player && !_player.paused && _player.duration && _player.duration !== Infinity) {
    return _player.currentTime / _player.duration
  }
  return 0
}

export function isSpeechSynthesisSupported(): boolean { return true }

// ── STT via Groq Whisper ───────────────────────────────────────────────────────

const SILENCE_THRESHOLD = 0.01
const SILENCE_DURATION_MS = 1800
const MAX_RECORD_MS = 60_000

export interface STTSession { stop: () => void }

export async function startWhisperSTT(
  onTranscript: (text: string) => void,
  onStateChange: (listening: boolean) => void,
  onError?: (err: string) => void,
): Promise<STTSession | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg'

    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    let silenceTimer: ReturnType<typeof setTimeout> | null = null
    let maxTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const cleanup = () => {
      stopped = true
      if (silenceTimer) clearTimeout(silenceTimer)
      if (maxTimer) clearTimeout(maxTimer)
      stream.getTracks().forEach(t => t.stop())
      audioCtx.close()
    }

    const submitAudio = () => {
      if (stopped) return
      cleanup()
      recorder.stop()
    }

    recorder.onstop = async () => {
      onStateChange(false)
      if (chunks.length === 0) return
      const blob = new Blob(chunks, { type: mimeType })
      if (blob.size < 1000) return
      try {
        const form = new FormData()
        form.append('audio', blob, `audio.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`)
        const res = await fetch('/api/stt', { method: 'POST', body: form })
        const data = await res.json()
        if (data.text?.trim()) onTranscript(data.text.trim())
      } catch (err: any) {
        onError?.(err.message)
      }
    }

    const dataArr = new Uint8Array(analyser.fftSize)
    const monitorSilence = () => {
      if (stopped) return
      analyser.getByteTimeDomainData(dataArr)
      let sum = 0
      for (const b of dataArr) { const v = (b - 128) / 128; sum += v * v }
      const rms = Math.sqrt(sum / dataArr.length)
      if (rms > SILENCE_THRESHOLD) {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
      } else if (!silenceTimer) {
        silenceTimer = setTimeout(submitAudio, SILENCE_DURATION_MS)
      }
      if (!stopped) requestAnimationFrame(monitorSilence)
    }

    recorder.start()
    onStateChange(true)
    requestAnimationFrame(monitorSilence)
    maxTimer = setTimeout(submitAudio, MAX_RECORD_MS)

    return { stop: submitAudio }
  } catch (err: any) {
    onError?.(err.message ?? 'Microphone access denied')
    return null
  }
}
