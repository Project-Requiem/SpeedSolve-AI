import { NextRequest, NextResponse } from 'next/server'

// ── Enhanced OCR prompts for math/science extraction ──
const MATH_OCR_PROMPT = `You are an expert OCR system for Indian competitive exam questions (JEE, NEET, CBSE, ICSE, KCET).

CRITICAL RULES:
1. Extract ALL text/math/numbers EXACTLY as written in the image
2. For math: use standard notation — write fractions as a/b, powers as x^2, square roots as sqrt(x), etc.
3. Preserve ALL numbers, units, chemical formulas, and special symbols
4. If there are MULTIPLE questions, separate them with a blank line and number them as Q1, Q2, etc.
5. For chemical equations, preserve subscripts (write H2SO4, not H2SO₄)
6. For matrices, write them as [[a,b],[c,d]] format
7. For integrals, write ∫ f(x) dx
8. For limits, write lim(x→a) f(x)
9. For derivatives, write d/dx f(x) or f'(x)
10. Return ONLY the extracted content — no explanations, no commentary
11. If the image contains a diagram/figure, describe it briefly in [brackets] at the end

Extract now:`

const PDF_CLEAN_PROMPT = `You are given raw text extracted from a PDF of an exam paper. Your job:
1. Clean up any OCR artifacts or garbled text
2. If there are multiple questions, separate them clearly with "Q1.", "Q2." etc.
3. Fix any broken math notation (e.g. "x2" → "x^2", "2x" stays as is)
4. Preserve ALL numbers, equations, and formulas exactly
5. Remove headers/footers/page numbers that are not part of questions
6. Return ONLY the cleaned question text — nothing else`

