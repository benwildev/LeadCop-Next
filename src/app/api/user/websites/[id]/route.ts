import { NextRequest, NextResponse } from "next/server";
import { db, userWebsitesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: websiteIdStr } = await params;
  const id = parseInt(websiteIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [website] = await db
      .select()
      .from(userWebsitesTable)
      .where(and(eq(userWebsitesTable.id, id), eq(userWebsitesTable.userId, user.id)))
      .limit(1);

    if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

    await db.delete(userWebsitesTable).where(eq(userWebsitesTable.id, id));
    return NextResponse.json({ message: "Domain removed" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
