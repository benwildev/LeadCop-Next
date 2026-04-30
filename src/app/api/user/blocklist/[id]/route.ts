import { NextRequest, NextResponse } from "next/server";
import { db, customBlocklistTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entryIdStr } = await params;
  const id = parseInt(entryIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [entry] = await db
      .select()
      .from(customBlocklistTable)
      .where(and(eq(customBlocklistTable.id, id), eq(customBlocklistTable.userId, user.id)))
      .limit(1);

    if (!entry) return NextResponse.json({ error: "Blocklist entry not found" }, { status: 404 });

    await db.delete(customBlocklistTable).where(eq(customBlocklistTable.id, id));
    return NextResponse.json({ message: "Domain removed from blocklist" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
