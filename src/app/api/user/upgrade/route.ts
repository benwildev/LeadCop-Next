import { NextRequest, NextResponse } from "next/server";
import { db, upgradeRequestsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { sendUpgradeRequestNotification } from "@/lib/backend/email";

const upgradeSchema = z.object({
  plan: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = upgradeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { plan, note } = result.data;

    await db.insert(upgradeRequestsTable).values({
      userId: user.id,
      planRequested: plan as any,
      note: note || null,
      status: "PENDING",
    });

    // Fire-and-forget email notifications
    const [userData] = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (userData) {
      sendUpgradeRequestNotification({
        userEmail: userData.email,
        userName: userData.name,
        plan,
        note: note || null,
      }).catch(() => {});
    }

    return NextResponse.json({ message: "Upgrade request submitted successfully. We will review it shortly." });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
