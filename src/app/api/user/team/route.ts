import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq, desc, count } from "drizzle-orm";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig, generateApiKey } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if ((user as any).parentId) {
      return NextResponse.json({ error: "Sub-users cannot manage the team." }, { status: 403 });
    }

    const teamMembers = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.parentId, user.id))
      .orderBy(desc(usersTable.createdAt));

    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    const maxSeats = planConfig.maxUsers;
    const allowedSubUsers = maxSeats === -1 ? -1 : Math.max(0, maxSeats - 1);

    return NextResponse.json({
      members: teamMembers.map((m: any) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      total: teamMembers.length,
      allowedSubUsers,
      seatsRemaining: allowedSubUsers === -1 ? -1 : Math.max(0, allowedSubUsers - teamMembers.length),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const inviteSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if ((user as any).parentId) {
      return NextResponse.json({ error: "Sub-users cannot manage the team." }, { status: 403 });
    }

    const body = await req.json();
    const result = inviteSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input values." }, { status: 400 });

    const { name, email, password } = result.data;

    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    const maxSeats = planConfig.maxUsers;
    const allowedSubUsers = maxSeats === -1 ? -1 : Math.max(0, maxSeats - 1);

    if (allowedSubUsers !== -1) {
      const [membersCount] = await db
        .select({ count: count() })
        .from(usersTable)
        .where(eq(usersTable.parentId, user.id));

      if (Number(membersCount.count) >= allowedSubUsers) {
        return NextResponse.json({ 
          error: `Your ${user.plan} plan limits you to ${maxSeats} user seat(s) total. Please upgrade to invite more.` 
        }, { status: 429 });
      }
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newApiKey = generateApiKey();

    const [inserted] = await db
      .insert(usersTable)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        apiKey: newApiKey,
        plan: user.plan, 
        parentId: user.id,
      })
      .returning();

    return NextResponse.json({
      member: {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        createdAt: inserted.createdAt.toISOString(),
      },
      message: "Team member added successfully.",
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
