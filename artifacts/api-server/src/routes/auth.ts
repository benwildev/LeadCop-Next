import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, verifyPassword, generateApiKey, getPlanConfig } from "../lib/auth.js";
import { createSession, destroySession, requireAuth, SESSION_COOKIE } from "../middlewares/session.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message || "Invalid input" });
    return;
  }

  const { name, email, password } = result.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashedPassword = await hashPassword(password);
  const apiKey = generateApiKey();
  const freePlanConfig = await getPlanConfig("FREE");

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashedPassword,
      apiKey,
      role: "USER",
      plan: "FREE",
      requestCount: 0,
      requestLimit: freePlanConfig.requestLimit,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      apiKey: usersTable.apiKey,
      role: usersTable.role,
      plan: usersTable.plan,
      requestCount: usersTable.requestCount,
      requestLimit: usersTable.requestLimit,
      createdAt: usersTable.createdAt,
    });

  const sessionId = createSession(user.id);

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: { ...user, createdAt: user.createdAt.toISOString() },
    message: "Registration successful",
  });
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = result.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionId = createSession(user.id);

  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      apiKey: user.apiKey,
      role: user.role,
      plan: user.plan,
      requestCount: user.requestCount,
      requestLimit: user.requestLimit,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Login successful",
  });
});

router.post("/logout", (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    destroySession(sessionId);
  }
  res.clearCookie(SESSION_COOKIE);
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      apiKey: usersTable.apiKey,
      role: usersTable.role,
      plan: usersTable.plan,
      requestCount: usersTable.requestCount,
      requestLimit: usersTable.requestLimit,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ ...user, createdAt: user.createdAt.toISOString() });
});

export default router;
