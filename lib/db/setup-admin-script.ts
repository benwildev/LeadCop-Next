import { db, usersTable } from "./src/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { crypto } from "node:crypto";

async function setup() {
  const email = "admin@leadcop.io";
  const password = "LeadCop2026!";
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user exists
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (existingUser) {
    console.log(`User ${email} exists. Promoting to ADMIN and resetting password.`);
    await db.update(usersTable)
      .set({
        role: "ADMIN",
        password: hashedPassword,
        plan: "PRO",
        requestLimit: 10000
      })
      .where(eq(usersTable.id, existingUser.id));
  } else {
    console.log(`User ${email} does not exist. Creating new ADMIN account.`);
    await db.insert(usersTable).values({
      name: "Admin",
      email: email,
      password: hashedPassword,
      apiKey: crypto.randomUUID(),
      role: "ADMIN",
      plan: "PRO",
      requestLimit: 10000
    });
  }

  console.log("✓ Admin account setup complete.");
  process.exit(0);
}

setup().catch((err) => {
  console.error("Error setting up admin account:", err);
  process.exit(1);
});
