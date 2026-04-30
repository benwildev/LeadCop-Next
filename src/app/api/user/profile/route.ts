import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });

    const updates: Record<string, any> = {};
    if (result.data.name !== undefined) updates.name = result.data.name;
    if (result.data.avatarUrl !== undefined) updates.avatarUrl = result.data.avatarUrl;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ message: "Profile updated successfully", ...updates });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
