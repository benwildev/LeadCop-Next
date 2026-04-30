import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";
import { generateApiKey } from "@/lib/backend/auth";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const newKey = generateApiKey();

    await db
      .update(usersTable)
      .set({ apiKey: newKey })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ apiKey: newKey, message: "API key regenerated successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
