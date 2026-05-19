import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'no text' }, { status: 400 })

    const response = await (groq.audio.speech as any).create({
      model: 'canopylabs/orpheus-v1-english',
      voice: 'diana',
      input: text,
      response_format: 'wav',
    })

    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[tts]', err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
