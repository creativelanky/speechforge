import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json()

  if (!messages || !systemPrompt) {
    return NextResponse.json({ error: 'Missing messages or systemPrompt' }, { status: 400 })
  }

  const trimmedMessages = messages.slice(-30)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          messages: [
            { role: 'system', content: systemPrompt },
            ...trimmedMessages,
          ],
          stream: true,
        })

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
          if (chunk.choices[0]?.finish_reason) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
