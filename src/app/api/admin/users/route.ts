import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  try {
    const users = await db
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
        bulkJobCount: sql<number>`(SELECT COUNT(*) FROM bulk_jobs WHERE bulk_jobs.user_id = ${usersTable.id})::int`,
      })
      .from(usersTable)
      .orderBy(usersTable.createdAt);

    return NextResponse.json({
      users: users.map((u: any) => ({
        ...u,
        apiKey: u.apiKey ? u.apiKey.slice(0, 8) + "••••••••••••••••••••••••" : null,
        createdAt: u.createdAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
