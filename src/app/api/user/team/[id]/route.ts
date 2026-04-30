import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: memberIdStr } = await params;
  const memberId = parseInt(memberIdStr, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });

  try {
    if (user.parentId) {
      return NextResponse.json({ error: "Sub-users cannot manage the team." }, { status: 403 });
    }

    const [targetUser] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, memberId), eq(usersTable.parentId, user.id)))
      .limit(1);

    if (!targetUser) return NextResponse.json({ error: "Team member not found" }, { status: 404 });

    await db.delete(usersTable).where(eq(usersTable.id, memberId));

    return NextResponse.json({ message: "Team member removed." });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
