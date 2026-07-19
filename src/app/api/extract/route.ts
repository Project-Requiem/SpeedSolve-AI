import { NextRequest, NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

async function extractWithGemini(
  base64: string,
  mime: string
): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Support both old (AIzaSy) and new (AQ.) API key formats
  const url = GEMINI_KEY.startsWith("AQ.") ? baseUrl : `${baseUrl}?key=${GEMINI_KEY}`;
  if (GEMINI_KEY.startsWith("AQ.")) headers["x-goog-api-key"] = GEMINI_KEY;
  const body = {
    contents: [
      {
        parts: [
          {
            text: 'Extract ALL the text and math from this image. This is a student\'s homework/exam problem. Return ONLY the extracted text — preserve all math notation, equations, numbers, fractions, Greek letters, and units exactly as written. Use ^ for superscripts, sqrt() for square roots. Do NOT solve the problem. Do NOT add any explanation. If there are multiple problems, separate them with newlines.',
          },
          { inlineData: { mimeType: mime, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.05 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// POST /api/extract — Extract text from images (via VLM) or PDFs
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "image" | "pdf" | "camera"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (type === "pdf") {
      return await extractFromPDF(file);
    }
    // Image or camera — both use VLM with Gemini fallback
    return await extractFromImage(file);
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 }
    );
  }
}

/** Extract math/problem text from an image using Gemini Vision */
async function extractFromImage(file: File) {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mime = file.type || "image/png";

  // Use Google Gemini 2.0 Flash Vision
  const geminiText = await extractWithGemini(base64, mime);
  if (geminiText?.trim()) {
    return NextResponse.json({ text: geminiText.trim() });
  }

  return NextResponse.json(
    { error: "Could not read any text from the image" },
    { status: 422 }
  );
}

/** Extract text from a PDF file */
async function extractFromPDF(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Dynamic import to avoid bundling issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  const text = data.text?.trim();

  // If extracted text is very short, it's likely a scanned/image PDF
  if (!text || text.length < 20) {
    return NextResponse.json(
      { error: "This PDF appears to be scanned/image-based. Please use the camera or image upload instead — take a photo of the page for best results." },
      { status: 422 }
    );
  }

  return NextResponse.json({ text });
}