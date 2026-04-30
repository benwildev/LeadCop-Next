import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribersTable } from "@/lib/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const subscribers = await db
      .select()
      .from(newsletterSubscribersTable)
      .orderBy(desc(newsletterSubscribersTable.subscribedAt));

    const [activeCount] = await db
      .select({ count: count() })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.status, "ACTIVE"));

    return NextResponse.json({
      subscribers: subscribers.map((s: any) => ({
        ...s,
        subscribedAt: s.subscribedAt.toISOString(),
        unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
      })),
      total: subscribers.length,
      activeCount: Number(activeCount?.count ?? 0),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (isNaN(id) || id <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const deleted = await db
      .delete(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.id, id))
      .returning();

    if (deleted.length === 0) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });

    return NextResponse.json({ message: "Subscriber removed" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
