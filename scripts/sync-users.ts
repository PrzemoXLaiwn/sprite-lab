// Script to sync Supabase Auth users to database
// Run with: npx tsx scripts/sync-users.ts

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

interface AuthUser {
  id: string;
  email: string;
  raw_user_meta_data: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  created_at: Date;
}

async function syncUsers() {
  console.log("🔄 Syncing Supabase Auth users to database...\n");

  // Query auth.users table directly using raw SQL
  // This works because Prisma connects to the same Supabase database
  const authUsers = await prisma.$queryRaw<AuthUser[]>`
    SELECT
      id::text,
      email,
      raw_user_meta_data,
      created_at
    FROM auth.users
    ORDER BY created_at DESC
  `;

  console.log(`Total Supabase Auth users: ${authUsers.length}`);

  // Get existing users from database
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const existingIds = new Set(existingUsers.map((u) => u.id));
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  console.log(`Existing database users: ${existingUsers.length}`);

  // Find users that need to be added
  const usersToAdd = authUsers.filter(
    (authUser) => !existingIds.has(authUser.id) && !existingEmails.has(authUser.email)
  );

  console.log(`Users to add: ${usersToAdd.length}\n`);

  // Add missing users
  let added = 0;
  let errors = 0;

  for (const authUser of usersToAdd) {
    try {
      const metadata = authUser.raw_user_meta_data || {};
      await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          name: metadata.full_name || metadata.name || null,
          avatarUrl: metadata.avatar_url || null,
          credits: 15, // Default free credits
          plan: "FREE",
          role: "USER",
          isActive: true,
          createdAt: new Date(authUser.created_at),
        },
      });
      added++;
      console.log(`✅ Added: ${authUser.email}`);
    } catch (err: any) {
      // If user exists by ID but different email, or vice versa
      if (err.code === "P2002") {
        console.log(`⚠️  Skipped (duplicate): ${authUser.email}`);
      } else {
        console.error(`❌ Error adding ${authUser.email}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Added: ${added} users`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log(`========================================\n`);

  // Final count
  const finalCount = await prisma.user.count();
  console.log(`Total users in database now: ${finalCount}`);

  await prisma.$disconnect();
}

syncUsers().catch(console.error);
