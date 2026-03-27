import { useState, useRef, useCallback } from 'react'

// Browser SpeechRecognition API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  transcript: string
  startListening(): void
  stopListening(): void
  clearTranscript(): void
}

export function useSpeechRecognition(lang = 'fr-FR'): UseSpeechRecognitionReturn {
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null

  const isSupported = SpeechRecognitionClass !== null

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // Accumulates the committed (final) text so interim results don't duplicate it
  const committedRef = useRef('')

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass || isListening) return

    const recognition = new SpeechRecognitionClass()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          committedRef.current += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(committedRef.current + interim)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'aborted') console.warn('SpeechRecognition error:', e.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    committedRef.current = ''
    setTranscript('')
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [SpeechRecognitionClass, isListening, lang])

  const clearTranscript = useCallback(() => {
    committedRef.current = ''
    setTranscript('')
  }, [])

  return { isSupported, isListening, transcript, startListening, stopListening, clearTranscript }
}
