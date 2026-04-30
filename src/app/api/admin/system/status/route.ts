import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/backend/redis";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    const dbStart = performance.now();
    let dbStatus = "unknown";
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = "healthy";
    } catch (e) {
      dbStatus = "error";
    }
    const dbLatency = Math.round(performance.now() - dbStart);

    const redisStart = performance.now();
    let redisStatus = "unknown";
    let redisInfo = null;
    try {
      await redis.ping();
      redisStatus = "healthy";
      const rawInfo = await redis.info();
      const clientsMatch = rawInfo.match(/connected_clients:(\d+)/);
      const memMatch = rawInfo.match(/used_memory_human:(.+)/);
      redisInfo = {
        clients: clientsMatch ? parseInt(clientsMatch[1], 10) : 0,
        memory: memMatch ? memMatch[1].trim() : "0B",
      };
    } catch (e) {
      redisStatus = "error";
    }
    const redisLatency = Math.round(performance.now() - redisStart);

    return NextResponse.json({
      uptime,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      postgres: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatency,
        info: redisInfo,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load system metrics" }, { status: 500 });
  }
}
