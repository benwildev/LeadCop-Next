import { NextRequest, NextResponse } from "next/server";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { v2 as cloudinary } from "cloudinary";
import { 
  sendSupportTicketAdminNotification, 
  sendSupportTicketUserConfirmation 
} from "@/lib/backend/email";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["general", "billing", "technical", "feature"]),
  message: z.string().min(10).max(5000),
});

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

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const data = {
      subject: formData.get("subject") as string,
      category: formData.get("category") as string,
      message: formData.get("message") as string,
    };

    const result = createTicketSchema.safeParse(data);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { subject, category, message } = result.data;

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

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({ userId: user.id, subject, category })
      .returning();

    await db.insert(supportMessagesTable).values({
      ticketId: ticket.id,
      senderRole: "user",
      message,
      attachmentUrl,
      attachmentName,
    });

    // Fire-and-forget emails
    Promise.allSettled([
      sendSupportTicketAdminNotification({
        id: ticket.id,
        subject,
        category,
        userName: user.name,
        userEmail: user.email,
      }),
      sendSupportTicketUserConfirmation({
        id: ticket.id,
        subject,
        userEmail: user.email,
        userName: user.name,
      }),
    ]).catch(() => {});

    return NextResponse.json({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
