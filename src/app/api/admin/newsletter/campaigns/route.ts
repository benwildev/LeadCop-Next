import { NextRequest, NextResponse } from "next/server";
import { db, newsletterCampaignsTable } from "@/lib/db";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

const createCampaignSchema = z.object({
  subject: z.string().min(1).max(255),
  previewText: z.string().max(255).optional().nullable(),
  htmlContent: z.string().min(1),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const campaigns = await db
      .select()
      .from(newsletterCampaignsTable)
      .orderBy(desc(newsletterCampaignsTable.createdAt));

    return NextResponse.json({ 
      campaigns: campaigns.map((c: any) => ({
        ...c,
        sentAt: c.sentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })) 
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const body = await req.json();
    const result = createCampaignSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [campaign] = await db
      .insert(newsletterCampaignsTable)
      .values({ ...result.data, updatedAt: new Date() })
      .returning();

    return NextResponse.json({
      ...campaign,
      sentAt: null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
