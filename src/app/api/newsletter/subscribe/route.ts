import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { performBasicSecurityChecks } from "@/lib/backend/reputation";
import { sendNewsletterNewSubscriberNotification } from "@/lib/backend/email";

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = subscribeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const { email, name } = result.data;

    const security = performBasicSecurityChecks(email);
    if (!security.allowed) return NextResponse.json({ error: security.reason }, { status: 400 });

    const [existing] = await db
      .select({ id: newsletterSubscribersTable.id, status: newsletterSubscribersTable.status })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      if (existing.status === "ACTIVE") {
        return NextResponse.json({ message: "You're already subscribed!" });
      }
      await db
        .update(newsletterSubscribersTable)
        .set({ status: "ACTIVE", unsubscribedAt: null, subscribedAt: new Date() })
        .where(eq(newsletterSubscribersTable.id, existing.id));
      
      sendNewsletterNewSubscriberNotification({ 
        email: email.toLowerCase(), 
        name: name 
      }).catch(() => {});
      
      return NextResponse.json({ message: "Welcome back! You've been resubscribed." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(newsletterSubscribersTable).values({
      email: email.toLowerCase(),
      name: name || null,
      token,
    });

    sendNewsletterNewSubscriberNotification({ 
      email: email.toLowerCase(), 
      name: name 
    }).catch(() => {});

    return NextResponse.json({ message: "Thanks for subscribing!" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
