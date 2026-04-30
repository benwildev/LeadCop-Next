import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { uploadToCloudinary } from "@/lib/backend/cloudinary";

const replySchema = z.object({
  message: z.string().min(0).max(5000).default(""),
});

export async function POST(
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
      .select({ id: supportTicketsTable.id })
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const formData = await req.formData();
    const message = formData.get("message") as string;
    const attachment = formData.get("attachment") as File | null;

    if (!message?.trim() && (!attachment || attachment.size === 0)) {
      return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
    }

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      const uploaded = await uploadToCloudinary(buffer, { folder: "support-attachments", resource_type: "auto" });
      attachmentUrl = uploaded.secure_url;
      attachmentName = attachment.name;
    }

    const [msg] = await db.insert(supportMessagesTable).values({
      ticketId: id,
      senderRole: "user",
      message: message?.trim() || "",
      attachmentUrl,
      attachmentName,
    }).returning();

    await db.update(supportTicketsTable)
      .set({ updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));

    return NextResponse.json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
