import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  try {
    await db.update(usersTable).set({ requestCount: 0 }).where(eq(usersTable.id, userId));
    return NextResponse.json({ message: "Usage reset to zero" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
