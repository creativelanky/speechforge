'use client'

import { useRef, useState, useCallback } from 'react'
import { createSpeechRecognition, speak, stopSpeaking, isSpeechRecognitionSupported } from '@/lib/speech'

// How long to wait after the last recognized word before treating it as done
const SILENCE_AFTER_SPEECH_MS = 3000

export function useSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)

  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef<((text: string) => void) | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const finalTextRef = useRef('')
  const interimTextRef = useRef('')
  const activeRef = useRef(false)
  const sendingRef = useRef(false)  // true = silence timer fired, stop() called, waiting for onend

  const checkSupport = useCallback(() => {
    const s = isSpeechRecognitionSupported()
    setSupported(s)
    return s
  }, [])

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!checkSupport()) return
    if (activeRef.current) return

    onResultRef.current = onResult
    finalTextRef.current = ''
    interimTextRef.current = ''
    activeRef.current = true
    sendingRef.current = false
    setTranscript('')

    function launch() {
      if (!activeRef.current) return

      const recognition = createSpeechRecognition()
      if (!recognition) { activeRef.current = false; return }
      recognitionRef.current = recognition

      recognition.onstart = () => setIsListening(true)

      recognition.onresult = (event: any) => {
        // Reset the silence timer every time new speech is recognized
        clearTimeout(silenceTimerRef.current)

        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTextRef.current += t
            interimTextRef.current = ''
          } else {
            interim += t
          }
        }
        interimTextRef.current = interim
        setTranscript(finalTextRef.current + interim)

        // After SILENCE_AFTER_SPEECH_MS of no new results, stop and deliver
        silenceTimerRef.current = setTimeout(() => {
          const text = (finalTextRef.current + interimTextRef.current).trim()
          if (!text) return  // nothing to send, let onend handle restart
          sendingRef.current = true
          finalTextRef.current = ''
          interimTextRef.current = ''
          setTranscript('')
          setIsListening(false)
          activeRef.current = false
          try { recognition.stop() } catch {}
          onResultRef.current?.(text)
        }, SILENCE_AFTER_SPEECH_MS)
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return
        if (e.error === 'not-allowed') {
          clearTimeout(silenceTimerRef.current)
          activeRef.current = false
          setSupported(false)
          setIsListening(false)
          return
        }
        clearTimeout(silenceTimerRef.current)
        activeRef.current = false
        setIsListening(false)
      }

      recognition.onend = () => {
        recognitionRef.current = null
        // If we already delivered the result (sendingRef) or user stopped, don't restart
        if (!activeRef.current || sendingRef.current) return
        // Chrome ended on its own (e.g. no-speech timeout) — restart to keep listening
        setTimeout(launch, 100)
      }

      try {
        recognition.start()
      } catch {
        setTimeout(launch, 200)
      }
    }

    launch()
  }, [checkSupport])

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    activeRef.current = false
    sendingRef.current = false
    const r = recognitionRef.current
    recognitionRef.current = null
    try { r?.stop() } catch {}
    setIsListening(false)
    setTranscript('')
    finalTextRef.current = ''
    interimTextRef.current = ''
  }, [])

  const speakText = useCallback((text: string, onEnd?: () => void): void => {
    speak(text, onEnd).catch(console.error)
  }, [])

  const stopSpeakingFn = useCallback(() => stopSpeaking(), [])

  return { isListening, transcript, supported, startListening, stopListening, speakText, stopSpeakingFn }
}
