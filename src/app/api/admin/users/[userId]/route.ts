import { NextRequest, NextResponse } from "next/server";
import { 
  db, 
  usersTable, 
  apiUsageTable, 
  upgradeRequestsTable, 
  userWebsitesTable, 
  userPagesTable,
  planConfigsTable
} from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";
import { getPlanConfig, generateApiKey } from "@/lib/backend/auth";

const updatePlanSchema = z.object({
  plan: z.string().min(1).max(32).optional(),
  requestLimit: z.number().int().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = updatePlanSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { plan, requestLimit } = result.data;
    const updateData: any = {};

    if (plan) {
      const [planExists] = await db
        .select({ plan: planConfigsTable.plan })
        .from(planConfigsTable)
        .where(eq(planConfigsTable.plan, plan))
        .limit(1);

      if (!planExists) return NextResponse.json({ error: `Plan "${plan}" does not exist` }, { status: 400 });

      const config = await getPlanConfig(plan);
      updateData.plan = plan;
      updateData.requestLimit = config.requestLimit;
      updateData.requestCount = 0;
    }

    if (requestLimit !== undefined) updateData.requestLimit = requestLimit;

    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

    return NextResponse.json({ message: "User updated", ...updateData });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { userId: userIdStr } = await params;
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  try {
    await db.delete(apiUsageTable).where(eq(apiUsageTable.userId, userId));
    await db.delete(upgradeRequestsTable).where(eq(upgradeRequestsTable.userId, userId));
    await db.delete(userWebsitesTable).where(eq(userWebsitesTable.userId, userId));
    await db.delete(userPagesTable).where(eq(userPagesTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
