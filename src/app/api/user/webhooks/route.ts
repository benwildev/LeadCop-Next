import { NextRequest, NextResponse } from "next/server";
import { db, webhooksTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    if (!planConfig.hasWebhooks) {
      return NextResponse.json({ webhooks: [], total: 0, canCreate: false, planRequired: "PRO" });
    }

    const webhooks = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.userId, user.id))
      .orderBy(webhooksTable.createdAt);

    return NextResponse.json({
      webhooks: webhooks.map((w: any) => ({
        ...w,
        secret: w.secret ? `${w.secret.slice(0, 4)}${"*".repeat(12)}` : null,
        createdAt: w.createdAt.toISOString(),
      })),
      total: webhooks.length,
      canCreate: true,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().max(256).optional(),
  enabled: z.boolean().optional(),
  events: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    if (!planConfig.hasWebhooks) {
      return NextResponse.json({
        error: "Webhooks (Custom Integrations) are a PRO plan feature. Please upgrade to unlock.",
        planRequired: "PRO",
      }, { status: 403 });
    }

    const body = await req.json();
    const result = createWebhookSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });

    const { url, secret, enabled, events } = result.data;

    const [inserted] = await db
      .insert(webhooksTable)
      .values({
        userId: user.id,
        url,
        secret: secret ?? null,
        enabled: enabled ?? true,
        events: events ?? ["email.detected"],
      })
      .returning();

    return NextResponse.json({
      webhook: {
        ...inserted,
        secret: inserted.secret ? `${inserted.secret.slice(0, 4)}${"*".repeat(12)}` : null,
        createdAt: inserted.createdAt.toISOString(),
      },
      message: "Webhook created",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
