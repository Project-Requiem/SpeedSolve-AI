import { NextRequest, NextResponse } from "next/server";

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
    // Image or camera — both use VLM
    return await extractFromImage(file);
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 }
    );
  }
}

/** Extract math/problem text from an image using VLM */
async function extractFromImage(file: File) {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mime = file.type || "image/png";

  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();

  const result = await zai.createChatCompletionVision({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Extract ALL the text and math from this image. This is a student\'s homework/exam problem. Return ONLY the extracted text — preserve all math notation, equations, numbers, and units exactly as written. Do NOT solve the problem. Do NOT add any explanation. If there are multiple problems, separate them with newlines.',
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${base64}`,
            },
          },
        ],
      },
    ],
    stream: false,
  });

  const extracted =
    result.choices?.[0]?.message?.content || "";

  if (!extracted.trim()) {
    return NextResponse.json({ error: "Could not read any text from the image" }, { status: 422 });
  }

  return NextResponse.json({ text: extracted.trim() });
}

/** Extract text from a PDF file */
async function extractFromPDF(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Dynamic import to avoid bundling issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  const text = data.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Could not extract text from PDF — it may be scanned/image-based" }, { status: 422 });
  }

  return NextResponse.json({ text });
}