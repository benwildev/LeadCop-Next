import { NextResponse } from "next/server";
import { db, planConfigsTable } from "@/lib/db";

export async function GET() {
  try {
    const configs = await db
      .select({
        plan: planConfigsTable.plan,
        price: planConfigsTable.price,
        requestLimit: planConfigsTable.requestLimit,
        websiteLimit: planConfigsTable.websiteLimit,
        dataLimit: planConfigsTable.dataLimit,
        description: planConfigsTable.description,
        features: planConfigsTable.features,
      })
      .from(planConfigsTable)
      .orderBy(planConfigsTable.id);
    
    return NextResponse.json({ plans: configs });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
