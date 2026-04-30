import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { logger } from "@/lib/backend/logger";
import { checkRateLimit } from "@/lib/backend/redis";

const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";

  const isAllowed = await checkRateLimit(`newsletter:${ip}`, 5);
  if (!isAllowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const result = newsletterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { email, name } = result.data;

    const [existing] = await db
      .select({ id: newsletterSubscribersTable.id })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: "You are already subscribed!" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(newsletterSubscribersTable).values({
      email,
      name: name ?? null,
      status: "ACTIVE",
      token,
    });

    return NextResponse.json({ message: "Subscribed successfully!" });
  } catch (err) {
    logger.error({ err }, "Newsletter subscription error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
