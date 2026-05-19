'use client'

// ── Audio Context (unlocked once by user tap — works on iOS) ─────────────────

let _ctx: AudioContext | null = null
let _source: AudioBufferSourceNode | null = null
let _sourceStartTime = 0
let _sourceDuration = 0
let _audioEl: HTMLAudioElement | null = null
let _onEndCallback: (() => void) | null = null

export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (!_ctx) {
    _ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
  }
  if (_ctx!.state === 'suspended') {
    _ctx!.resume().catch(() => {})
  }
}

function speakBrowser(text: string, onEnd?: () => void): void {
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.onend = () => onEnd?.()
  utter.onerror = () => onEnd?.()
  setTimeout(() => synth.speak(utter), 80)
}

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  try {
    stopSpeaking()
    _onEndCallback = onEnd ?? null

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) { speakBrowser(text, onEnd); return }

    const arrayBuffer = await res.arrayBuffer()

    if (_ctx) {
      // AudioContext path — works on iOS after unlockAudio() has been called
      if (_ctx.state === 'suspended') await _ctx.resume()
      const audioBuffer = await _ctx.decodeAudioData(arrayBuffer.slice(0))
      _source = _ctx.createBufferSource()
      _source.buffer = audioBuffer
      _sourceDuration = audioBuffer.duration
      _source.connect(_ctx.destination)
      _source.onended = () => {
        _source = null
        const cb = _onEndCallback
        _onEndCallback = null
        cb?.()
      }
      _sourceStartTime = _ctx.currentTime
      _source.start()
    } else {
      // Fallback: HTMLAudioElement (works on desktop without a prior gesture)
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      _audioEl = new Audio(url)
      _audioEl.onended = () => { URL.revokeObjectURL(url); _audioEl = null; onEnd?.() }
      _audioEl.onerror = () => { URL.revokeObjectURL(url); _audioEl = null; onEnd?.() }
      await _audioEl.play()
    }
  } catch {
    speakBrowser(text, onEnd)
  }
}

export function stopSpeaking(): void {
  if (_source) {
    const s = _source
    _source = null
    _onEndCallback = null
    try { s.stop() } catch {}
  }
  if (_audioEl) {
    const a = _audioEl
    _audioEl = null
    _onEndCallback = null
    a.onended = null
    a.onerror = null
    a.pause()
    a.src = ''
  }
}

export function getAudioProgress(): number {
  if (_source && _ctx && _sourceDuration > 0) {
    return Math.min((_ctx.currentTime - _sourceStartTime) / _sourceDuration, 1)
  }
  if (!_audioEl || !_audioEl.duration || _audioEl.duration === Infinity) return 0
  return _audioEl.currentTime / _audioEl.duration
}

export function isSpeechSynthesisSupported(): boolean { return true }

// ── Speech-to-Text (STT via Groq Whisper) ────────────────────────────────────

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
