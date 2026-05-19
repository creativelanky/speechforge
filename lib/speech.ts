'use client'

// ── Speech Recognition (STT) ──────────────────────────────────────────────

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function createSpeechRecognition(): any | null {
  if (!isSpeechRecognitionSupported()) return null
  const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const r = new API()
  r.continuous = true
  r.interimResults = true
  r.lang = 'en-US'
  return r
}

// ── Text-to-Speech (TTS via Groq API) ────────────────────────────────────

let _audio: HTMLAudioElement | null = null

function speakBrowser(text: string, onEnd?: () => void): void {
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.onend = () => onEnd?.()
  utter.onerror = () => onEnd?.()
  // Chrome requires a brief delay after cancel() before speak() works
  setTimeout(() => synth.speak(utter), 80)
}

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  try {
    stopSpeaking()

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      // Rate-limited or API error — fall back to browser TTS
      speakBrowser(text, onEnd)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    _audio = new Audio(url)
    _audio.onended = () => {
      URL.revokeObjectURL(url)
      _audio = null
      onEnd?.()
    }
    _audio.onerror = () => {
      URL.revokeObjectURL(url)
      _audio = null
      onEnd?.()
    }
    await _audio.play()
  } catch (err) {
    console.error('[tts] speak() error:', err)
    speakBrowser(text, onEnd)
  }
}

export function getAudioProgress(): number {
  if (!_audio || !_audio.duration || _audio.duration === Infinity) return 0
  return _audio.currentTime / _audio.duration
}

export function stopSpeaking(): void {
  if (_audio) {
    const a = _audio
    _audio = null
    a.onended = null
    a.onerror = null
    a.pause()
    a.src = ''
  }
}

export function isSpeechSynthesisSupported(): boolean {
  return true
}
