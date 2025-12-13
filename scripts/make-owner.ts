// Run this script with: npx ts-node scripts/make-owner.ts
// Or: npx tsx scripts/make-owner.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeOwner() {
  const email = 'lawinprzemek7@gmail.com';

  try {
    // First check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      console.log(`❌ User ${email} not found. Please register first.`);
      return;
    }

    // Update to OWNER
    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'OWNER',
        credits: 1000, // Give 1000 credits for testing
      },
    });

    console.log(`✅ Successfully updated user:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Credits: ${user.credits}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeOwner();