// ── Split text into individual questions ──
function splitQuestions(text: string): { questions: string[]; primary: string } {
  // Try to split on question patterns
  const splits = text.split(/\n\s*(?:Q\d+\.?|\d+\.|\(\d+\)|Question\s*\d+)/i)
  const questions = splits.map(s => s.trim()).filter(s => s.length > 10)

  if (questions.length > 1) {
    // Return the first question as primary, rest as additional
    return { questions, primary: questions[0] }
  }
  return { questions: [text], primary: text }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    // ── Helper: Vision OCR via Gemini ──
    async function visionOCR(imgBase64: string, mimeType: string): Promise<string | null> {
      const geminiKey = process.env.GEMINI_API_KEY
      if (!geminiKey) return null

      for (const model of ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']) {
        try {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey: geminiKey })
          const response = await ai.models.generateContent({
            model,
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: imgBase64 } },
                { text: MATH_OCR_PROMPT },
              ],
            }],
          })
          const text = (response.text || '').trim()
          if (text && text.length > 2) return text
        } catch (err: any) {
          console.warn(`[extract] Gemini ${model} vision failed: ${err?.message?.slice(0, 120)}`)
        }
      }
      return null
    }

    // ── Helper: Vision OCR via Groq ──
    async function visionOCRGroq(imgBase64: string, mimeType: string): Promise<string | null> {
      const groqKey = process.env.GROQ_API_KEY
      if (!groqKey) return null

      const models = [
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
      ]
      for (const model of models) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imgBase64}` } },
                  { type: 'text', text: MATH_OCR_PROMPT },
                ],
              }],
              max_tokens: 4096,
              temperature: 0.05,
            }),
            signal: AbortSignal.timeout(45000),
          })
          if (!res.ok) continue
          const data = await res.json()
          const text = data?.choices?.[0]?.message?.content?.trim() || ''
          if (text && text.length > 2) return text
        } catch (err: any) {
          console.warn(`[extract] Groq ${model} vision failed: ${err?.message?.slice(0, 120)}`)
        }
      }
      return null
    }

    // ── Helper: Clean PDF text via AI ──
    async function cleanPDFText(rawText: string): Promise<string> {
      // If text looks clean enough (has numbers and reasonable structure), use as-is
      const hasNumbers = /\d/.test(rawText)
      const hasMath = /[=+\-*/^(){}\[\]∫∑∂√π∞]/.test(rawText)
      if (hasNumbers && rawText.length > 20) {
        // Quick check: if it looks like real question text, return directly
        const lines = rawText.split('\n').filter(l => l.trim().length > 0)
        if (lines.length >= 1 && (hasMath || lines.some(l => /\?|find|calculate|solve|determine|evaluate|prove|show/i.test(l)))) {
          return rawText
        }
      }

      // Otherwise, try AI cleanup
      const geminiKey = process.env.GEMINI_API_KEY
      if (!geminiKey) return rawText

      try {
        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey: geminiKey })
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${PDF_CLEAN_PROMPT}\n\n---RAW TEXT---\n${rawText}` }] }],
        })
        return (response.text || rawText).trim()
      } catch {
        return rawText
      }
    }

    // ── PDF extraction ──
    if (fileName.endsWith('.pdf')) {
      let text = ''

      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = (data.text || '').trim()
      } catch (err) {
        console.warn('[extract] pdf-parse failed, will try vision OCR:', err)
      }

      text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

      // If text extraction succeeded, clean it
      if (text && text.length >= 10) {
        const cleaned = await cleanPDFText(text)
        const { questions, primary } = splitQuestions(cleaned)
        return NextResponse.json({
          text: primary,
          type: 'pdf',
          questions: questions.length > 1 ? questions : undefined,
          questionCount: questions.length,
        })
      }

      // If text extraction failed, try vision OCR on first page
      console.log('[extract] PDF text extraction insufficient, attempting vision OCR...')

      // Try Gemini native PDF reading first (most reliable for scanned PDFs)
      try {
        const pdfBase64 = buffer.toString('base64')
        const pdfText = await visionOCR(pdfBase64, 'application/pdf')
        if (pdfText) {
          console.log(`[extract] Gemini native PDF read succeeded: ${pdfText.length} chars`)
          const { questions, primary } = splitQuestions(pdfText)
          return NextResponse.json({ text: primary, type: 'pdf-native', questions: questions.length > 1 ? questions : undefined, questionCount: questions.length })
        }
      } catch (err: any) {
        console.warn('[extract] Gemini native PDF read failed:', err?.message?.slice(0, 100))
      }

      // Try canvas-based rendering + OCR
      try {
        const { createCanvas } = await import('canvas')
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLib.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/legacy/build/pdf.worker.mjs').then(m => m.default || '')

        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
        const allPagesText: string[] = []
        const maxPages = Math.min(doc.numPages, 5) // Max 5 pages

        for (let p = 1; p <= maxPages; p++) {
          const page = await doc.getPage(p)
          const viewport = page.getViewport({ scale: 2 })
          const canvas = createCanvas(viewport.width, viewport.height)
          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise
          const imgBase64 = canvas.toDataURL('image/png').split(',')[1]

          const ocrText = await visionOCR(imgBase64, 'image/png') || await visionOCRGroq(imgBase64, 'image/png')
          if (ocrText) {
            allPagesText.push(ocrText)
            console.log(`[extract] Page ${p} OCR: ${ocrText.length} chars`)
          }
        }

        if (allPagesText.length > 0) {
          const combined = allPagesText.join('\n\n')
          const { questions, primary } = splitQuestions(combined)
          return NextResponse.json({ text: primary, type: 'pdf-ocr', questions: questions.length > 1 ? questions : undefined, questionCount: questions.length })
        }
      } catch (err: any) {
        console.warn('[extract] PDF vision OCR failed (canvas/pdfjs not available):', err?.message?.slice(0, 100))
      }

      return NextResponse.json({ error: 'Could not extract text from this PDF. It may be a scanned/image-based PDF. Try taking a screenshot of the question instead.' }, { status: 422 })
    }

    // ── Image extraction ──
    if (fileName.match(/\.(png|jpe?g|webp|bmp|gif|heic|heif)$/)) {
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'

      // Try both OCR engines in parallel for speed
      const [geminiResult, groqResult] = await Promise.allSettled([
        visionOCR(base64, mimeType),
        visionOCRGroq(base64, mimeType),
      ])

      const text =
        (geminiResult.status === 'fulfilled' ? geminiResult.value : null) ||
        (groqResult.status === 'fulfilled' ? groqResult.value : null)

      if (text) {
        const { questions, primary } = splitQuestions(text)
        return NextResponse.json({
          text: primary,
          type: 'image',
          questions: questions.length > 1 ? questions : undefined,
          questionCount: questions.length,
        })
      }

      return NextResponse.json({
        error: 'Could not extract text from this image. Please ensure the image is clear and contains readable text. You can also try typing the question directly.',
      }, { status: 422 })
    }

    return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image (PNG/JPG/WebP/HEIC).' }, { status: 400 })
  } catch (err) {
    console.error('Extract API error:', err)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
