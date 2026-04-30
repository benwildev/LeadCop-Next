import { NextRequest, NextResponse } from "next/server";
import { db, newsletterCampaignsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

const updateCampaignSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  previewText: z.string().max(255).optional().nullable(),
  htmlContent: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: campaignIdStr } = await params;
  const campaignId = parseInt(campaignIdStr, 10);
  if (isNaN(campaignId)) return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = updateCampaignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [existing] = await db
      .select({ status: newsletterCampaignsTable.status })
      .from(newsletterCampaignsTable)
      .where(eq(newsletterCampaignsTable.id, campaignId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (existing.status === "SENT") return NextResponse.json({ error: "Cannot edit a sent campaign" }, { status: 400 });

    const [updated] = await db
      .update(newsletterCampaignsTable)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(newsletterCampaignsTable.id, campaignId))
      .returning();

    return NextResponse.json({
      ...updated,
      sentAt: updated.sentAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: campaignIdStr } = await params;
  const campaignId = parseInt(campaignIdStr, 10);
  if (isNaN(campaignId)) return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });

  try {
    const [existing] = await db
      .select({ status: newsletterCampaignsTable.status })
      .from(newsletterCampaignsTable)
      .where(eq(newsletterCampaignsTable.id, campaignId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (existing.status === "SENT") return NextResponse.json({ error: "Cannot delete a sent campaign" }, { status: 400 });

    await db.delete(newsletterCampaignsTable).where(eq(newsletterCampaignsTable.id, campaignId));
    return NextResponse.json({ message: "Campaign deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
