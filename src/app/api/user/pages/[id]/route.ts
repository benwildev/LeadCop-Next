import { NextRequest, NextResponse } from "next/server";
import { db, userPagesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: pageIdStr } = await params;
  const id = parseInt(pageIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [page] = await db
      .select()
      .from(userPagesTable)
      .where(and(eq(userPagesTable.id, id), eq(userPagesTable.userId, user.id)))
      .limit(1);

    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    await db.delete(userPagesTable).where(eq(userPagesTable.id, id));
    return NextResponse.json({ message: "Page removed" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
