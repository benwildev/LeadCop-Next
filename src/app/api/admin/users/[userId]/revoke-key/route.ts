import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";
import { generateApiKey } from "@/lib/backend/auth";

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
    const newKey = generateApiKey();
    await db.update(usersTable).set({ apiKey: newKey }).where(eq(usersTable.id, userId));
    return NextResponse.json({ 
      message: "API key revoked and regenerated", 
      apiKey: newKey.slice(0, 8) + "••••••••••••••••••••••••" 
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
