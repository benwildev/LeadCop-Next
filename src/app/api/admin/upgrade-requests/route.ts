import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, upgradeRequestsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const requests = await db
      .select({
        id: upgradeRequestsTable.id,
        userId: upgradeRequestsTable.userId,
        planRequested: upgradeRequestsTable.planRequested,
        status: upgradeRequestsTable.status,
        note: upgradeRequestsTable.note,
        invoiceKey: upgradeRequestsTable.invoiceKey,
        invoiceFileName: upgradeRequestsTable.invoiceFileName,
        invoiceUploadedAt: upgradeRequestsTable.invoiceUploadedAt,
        createdAt: upgradeRequestsTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(upgradeRequestsTable)
      .leftJoin(usersTable, eq(upgradeRequestsTable.userId, usersTable.id))
      .orderBy(upgradeRequestsTable.createdAt);

    return NextResponse.json({
      requests: requests.map((r: any) => ({
        ...r,
        userName: r.userName || "Unknown",
        userEmail: r.userEmail || "Unknown",
        createdAt: r.createdAt.toISOString(),
        invoiceUploadedAt: r.invoiceUploadedAt ? r.invoiceUploadedAt.toISOString() : null,
        hasInvoice: !!r.invoiceKey,
      })),
      total: requests.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
