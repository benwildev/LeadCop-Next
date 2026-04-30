import { NextRequest, NextResponse } from "next/server";
import { db, planConfigsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

const createPlanConfigSchema = z.object({
  plan: z.string().min(1).max(32).regex(/^[A-Z0-9_]+$/, "Plan name must be uppercase letters, numbers, or underscores"),
  requestLimit: z.number().int().min(-1).default(100),
  dataLimit: z.number().int().min(-1).default(0),
  websiteLimit: z.number().int().min(-1).default(0),
  price: z.number().min(0).default(0),
  maxApiKeys: z.number().int().min(1).default(1),
  maxUsers: z.number().int().min(-1).default(1),
  logRetentionDays: z.number().int().min(-1).default(7),
  hasBulkValidation: z.boolean().default(false),
  bulkEmailLimit: z.number().int().min(-1).default(0),
  hasWebhooks: z.boolean().default(false),
  hasCustomBlocklist: z.boolean().default(false),
  hasAdvancedAnalytics: z.boolean().default(false),
  description: z.string().optional().default(""),
  features: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const configs = await db.select().from(planConfigsTable).orderBy(planConfigsTable.id);
    return NextResponse.json({ configs });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const body = await req.json();
    const result = createPlanConfigSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { plan, ...rest } = result.data;

    const [existing] = await db
      .select({ plan: planConfigsTable.plan })
      .from(planConfigsTable)
      .where(eq(planConfigsTable.plan, plan))
      .limit(1);

    if (existing) return NextResponse.json({ error: `Plan "${plan}" already exists` }, { status: 409 });

    const [created] = await db
      .insert(planConfigsTable)
      .values({ plan, ...rest })
      .returning();

    return NextResponse.json({ message: `Plan "${plan}" created`, config: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
