import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllEntries } from "@/lib/feedback-store";

function toCSV(entries: any[]): string {
  if (entries.length === 0) return "";
  const headers = ["ID", "Name", "Feedback", "IP Address", "Subject", "Board", "Problem", "Grade", "Date/Time", "User Agent"];
  const rows = entries.map((e) => [
    e.id,
    e.name,
    `"${(e.feedback || "").replace(/"/g, '""')}"`,
    e.ipAddress,
    e.subject,
    e.board,
    `"${(e.problem || "").replace(/"/g, '""')}"`,
    e.grade || "",
    e.createdAt ? new Date(e.createdAt).toISOString() : "",
    `"${(e.userAgent || "").replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

let dbAvailable: boolean | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();

    let entries: any[] = [];

    // Try Prisma
    if (dbAvailable !== false) {
      try {
        entries = await db.feedback.findMany({
          orderBy: { createdAt: "desc" },
        });
        dbAvailable = true;
      } catch {
        dbAvailable = false;
      }
    }

    // Fallback: in-memory
    if (entries.length === 0 && dbAvailable === false) {
      entries = getAllEntries();
    }

    if (format === "csv") {
      const csv = toCSV(entries);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="speedsolve-feedbacks.csv"',
        },
      });
    }

    // Default: JSON download
    return new NextResponse(JSON.stringify(entries, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="speedsolve-feedbacks.json"',
      },
    });
  } catch (err) {
    console.error("Feedback download error:", err);
    return NextResponse.json({ error: "Failed to export feedback" }, { status: 500 });
  }
}
