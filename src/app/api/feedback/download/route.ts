import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function toCSV(entries: any[]): string {
  if (entries.length === 0) return "";
  const headers = ["ID", "Name", "Feedback", "IP Address", "Subject", "Board", "Problem", "Date/Time", "User Agent"];
  const rows = entries.map((e) => [
    e.id,
    e.name,
    `"${(e.feedback || "").replace(/"/g, '""')}"`,
    e.ipAddress,
    e.subject,
    e.board,
    `"${(e.problem || "").replace(/"/g, '""')}"`,
    e.createdAt ? new Date(e.createdAt).toISOString() : "",
    `"${(e.userAgent || "").replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();

    const entries = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
    });

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