import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { memoryStore, addEntry } from "@/lib/feedback-store";

let dbAvailable: boolean | null = null; // lazy-detected

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedback, subject, board, problem, grade, answer, contact } = body;

    if (!feedback || typeof feedback !== "string" || feedback.trim().length < 1) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";
    const id = crypto.randomUUID();
    const now = new Date();
    const entryData = {
      id,
      name: (name || "Anonymous").trim().slice(0, 100),
      feedback: feedback.trim().slice(0, 5000),
      ipAddress,
      userAgent: userAgent.slice(0, 500),
      subject: (subject || "").trim().slice(0, 50),
      board: (board || "").trim().slice(0, 50),
      problem: (problem || "").trim().slice(0, 500),
      grade: (grade || "").trim().slice(0, 10),
      answer: (answer || "").trim().slice(0, 500),
      contact: (contact || "").trim().slice(0, 100),
      createdAt: now,
    };

    // Try Prisma first (works locally with SQLite)
    if (dbAvailable !== false) {
      try {
        await db.feedback.create({ data: entryData });
        dbAvailable = true;
        return NextResponse.json({ success: true, id });
      } catch (err) {
        console.warn("[feedback] Prisma write failed, using in-memory fallback:", err);
        dbAvailable = false;
      }
    }

    // Fallback: in-memory store (works on Vercel warm instances)
    addEntry(entryData);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Try Prisma first
    if (dbAvailable !== false) {
      try {
        const entries = await db.feedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        const total = await db.feedback.count();
        dbAvailable = true;
        return NextResponse.json({ entries, total });
      } catch {
        dbAvailable = false;
      }
    }

    // Fallback: return from memory store
    return NextResponse.json({
      entries: memoryStore.slice(0, 50),
      total: memoryStore.length,
    });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Failed to read feedback" }, { status: 500 });
  }
}
