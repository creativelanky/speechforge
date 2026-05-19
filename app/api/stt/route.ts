import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  try {
    const form = await req.formData()
    const audio = form.get('audio') as File | null
    if (!audio) return NextResponse.json({ error: 'No audio' }, { status: 400 })

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
