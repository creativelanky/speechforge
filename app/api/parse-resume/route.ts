import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    let text = ''

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any)
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '))
      }
      text = pages.join('\n')
    } else {
      text = new TextDecoder().decode(buffer)
    }

    return NextResponse.json({ text: text.trim().slice(0, 5000) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to parse file' }, { status: 500 })
  }
}
