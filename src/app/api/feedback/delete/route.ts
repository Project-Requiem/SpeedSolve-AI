import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    await db.feedback.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback delete error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}