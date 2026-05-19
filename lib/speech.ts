'use client'

// ── TTS via Groq API ──────────────────────────────────────────────────────────
//
// iOS Safari blocks audio.play() from async code (after a fetch).
// Fix: create ONE Audio element and call .play() on it from the user's tap
// gesture (unlockAudio). iOS then allows .play() on that same element later,
// even from async code.  Never null _player — losing the reference loses the unlock.

let _player: HTMLAudioElement | null = null
let _currentBlobUrl: string | null = null

// 1-sample silent WAV — valid audio iOS will accept to unlock the element
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

// Call synchronously inside a user tap/click handler BEFORE any async work
export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (_player) {
    // Already unlocked — just ensure it isn't stuck
    if (_player.paused && _player.src === SILENT_WAV) {
      _player.play().catch(() => {})
    }
    return
  }
  _player = new Audio()
  _player.src = SILENT_WAV
  _player.play().catch(() => {})
}

function speakBrowser(text: string, onEnd?: () => void): void {
  window.speechSynthesis?.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  setTimeout(() => window.speechSynthesis?.speak(u), 80)
}

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  stopSpeaking()
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error(`TTS ${res.status}`)

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    _currentBlobUrl = url

    if (!_player) {
      // Desktop path: no prior tap needed, create fresh element
      _player = new Audio()
    }

    _player.src = url
    _player.onended = () => {
      if (_currentBlobUrl === url) { URL.revokeObjectURL(url); _currentBlobUrl = null }
      onEnd?.()
    }
    _player.onerror = () => {
      if (_currentBlobUrl === url) { URL.revokeObjectURL(url); _currentBlobUrl = null }
      onEnd?.()
    }
    await _player.play()
  } catch (err) {
    console.error('[tts]', err)
    speakBrowser(text, onEnd)
  }
}

export function stopSpeaking(): void {
  if (!_player) return
  _player.pause()
  _player.onended = null
  _player.onerror = null
  if (_currentBlobUrl) {
    URL.revokeObjectURL(_currentBlobUrl)
    _currentBlobUrl = null
  }
  // DO NOT set _player = null — we must keep the unlocked element alive
}

export function getAudioProgress(): number {
  if (!_player || _player.paused || !_player.duration || _player.duration === Infinity) return 0
  return _player.currentTime / _player.duration
}

export function isSpeechSynthesisSupported(): boolean { return true }

// ── STT via Groq Whisper ──────────────────────────────────────────────────────

const SILENCE_THRESHOLD = 0.01
const SILENCE_DURATION_MS = 1800
const MAX_RECORD_MS = 60_000

export interface STTSession {
  stop: () => void
}

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
      for (let i = 0; i < dataArr.length; i++) {
        const v = (dataArr[i] - 128) / 128
        sum += v * v
      }
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
