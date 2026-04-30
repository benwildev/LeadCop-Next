import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [userData] = await db
      .select({ blockFreeEmails: usersTable.blockFreeEmails })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ blockFreeEmails: userData.blockFreeEmails });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateSettingsSchema = z.object({
  blockFreeEmails: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = updateSettingsSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

    await db
      .update(usersTable)
      .set({ blockFreeEmails: result.data.blockFreeEmails })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ blockFreeEmails: result.data.blockFreeEmails });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
