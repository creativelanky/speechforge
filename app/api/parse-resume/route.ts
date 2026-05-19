import { NextResponse } from 'next/server'
// pdf-parse is CJS-only; use require to avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else {
      text = new TextDecoder().decode(buffer)
    }

    // Trim to avoid ballooning the system prompt
    return NextResponse.json({ text: text.trim().slice(0, 5000) })
  } catch {
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
