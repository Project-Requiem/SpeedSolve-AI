import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { memoryStore, getEntries } from "@/lib/feedback-store";

let dbAvailable: boolean | null = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const search = (searchParams.get("search") || "").trim();

    // Try Prisma
    if (dbAvailable !== false) {
      try {
        const where = search
          ? {
              OR: [
                { name: { contains: search } },
                { feedback: { contains: search } },
                { ipAddress: { contains: search } },
              ],
            }
          : {};

        const [entries, total] = await Promise.all([
          db.feedback.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.feedback.count({ where }),
        ]);
        dbAvailable = true;
        return NextResponse.json({
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          entries,
        });
      } catch {
        dbAvailable = false;
      }
    }

    // Fallback: in-memory
    const { entries, total } = getEntries({
      search: search || undefined,
      limit,
      offset: (page - 1) * limit,
    });
    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      entries,
    });
  } catch (err) {
    console.error("Feedback list error:", err);
    return NextResponse.json({ error: "Failed to read feedback" }, { status: 500 });
  }
}
