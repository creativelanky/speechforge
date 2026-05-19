import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { SCORING_PROMPT } from '@/lib/anthropic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(req: NextRequest) {
  const { messages, scenarioType, scenarioTitle } = await req.json()

  if (!messages || messages.length < 2) {
    return NextResponse.json({ error: 'Not enough conversation to score' }, { status: 400 })
  }

  const conversationText = messages
    .map((m: any) => `${m.role === 'user' ? 'USER' : 'AI COACH'}: ${m.content}`)
    .join('\n\n')

  const prompt = SCORING_PROMPT.replace('{scenario_type}', `${scenarioTitle} (${scenarioType})`)

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n---CONVERSATION---\n\n${conversationText}`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse score response' }, { status: 500 })
    }

    const scores = JSON.parse(jsonMatch[0])
    return NextResponse.json(scores)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
