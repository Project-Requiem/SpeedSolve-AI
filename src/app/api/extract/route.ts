import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()

    // ── PDF extraction ──
    if (fileName.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      let text = ''

      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = (data.text || '').trim()
      } catch (err) {
        console.error('PDF parse error:', err)
        return NextResponse.json({ error: 'Failed to parse PDF. The file may be corrupted or image-based.' }, { status: 422 })
      }

      if (!text || text.length < 3) {
        return NextResponse.json({ error: 'Could not extract text from this PDF. It may be a scanned/image-based PDF.' }, { status: 422 })
      }

      text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
      return NextResponse.json({ text, type: 'pdf' })
    }

    // ── Image extraction ──
    if (fileName.match(/\.(png|jpe?g|webp|bmp|gif)$/)) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'

      const geminiKey = process.env.GEMINI_API_KEY
      const groqKey = process.env.GROQ_API_KEY

      const visionPrompt = 'Extract ALL the mathematical/numerical text from this image. Return ONLY the extracted text, preserving mathematical notation, equations, numbers, and units exactly as written. Do not add explanations or extra text.'

      // Attempt 1: Gemini Vision (try even with AQ. key — vision might have separate quota)
      if (geminiKey) {
        for (const model of ['gemini-2.0-flash', 'gemini-2.5-pro']) {
          try {
            const { GoogleGenAI } = await import('@google/genai')
            const ai = new GoogleGenAI({ apiKey: geminiKey })
            const response = await ai.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: visionPrompt },
                  ],
                },
              ],
            })
            const text = (response.text || '').trim()
            if (text && text.length > 2) {
              return NextResponse.json({ text, type: 'image' })
            }
          } catch (err: any) {
            console.warn(`[extract] Gemini ${model} vision failed: ${err?.message?.slice(0, 120)}`)
          }
        }
      }

      // Attempt 2: Groq Vision (multiple models)
      if (groqKey) {
        const models = [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'meta-llama/llama-4-maverick-17b-128e-instruct',
        ]
        for (const model of models) {
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: 'user',
                    content: [
                      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                      { type: 'text', text: visionPrompt },
                    ],
                  },
                ],
                max_tokens: 1024,
                temperature: 0.1,
              }),
              signal: AbortSignal.timeout(30000),
            })
            if (!res.ok) {
              console.warn(`[extract] Groq ${model}: ${res.status}`)
              continue
            }
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content?.trim() || ''
            if (text && text.length > 2) {
              return NextResponse.json({ text, type: 'image' })
            }
          } catch (err: any) {
            console.warn(`[extract] Groq ${model} vision failed: ${err?.message?.slice(0, 120)}`)
          }
        }
      }

      // Both failed — tell user what to do
      return NextResponse.json({
        error: 'Could not extract text from this image. Image OCR requires a vision API key. Please add GROQ_API_KEY to your Vercel environment variables (get a free key at console.groq.com).',
      }, { status: 422 })
    }

    return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image (PNG/JPG/WebP).' }, { status: 400 })
  } catch (err) {
    console.error('Extract API error:', err)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
