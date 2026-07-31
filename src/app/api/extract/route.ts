import { NextRequest, NextResponse } from 'next/server'

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

      const visionPrompt = 'Extract ALL the mathematical/numerical/textual content from this image. Return ONLY the extracted text, preserving mathematical notation, equations, numbers, units, and chemical formulas exactly as written. Do not add explanations or extra text.'

      for (const model of ['gemini-2.0-flash', 'gemini-2.5-pro']) {
        try {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey: geminiKey })
          const response = await ai.models.generateContent({
            model,
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: imgBase64 } },
                { text: visionPrompt },
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

      const visionPrompt = 'Extract ALL the mathematical/numerical/textual content from this image. Return ONLY the extracted text, preserving mathematical notation, equations, numbers, units, and chemical formulas exactly as written. Do not add explanations or extra text.'

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
                  { type: 'text', text: visionPrompt },
                ],
              }],
              max_tokens: 2048,
              temperature: 0.1,
            }),
            signal: AbortSignal.timeout(30000),
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

      // If text extraction failed or got too little, try vision OCR on first page
      if (!text || text.length < 10) {
        console.log('[extract] PDF text extraction insufficient, attempting vision OCR...')
        // Convert PDF first page to PNG using canvas
        try {
          // Try to render PDF to image for OCR
          const { createCanvas } = await import('canvas')
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
          pdfjsLib.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/legacy/build/pdf.worker.mjs').then(m => m.default || '')

          const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
          const page = await doc.getPage(1)
          const viewport = page.getViewport({ scale: 2 })
          const canvas = createCanvas(viewport.width, viewport.height)
          const ctx = canvas.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise
          const imgBase64 = canvas.toDataURL('image/png').split(',')[1]

          const ocrText = await visionOCR(imgBase64, 'image/png') || await visionOCRGroq(imgBase64, 'image/png')
          if (ocrText) {
            console.log(`[extract] Vision OCR succeeded: ${ocrText.length} chars`)
            return NextResponse.json({ text: ocrText, type: 'pdf-ocr' })
          }
        } catch (err: any) {
          console.warn('[extract] PDF vision OCR failed (canvas/pdfjs not available):', err?.message?.slice(0, 100))
        }

        // Last resort: send raw PDF bytes to Gemini (Gemini can natively read PDFs)
        try {
          const pdfBase64 = buffer.toString('base64')
          const pdfText = await visionOCR(pdfBase64, 'application/pdf')
          if (pdfText) {
            console.log(`[extract] Gemini native PDF read succeeded: ${pdfText.length} chars`)
            return NextResponse.json({ text: pdfText, type: 'pdf-native' })
          }
        } catch (err: any) {
          console.warn('[extract] Gemini native PDF read failed:', err?.message?.slice(0, 100))
        }

        return NextResponse.json({ error: 'Could not extract text from this PDF. It may be a scanned/image-based PDF and vision OCR is unavailable. Try taking a screenshot of the question instead.' }, { status: 422 })
      }

      return NextResponse.json({ text, type: 'pdf' })
    }

    // ── Image extraction ──
    if (fileName.match(/\.(png|jpe?g|webp|bmp|gif)$/)) {
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'

      const text = await visionOCR(base64, mimeType) || await visionOCRGroq(base64, mimeType)
      if (text) {
        return NextResponse.json({ text, type: 'image' })
      }

      return NextResponse.json({
        error: 'Could not extract text from this image. Please ensure the image is clear and contains readable text. You can also try typing the question directly.',
      }, { status: 422 })
    }

    return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image (PNG/JPG/WebP).' }, { status: 400 })
  } catch (err) {
    console.error('Extract API error:', err)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
