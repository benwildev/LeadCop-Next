import { Router, Request, Response } from "express";
import multer from "multer";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/session.js";
import { uploadBuffer } from "../lib/cloudinary.js";

const router = Router();

// Proxy download endpoint — fetches the file from Cloudinary and sends it
// with the correct Content-Disposition so the browser uses the original filename
router.get("/download", requireAuth, async (req: Request, res: Response) => {
  const { url, name } = req.query as { url?: string; name?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  // Only allow Cloudinary URLs to prevent SSRF abuse
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(502).json({ error: "Failed to fetch file" });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const filename = name && typeof name === "string" ? name : "attachment";
    const safeName = filename.replace(/[^\w.\-]/g, "_");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

    const ct = upstream.headers.get("content-length");
    if (ct) res.setHeader("Content-Length", ct);

    // Stream the body
    const reader = upstream.body?.getReader();
    if (!reader) { res.status(502).end(); return; }
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        if (!res.write(value)) await new Promise(r => res.once("drain", r));
      }
    };
    await pump();
  } catch {
    res.status(502).json({ error: "Download failed" });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|txt|doc|docx|csv|zip)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["general", "billing", "technical", "feature"]),
  message: z.string().min(10).max(5000),
});

const replySchema = z.object({
  message: z.string().min(0).max(5000).default(""),
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

router.get("/tickets", requireAuth, async (req: Request, res: Response) => {
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
    .where(eq(supportTicketsTable.userId, req.userId!))
    .orderBy(desc(supportTicketsTable.updatedAt));

  res.json({
    tickets: tickets.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

router.post("/tickets", requireAuth, upload.single("attachment"), async (req: Request, res: Response) => {
  let body: { subject?: unknown; category?: unknown; message?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const result = createTicketSchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { subject, category, message } = result.data;

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  if (req.file) {
    try {
      const uploaded = await uploadBuffer(req.file.buffer, { folder: "support-attachments" });
      attachmentUrl = uploaded.url;
      attachmentName = req.file.originalname;
    } catch {
      res.status(500).json({ error: "File upload failed" });
      return;
    }
  }

  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({ userId: req.userId!, subject, category })
    .returning();

  await db.insert(supportMessagesTable).values({
    ticketId: ticket.id,
    senderRole: "user",
    message,
    attachmentUrl,
    attachmentName,
  });

  res.status(201).json({
    ticket: {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
  });
});

router.get("/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, req.userId!)))
    .limit(1);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, id))
    .orderBy(supportMessagesTable.createdAt);

  res.json({
    ticket: {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
    messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

router.post("/tickets/:id/messages", requireAuth, upload.single("attachment"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  let body: { message?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    body = {};
  }

  const result = replySchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  if (!result.data.message.trim() && !req.file) {
    res.status(400).json({ error: "Message or attachment required" });
    return;
  }

  const [ticket] = await db
    .select({ id: supportTicketsTable.id })
    .from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, req.userId!)))
    .limit(1);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  if (req.file) {
    try {
      const uploaded = await uploadBuffer(req.file.buffer, { folder: "support-attachments" });
      attachmentUrl = uploaded.url;
      attachmentName = req.file.originalname;
    } catch {
      res.status(500).json({ error: "File upload failed" });
      return;
    }
  }

  const [msg] = await db.insert(supportMessagesTable).values({
    ticketId: id,
    senderRole: "user",
    message: result.data.message.trim(),
    attachmentUrl,
    attachmentName,
  }).returning();

  await db.update(supportTicketsTable)
    .set({ updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  res.status(201).json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } });
});

router.get("/admin/tickets", requireAdmin, async (_req: Request, res: Response) => {
  const tickets = await db
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
    .orderBy(desc(supportTicketsTable.updatedAt));

  res.json({
    tickets: tickets.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

router.get("/admin/tickets/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

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
    .where(eq(supportTicketsTable.id, id))
    .limit(1);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, id))
    .orderBy(supportMessagesTable.createdAt);

  res.json({
    ticket: {
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
    messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

router.put("/admin/tickets/:id/status", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [existing] = await db
    .select({ id: supportTicketsTable.id })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  await db.update(supportTicketsTable)
    .set({ status: result.data.status, updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  res.json({ ok: true });
});

router.post("/admin/tickets/:id/reply", requireAdmin, upload.single("attachment"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  let body: { message?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    body = {};
  }

  const result = replySchema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  if (!result.data.message.trim() && !req.file) {
    res.status(400).json({ error: "Message or attachment required" });
    return;
  }

  const [ticket] = await db
    .select({ id: supportTicketsTable.id })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id))
    .limit(1);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  if (req.file) {
    try {
      const uploaded = await uploadBuffer(req.file.buffer, { folder: "support-attachments" });
      attachmentUrl = uploaded.url;
      attachmentName = req.file.originalname;
    } catch {
      res.status(500).json({ error: "File upload failed" });
      return;
    }
  }

  const [msg] = await db.insert(supportMessagesTable).values({
    ticketId: id,
    senderRole: "admin",
    message: result.data.message.trim(),
    attachmentUrl,
    attachmentName,
  }).returning();

  await db.update(supportTicketsTable)
    .set({ updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  res.status(201).json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } });
});

export default router;
