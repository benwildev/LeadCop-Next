import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, generateApiKey, getPlanConfig } from "@/lib/backend/auth";
import { createSession } from "@/lib/backend/session";
import { logger } from "@/lib/backend/logger";
import { checkRateLimit } from "@/lib/backend/redis";
import { performBasicSecurityChecks } from "@/lib/backend/reputation";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";

  const isAllowed = await checkRateLimit(`register:${ip}`, 3);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Too many accounts created from this IP. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { name, email, password } = result.data;

    // 🔒 Security Gate
    const security = performBasicSecurityChecks(email);
    if (!security.allowed) {
      return NextResponse.json({ error: security.reason }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
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
      .returning();

    await createSession(user.id);
    
    logger.info({ userId: user.id, ip }, "Register: Successful");

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: (user as any).updatedAt?.toISOString() || null,
        resetTokenExpiresAt: (user as any).resetTokenExpiresAt?.toISOString() || null,
        usagePeriodStart: (user as any).usagePeriodStart?.toISOString() || null,
      },
      message: "Registration successful",
    });
  } catch (err) {
    logger.error({ err }, "Register: Fatal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
