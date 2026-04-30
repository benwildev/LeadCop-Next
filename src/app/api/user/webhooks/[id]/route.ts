import { NextRequest, NextResponse } from "next/server";
import { db, webhooksTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  secret: z.string().max(256).nullable().optional(),
  enabled: z.boolean().optional(),
  events: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: webhookIdStr } = await params;
  const id = parseInt(webhookIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, user.id)))
      .limit(1);

    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const body = await req.json();
    const result = updateWebhookSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid update data" }, { status: 400 });

    const updates: Record<string, any> = {};
    if (result.data.url !== undefined) updates.url = result.data.url;
    if (result.data.secret !== undefined) updates.secret = result.data.secret;
    if (result.data.enabled !== undefined) updates.enabled = result.data.enabled;
    if (result.data.events !== undefined) updates.events = result.data.events;

    const [updated] = await db
      .update(webhooksTable)
      .set(updates)
      .where(eq(webhooksTable.id, id))
      .returning();

    return NextResponse.json({
      webhook: {
        ...updated,
        secret: updated.secret ? `${updated.secret.slice(0, 4)}${"*".repeat(12)}` : null,
        createdAt: updated.createdAt.toISOString(),
      },
      message: "Webhook updated",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: webhookIdStr } = await params;
  const id = parseInt(webhookIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, user.id)))
      .limit(1);

    if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    await db.delete(webhooksTable).where(eq(webhooksTable.id, id));
    return NextResponse.json({ message: "Webhook deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
