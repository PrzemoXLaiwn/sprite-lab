import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function check() {
  console.log("🔍 Checking database status...\n");

  const users = await prisma.user.count();
  const generations = await prisma.generation.count();
  const transactions = await prisma.creditTransaction.count();
  const notifications = await prisma.notification.count();
  const analysisJobs = await prisma.analysisJob.count();
  const imageAnalyses = await prisma.imageAnalysis.count();

  console.log("Database status:");
  console.log("- Users:", users);
  console.log("- Generations:", generations);
  console.log("- Credit Transactions:", transactions);
  console.log("- Notifications:", notifications);
  console.log("- Analysis Jobs:", analysisJobs);
  console.log("- Image Analyses:", imageAnalyses);

  // Show user details
  if (users > 0) {
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, credits: true, plan: true }
    });
    console.log("\nUsers in database:");
    allUsers.forEach(u => {
      console.log(`  - ${u.email} | ${u.role} | ${u.credits} credits | ${u.plan}`);
    });
  }

  await prisma.$disconnect();
}

check().catch(console.error);
