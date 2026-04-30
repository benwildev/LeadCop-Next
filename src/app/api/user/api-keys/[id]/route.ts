import { NextRequest, NextResponse } from "next/server";
import { db, userApiKeysTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: keyIdStr } = await params;
  const id = parseInt(keyIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [apiKey] = await db
      .select()
      .from(userApiKeysTable)
      .where(and(eq(userApiKeysTable.id, id), eq(userApiKeysTable.userId, user.id)))
      .limit(1);

    if (!apiKey) return NextResponse.json({ error: "API key not found" }, { status: 404 });

    await db.delete(userApiKeysTable).where(eq(userApiKeysTable.id, id));
    return NextResponse.json({ message: "API key deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
