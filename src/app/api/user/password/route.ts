import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/backend/session";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = updatePasswordSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { currentPassword, newPassword } = result.data;

    const [userData] = await db
      .select({ password: usersTable.password })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, userData.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
