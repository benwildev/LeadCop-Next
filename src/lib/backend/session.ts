import { cookies } from "next/headers";
import { redis } from "./redis";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export const SESSION_COOKIE = "leadcop_session_v2";
const SESSION_PREFIX = "sess:";
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionData {
  userId?: number;
  cookie?: any;
  [key: string]: any;
}

/**
 * Get session data from Redis using the session ID from cookies.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  // express-session prepends s: to the session ID if it's signed, 
  // but let's assume raw ID for now or handle the prefix if needed.
  // The original connect-redis prefix is sess:
  const rawData = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!rawData) return null;

  try {
    return JSON.parse(rawData);
  } catch (err) {
    logger.error({ err, sessionId }, "Failed to parse session data from Redis");
    return null;
  }
}

/**
 * Resolves the current user from the session.
 */
export async function getSessionUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  try {
    const [user] = await db
      .select({ 
        id: usersTable.id, 
        role: usersTable.role, 
        plan: usersTable.plan,
        email: usersTable.email,
        name: usersTable.name,
        parentId: usersTable.parentId,
        createdAt: usersTable.createdAt
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    return user || null;
  } catch (err) {
    logger.error({ err, userId: session.userId }, "Error loading user from session");
    return null;
  }
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}

/**
 * Create a new session in Redis and set the cookie.
 */
export async function createSession(userId: number) {
  const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const sessionData: SessionData = { userId };

  await redis.set(
    `${SESSION_PREFIX}${sessionId}`,
    JSON.stringify(sessionData),
    "EX",
    SESSION_TTL
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL,
    path: "/",
    sameSite: "lax",
  });

  return sessionId;
}

/**
 * Destroy the current session.
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await redis.del(`${SESSION_PREFIX}${sessionId}`);
  }

  cookieStore.delete(SESSION_COOKIE);
}
