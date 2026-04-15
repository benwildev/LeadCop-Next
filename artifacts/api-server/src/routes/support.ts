import { Router, Request, Response } from "express";
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/session.js";

const router = Router();

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.enum(["general", "billing", "technical", "feature"]),
  message: z.string().min(10).max(5000),
});

const replySchema = z.object({
  message: z.string().min(1).max(5000),
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

router.post("/tickets", requireAuth, async (req: Request, res: Response) => {
  const result = createTicketSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { subject, category, message } = result.data;

  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({ userId: req.userId!, subject, category })
    .returning();

  await db.insert(supportMessagesTable).values({
    ticketId: ticket.id,
    senderRole: "user",
    message,
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

router.post("/tickets/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const result = replySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
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

  const [msg] = await db.insert(supportMessagesTable).values({
    ticketId: id,
    senderRole: "user",
    message: result.data.message,
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

router.post("/admin/tickets/:id/reply", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const result = replySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
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

  const [msg] = await db.insert(supportMessagesTable).values({
    ticketId: id,
    senderRole: "admin",
    message: result.data.message,
  }).returning();

  await db.update(supportTicketsTable)
    .set({ updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  res.status(201).json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } });
});

export default router;
