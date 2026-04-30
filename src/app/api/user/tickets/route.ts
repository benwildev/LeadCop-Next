import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { uploadToCloudinary } from "@/lib/backend/cloudinary";
import { sendSupportTicketAdminNotification, sendSupportTicketUserConfirmation } from "@/lib/backend/email";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tickets = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, user.id))
      .orderBy(desc(supportTicketsTable.updatedAt));

    return NextResponse.json({
      tickets: tickets.map((t: any) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["general", "billing", "technical", "feature"]),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const subject = formData.get("subject") as string;
    const category = formData.get("category") as string;
    const message = formData.get("message") as string;
    const attachment = formData.get("attachment") as File | null;

    const result = createTicketSchema.safeParse({ subject, category, message });
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      const uploaded = await uploadToCloudinary(buffer, { folder: "support-attachments", resource_type: "auto" });
      attachmentUrl = uploaded.secure_url;
      attachmentName = attachment.name;
    }

    const [userData] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({ userId: user.id, subject: result.data.subject, category: result.data.category })
      .returning();

    await db.insert(supportMessagesTable).values({
      ticketId: ticket.id,
      senderRole: "user",
      message: result.data.message,
      attachmentUrl,
      attachmentName,
    });

    if (userData) {
      Promise.allSettled([
        sendSupportTicketAdminNotification({
          id: ticket.id,
          subject: result.data.subject,
          category: result.data.category,
          userName: userData.name,
          userEmail: userData.email,
        }),
        sendSupportTicketUserConfirmation({
          id: ticket.id,
          subject: result.data.subject,
          userEmail: userData.email,
          userName: userData.name,
        }),
      ]).catch(() => {});
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
