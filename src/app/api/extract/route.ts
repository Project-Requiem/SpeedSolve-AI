import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()

    // PDF extraction
    if (fileName.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      let text = ''

      try {
        // Dynamic import for pdf-parse (CJS module)
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

      // Clean up excessive whitespace
      text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

      return NextResponse.json({ text, type: 'pdf' })
    }

    // Image extraction using Gemini Vision API
    if (fileName.match(/\.(png|jpe?g|webp|bmp|gif)$/)) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = file.type || 'image/jpeg'

      const apiKey = process.env.GEMINI_API_KEY
      const groqKey = process.env.GROQ_API_KEY

      // Try Gemini first
      if (apiKey && !apiKey.startsWith('AQ.')) {
        try {
          const { GoogleGenAI } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey })
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64,
                    },
                  },
                  {
                    text: 'Extract ALL the mathematical/numerical text from this image. Return ONLY the extracted text, preserving mathematical notation, equations, numbers, and units exactly as written. Do not add explanations or extra text.',
                    },
                ],
              },
            ],
          })
          const text = (response.text || '').trim()
          if (text && text.length > 2) {
            return NextResponse.json({ text, type: 'image' })
          }
        } catch (err) {
          console.error('Gemini vision error:', err)
        }
      }

      // Fallback: Groq vision (llama-4-scout has vision)
      if (groqKey) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: `data:${mimeType};base64,${base64}` },
                    },
                    {
                      type: 'text',
                      text: 'Extract ALL the mathematical/numerical text from this image. Return ONLY the extracted text, preserving mathematical notation, equations, numbers, and units exactly as written. Do not add explanations.',
                    },
                  ],
                },
              ],
              max_tokens: 1024,
              temperature: 0.1,
            }),
          })
          const data = await res.json()
          const text = data?.choices?.[0]?.message?.content?.trim() || ''
          if (text && text.length > 2) {
            return NextResponse.json({ text, type: 'image' })
          }
        } catch (err) {
          console.error('Groq vision error:', err)
        }
      }

      return NextResponse.json({ error: 'Could not extract text from this image. No vision API keys configured.' }, { status: 422 })
    }

    return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image (PNG/JPG/WebP).' }, { status: 400 })
  } catch (err) {
    console.error('Extract API error:', err)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
