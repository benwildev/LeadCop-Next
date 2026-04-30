import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";
import { v2 as cloudinary } from "cloudinary";
import { sendSupportTicketAdminReplyNotification } from "@/lib/backend/email";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const replySchema = z.object({
  message: z.string().max(5000).default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: ticketIdStr } = await params;
  const ticketId = parseInt(ticketIdStr, 10);
  if (isNaN(ticketId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const formData = await req.formData();
    const data = { message: formData.get("message") as string };

    const result = replySchema.safeParse(data);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [ticket] = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    const file = formData.get("attachment") as File;
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "support-attachments" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        );
        uploadStream.end(buffer);
      });
      attachmentUrl = uploaded.secure_url;
      attachmentName = file.name;
    }

    const replyMessage = result.data.message.trim();
    if (!replyMessage && !attachmentUrl) {
      return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
    }

    const [msg] = await db.insert(supportMessagesTable).values({
      ticketId,
      senderRole: "admin",
      message: replyMessage,
      attachmentUrl,
      attachmentName,
    }).returning();

    await db.update(supportTicketsTable)
      .set({ updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticketId));

    if (ticket.userEmail && replyMessage) {
      sendSupportTicketAdminReplyNotification({
        ticketId,
        subject: ticket.subject,
        replyMessage,
        userEmail: ticket.userEmail,
        userName: ticket.userName ?? "there",
      }).catch(() => {});
    }

    return NextResponse.json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
