import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: ticketIdStr } = await params;
  const ticketId = parseInt(ticketIdStr, 10);
  if (isNaN(ticketId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [ticket] = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
        userId: supportTicketsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.ticketId, ticketId))
      .orderBy(supportMessagesTable.createdAt);

    return NextResponse.json({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
      messages: messages.map((m: any) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
