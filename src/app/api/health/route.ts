import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getRedisClient } from "@/lib/backend/redis";

export async function GET() {
  const status: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
    }
  };

  try {
    await db.execute(sql`SELECT 1`);
    status.services.database = "connected";
  } catch (err) {
    status.services.database = "error";
    status.status = "error";
  }

  try {
    const redis = await getRedisClient();
    await redis.ping();
    status.services.redis = "connected";
  } catch (err) {
    status.services.redis = "error";
    status.status = "error";
  }

  return NextResponse.json(status, { status: status.status === "ok" ? 200 : 503 });
}
