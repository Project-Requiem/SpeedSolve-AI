import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getClientIP(request: NextRequest): string {
  // Check common proxy headers first
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedback, subject, board, problem } = body;

    if (!feedback || typeof feedback !== "string" || feedback.trim().length < 1) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";

    const entry = await db.feedback.create({
      data: {
        name: (name || "Anonymous").trim().slice(0, 100),
        feedback: feedback.trim().slice(0, 5000),
        ipAddress,
        userAgent: userAgent.slice(0, 500),
        subject: (subject || "").trim().slice(0, 50),
        board: (board || "").trim().slice(0, 50),
        problem: (problem || "").trim().slice(0, 500),
      },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const entries = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const total = await db.feedback.count();
    return NextResponse.json({ entries, total });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Failed to read feedback" }, { status: 500 });
  }
}