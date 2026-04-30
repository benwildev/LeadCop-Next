import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "@/lib/backend/auth";
import { createSession } from "@/lib/backend/session";
import { logger } from "@/lib/backend/logger";
import { checkRateLimit } from "@/lib/backend/redis";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";
  
  // Rate limiting
  const isAllowed = await checkRateLimit(`login:${ip}`, 10);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, password } = result.data;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSession(user.id);
    
    logger.info({ userId: user.id, ip }, "Login: Successful");

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        apiKey: user.apiKey,
        role: user.role,
        plan: user.plan,
        requestCount: user.requestCount,
        requestLimit: user.requestLimit,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      message: "Login successful",
    });
  } catch (err) {
    logger.error({ err }, "Login: Fatal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
