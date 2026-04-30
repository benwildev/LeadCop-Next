import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";
import { sendSupportTicketStatusChangeNotification } from "@/lib/backend/email";

const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  notify: z.boolean().optional().default(true),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: ticketIdStr } = await params;
  const ticketId = parseInt(ticketIdStr, 10);
  if (isNaN(ticketId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const result = updateStatusSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const [existing] = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await db.update(supportTicketsTable)
      .set({ status: result.data.status, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticketId));

    if (existing.userEmail && existing.status !== result.data.status && result.data.notify) {
      sendSupportTicketStatusChangeNotification({
        ticketId,
        subject: existing.subject,
        newStatus: result.data.status,
        userEmail: existing.userEmail,
        userName: existing.userName ?? "there",
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
