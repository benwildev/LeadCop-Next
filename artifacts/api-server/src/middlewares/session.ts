import { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
      userPlan?: string;
    }
  }
}

export const SESSION_COOKIE = "tempshield_session";
const sessions = new Map<string, { userId: number; expiresAt: Date }>();

export function createSession(userId: number): string {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  sessions.set(sessionId, { userId, expiresAt });
  return sessionId;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export const sessionMiddleware: RequestHandler = async (req, res, next) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];

  if (!sessionId) {
    return next();
  }

  const session = sessions.get(sessionId);

  if (!session || session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    res.clearCookie(SESSION_COOKIE);
    return next();
  }

  try {
    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role, plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (user) {
      req.userId = user.id;
      req.userRole = user.role;
      req.userPlan = user.plan;
    }
  } catch {
  }

  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.userId || req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};
