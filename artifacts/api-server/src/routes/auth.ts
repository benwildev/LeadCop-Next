import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { hashPassword, verifyPassword, generateApiKey, getPlanConfig } from "../lib/auth.js";
import { createSession, destroySession, requireAuth, SESSION_COOKIE } from "../middlewares/session.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { isDisposableDomain } from "../lib/domain-cache.js";

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

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (isDisposableDomain(domain)) {
    res.status(400).json({ error: "Disposable email addresses are not allowed. Please use a permanent email address." });
    return;
  }

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

router.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  // Always respond with success to prevent email enumeration
  if (!user) {
    res.json({ message: "If that email is registered, a reset link has been sent." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(usersTable)
    .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
    .where(eq(usersTable.id, user.id));

  // Build reset URL from a server-controlled base — never from attacker-controlled headers
  const appBaseUrl = (process.env.APP_URL || process.env.SITE_URL || "https://leadcop.io").replace(/\/$/, "");
  const resetUrl = `${appBaseUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail({ userEmail: user.email, userName: user.name, resetUrl });
  } catch {
    // Log already handled in sendPasswordResetEmail; still return success to user
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const parsed = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    return;
  }

  const { token, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetToken, token))
    .limit(1);

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  const hashedPassword = await hashPassword(password);

  await db
    .update(usersTable)
    .set({ password: hashedPassword, resetToken: null, resetTokenExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Password updated successfully. You can now log in." });
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
