// Script to restore admin account after database reset
// Run with: npx tsx scripts/restore-admin.ts

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  // Get the email from command line or use default
  const email = process.argv[2] || "lawinprzemek7@gmail.com";

  console.log(`Looking for user with email: ${email}`);

  // Find or create the user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log("User not found in database. They need to log in first via Supabase Auth.");
    console.log("After logging in, run this script again to set them as OWNER.");

    // List all users in DB
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, credits: true }
    });
    console.log("\nCurrent users in database:");
    console.log(allUsers);
    return;
  }

  // Update user to OWNER with credits
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "OWNER",
      credits: 10000,
      plan: "PRO",
      isActive: true,
    },
  });

  console.log("✅ User restored as OWNER:");
  console.log({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    credits: updated.credits,
    plan: updated.plan,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
