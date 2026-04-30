import { NextRequest, NextResponse } from "next/server";
import { db, upgradeRequestsTable } from "@/lib/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requests = await db
      .select({
        id: upgradeRequestsTable.id,
        planRequested: upgradeRequestsTable.planRequested,
        status: upgradeRequestsTable.status,
        note: upgradeRequestsTable.note,
        invoiceFileName: upgradeRequestsTable.invoiceFileName,
        invoiceUploadedAt: upgradeRequestsTable.invoiceUploadedAt,
        hasInvoice: sql<boolean>`(${upgradeRequestsTable.invoiceKey} IS NOT NULL)`,
        createdAt: upgradeRequestsTable.createdAt,
      })
      .from(upgradeRequestsTable)
      .where(and(eq(upgradeRequestsTable.userId, user.id), eq(upgradeRequestsTable.status, "APPROVED")))
      .orderBy(desc(upgradeRequestsTable.createdAt));

    return NextResponse.json({
      requests: requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        invoiceUploadedAt: r.invoiceUploadedAt ? r.invoiceUploadedAt.toISOString() : null,
      })),
      total: requests.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
