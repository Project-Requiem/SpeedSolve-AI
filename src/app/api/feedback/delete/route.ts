import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteEntry } from "@/lib/feedback-store";

let dbAvailable: boolean | null = null;

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Try Prisma
    if (dbAvailable !== false) {
      try {
        await db.feedback.delete({ where: { id } });
        dbAvailable = true;
        return NextResponse.json({ success: true });
      } catch {
        dbAvailable = false;
      }
    }

    // Fallback: in-memory
    const deleted = deleteEntry(id);
    if (deleted) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("Feedback delete error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
