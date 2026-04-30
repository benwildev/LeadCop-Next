import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, upgradeRequestsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";
import { sendUpgradeDecisionNotification } from "@/lib/backend/email";

const updateUpgradeSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]).optional(),
  note: z.string().optional(),
  objectPath: z.string().optional(),
  fileName: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: requestIdStr } = await params;
  const requestId = parseInt(requestIdStr, 10);
  if (isNaN(requestId)) return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = updateUpgradeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { status, note, objectPath, fileName } = result.data;

    const [upgradeReq] = await db
      .select()
      .from(upgradeRequestsTable)
      .where(eq(upgradeRequestsTable.id, requestId))
      .limit(1);

    if (!upgradeReq) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "APPROVED") {
        updateData.approvedAt = new Date();
      }
    }
    if (note !== undefined) updateData.note = note || upgradeReq.note;
    if (objectPath) {
      updateData.invoiceKey = objectPath;
      updateData.invoiceUploadedAt = new Date();
    }
    if (fileName) {
      updateData.invoiceFileName = fileName;
    }

    await db
      .update(upgradeRequestsTable)
      .set(updateData)
      .where(eq(upgradeRequestsTable.id, requestId));

    if (status === "APPROVED") {
      const config = await getPlanConfig(upgradeReq.planRequested ?? "FREE");
      await db
        .update(usersTable)
        .set({ 
          plan: upgradeReq.planRequested, 
          requestLimit: config.requestLimit, 
          requestCount: 0 
        })
        .where(eq(usersTable.id, upgradeReq.userId));
    }

    const [user] = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, upgradeReq.userId))
      .limit(1);

    if (user && status) {
      sendUpgradeDecisionNotification({
        userEmail: user.email,
        userName: user.name,
        plan: upgradeReq.planRequested ?? "FREE",
        status,
      }).catch(() => {});
    }

    return NextResponse.json({ message: "Upgrade request updated successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
