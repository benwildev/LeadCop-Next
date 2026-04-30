import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, planConfigsTable } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

const updatePlanConfigSchema = z.object({
  requestLimit: z.number().int().min(-1).optional(),
  dataLimit: z.number().int().min(-1).optional(),
  websiteLimit: z.number().int().min(-1).optional(),
  price: z.number().min(0).optional(),
  maxApiKeys: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(-1).optional(),
  logRetentionDays: z.number().int().min(-1).optional(),
  hasBulkValidation: z.boolean().optional(),
  bulkEmailLimit: z.number().int().min(-1).optional(),
  hasWebhooks: z.boolean().optional(),
  hasCustomBlocklist: z.boolean().optional(),
  hasAdvancedAnalytics: z.boolean().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { plan } = await params;
  const upperPlan = plan.toUpperCase();

  try {
    const [existing] = await db
      .select({ plan: planConfigsTable.plan })
      .from(planConfigsTable)
      .where(eq(planConfigsTable.plan, upperPlan))
      .limit(1);

    if (!existing) return NextResponse.json({ error: `Plan "${upperPlan}" not found` }, { status: 404 });

    const body = await req.json();
    const result = updatePlanConfigSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const updates = result.data;
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    await db.update(planConfigsTable).set(updates).where(eq(planConfigsTable.plan, upperPlan));

    if (updates.requestLimit !== undefined) {
      await db
        .update(usersTable)
        .set({ requestLimit: updates.requestLimit })
        .where(eq(usersTable.plan, upperPlan));
    }

    const [updated] = await db.select().from(planConfigsTable).where(eq(planConfigsTable.plan, upperPlan)).limit(1);
    return NextResponse.json({ message: `Plan config for ${upperPlan} updated`, config: updated });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const PROTECTED_PLANS = ["FREE", "PRO", "ENTERPRISE"];

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { plan } = await params;
  const upperPlan = plan.toUpperCase();

  if (PROTECTED_PLANS.includes(upperPlan)) {
    return NextResponse.json({ error: `Built-in plan "${upperPlan}" cannot be deleted` }, { status: 403 });
  }

  try {
    const [existing] = await db
      .select({ plan: planConfigsTable.plan })
      .from(planConfigsTable)
      .where(eq(planConfigsTable.plan, upperPlan))
      .limit(1);

    if (!existing) return NextResponse.json({ error: `Plan "${upperPlan}" not found` }, { status: 404 });

    const [usersOnPlan] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.plan, upperPlan));

    if (Number(usersOnPlan?.count) > 0) {
      return NextResponse.json({ error: `Cannot delete plan — ${usersOnPlan.count} user(s) are currently on it` }, { status: 409 });
    }

    await db.delete(planConfigsTable).where(eq(planConfigsTable.plan, upperPlan));
    return NextResponse.json({ message: `Plan "${upperPlan}" deleted` });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
