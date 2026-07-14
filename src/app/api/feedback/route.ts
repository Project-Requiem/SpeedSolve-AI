import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try { await fs.access(FEEDBACK_FILE); } catch {
      await fs.writeFile(FEEDBACK_FILE, "[]", "utf-8");
    }
  } catch (err) {
    console.error("Feedback file init error:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedback } = body;

    if (!feedback || typeof feedback !== "string" || feedback.trim().length < 1) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    await ensureFile();
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const entries: Array<{ id: string; name: string; feedback: string; timestamp: string; subject?: string; board?: string }> = JSON.parse(raw);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: (name || "Anonymous").trim().slice(0, 100),
      feedback: feedback.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
      subject: (body.subject || "").trim(),
      board: (body.board || "").trim(),
    };

    entries.push(entry);
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureFile();
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const entries = JSON.parse(raw);
    return NextResponse.json({ entries, count: entries.length });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Failed to read feedback" }, { status: 500 });
  }
}