import { NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const [result] = await db.select({ value: count() }).from(usersTable);
    return NextResponse.json({ 
      status: "ok", 
      database: "connected", 
      userCount: Number(result.value) 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "error", 
      database: "failed", 
      message: error.message 
    }, { status: 500 });
  }
}
