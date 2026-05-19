'use client'

// ── Text-to-Speech (TTS via Groq API) ────────────────────────────────────────

let _audio: HTMLAudioElement | null = null

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
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) { speakBrowser(text, onEnd); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    _audio = new Audio(url)
    _audio.onended = () => { URL.revokeObjectURL(url); _audio = null; onEnd?.() }
    _audio.onerror = () => { URL.revokeObjectURL(url); _audio = null; onEnd?.() }
    await _audio.play()
  } catch {
    speakBrowser(text, onEnd)
  }
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

export function getAudioProgress(): number {
  if (!_audio || !_audio.duration || _audio.duration === Infinity) return 0
  return _audio.currentTime / _audio.duration
}

export function isSpeechSynthesisSupported(): boolean { return true }

// ── Speech-to-Text (STT via Groq Whisper) ────────────────────────────────────

const SILENCE_THRESHOLD = 0.01   // RMS below this = silence
const SILENCE_DURATION_MS = 1800 // ms of silence before auto-submit
const MAX_RECORD_MS = 60_000     // safety cap

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
      // Skip very short clips (likely silence/noise)
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

    // Monitor audio levels for silence detection
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
        // Speech detected — reset silence timer
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
      } else if (!silenceTimer) {
        // Silence started — start countdown
        silenceTimer = setTimeout(submitAudio, SILENCE_DURATION_MS)
      }
      if (!stopped) requestAnimationFrame(monitorSilence)
    }

    recorder.start()
    onStateChange(true)
    requestAnimationFrame(monitorSilence)

    // Safety cap
    maxTimer = setTimeout(submitAudio, MAX_RECORD_MS)

    return { stop: submitAudio }
  } catch (err: any) {
    onError?.(err.message ?? 'Microphone access denied')
    return null
  }
}
