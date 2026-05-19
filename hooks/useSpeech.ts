'use client'

import { useRef, useState, useCallback } from 'react'
import { startWhisperSTT, speak, stopSpeaking, type STTSession } from '@/lib/speech'

export function useSpeech() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(true)

  const sessionRef = useRef<STTSession | null>(null)

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (isListening) return
    setTranscript('')

    startWhisperSTT(
      (text) => {
        setTranscript(text)
        onResult(text)
      },
      (listening) => {
        setIsListening(listening)
        if (!listening) setTranscript('')
      },
      (err) => console.error('[stt]', err),
    ).then(session => {
      sessionRef.current = session
    })
  }, [isListening])

  const stopListening = useCallback(() => {
    sessionRef.current?.stop()
    sessionRef.current = null
    setIsListening(false)
    setTranscript('')
  }, [])

  const speakText = useCallback((text: string, onEnd?: () => void): void => {
    speak(text, onEnd).catch(console.error)
  }, [])

  const stopSpeakingFn = useCallback(() => stopSpeaking(), [])

  return { isListening, transcript, supported, startListening, stopListening, speakText, stopSpeakingFn }
}
