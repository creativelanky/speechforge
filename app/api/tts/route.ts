import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'no text' }, { status: 400 })

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',
        voice: 'Fritz-PlayAI',
        input: text,
        response_format: 'wav',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[tts] Groq error', response.status, err)
      return NextResponse.json({ error: err }, { status: 500 })
    }

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
