import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ticketIdStr } = await params;
  const id = parseInt(ticketIdStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.ticketId, id))
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
