import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribersTable } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  try {
    const [sub] = await db
      .select({ id: newsletterSubscribersTable.id })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.token, token))
      .limit(1);

    if (!sub) {
      return new NextResponse("Subscription not found", { status: 404 });
    }

    await db
      .update(newsletterSubscribersTable)
      .set({ status: "UNSUBSCRIBED", unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribersTable.id, sub.id));

    return new NextResponse(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed — LeadCop</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; padding: 48px 40px; max-width: 440px; text-align: center; }
    h1 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 12px; }
    p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #8b5cf6; color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; }
    a:hover { background: #7c3aed; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>Unsubscribed successfully</h1>
    <p>You've been removed from the LeadCop newsletter. You won't receive any further emails from us.</p>
    <a href="/">Back to LeadCop</a>
  </div>
</body>
</html>`, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (err) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
