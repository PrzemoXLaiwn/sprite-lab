// =============================================================================
// SPRITELAB — CREDIT DATABASE OPERATIONS
// =============================================================================
// All credit-related database logic lives here.
// Extracted from src/lib/database.ts — that file re-exports these functions
// so existing callers are not broken during the migration.
//
// CRITICAL: checkAndDeductCredits uses a Prisma transaction.
// Do NOT simplify it — the atomicity prevents race conditions where two
// simultaneous requests both pass the balance check on 1 credit.
// =============================================================================

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// READ
// -----------------------------------------------------------------------------

export async function getUserCredits(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, plan: true, role: true },
    });

    return {
      success: true,
      credits: user?.credits ?? 0,
      plan: user?.plan ?? "FREE",
      role: user?.role ?? "USER",
    };
  } catch (error) {
    console.error("Failed to fetch credits:", error);
    return { success: false, credits: 0, plan: "FREE", role: "USER" };
  }
}

export async function getCreditTransactions(userId: string, limit = 50) {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { success: true, transactions };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { success: false, transactions: [] };
  }
}

// -----------------------------------------------------------------------------
// WRITE — simple increment/decrement
// -----------------------------------------------------------------------------

/**
 * Credit deduction that never drives the balance negative.
 * Kept for backwards compatibility — delegates to checkAndDeductCredits.
 */
export async function deductCredit(userId: string, amount = 1) {
  const result = await checkAndDeductCredits(userId, amount);
  if (!result.success) {
    console.error("Failed to deduct credit:", result.error);
    return { success: false, error: result.error };
  }
  return { success: true, credits: result.credits };
}

export async function addCredits(
  userId: string,
  amount: number,
  type = "PURCHASE",
  description?: string
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    await prisma.creditTransaction.create({
      data: { userId, amount, type, description },
    });

    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to add credits:", error);
    return { success: false, error };
  }
}

// -----------------------------------------------------------------------------
// WRITE — atomic check-and-deduct (use this for all generation flows)
// -----------------------------------------------------------------------------

/**
 * Atomically check balance and deduct credits in a single transaction.
 *
 * Returns { success: false, error: "Not enough credits" } when balance is
 * insufficient — callers should return HTTP 402 in that case.
 *
 * On any other error returns { success: false, error: <message> }.
 * Credits are NEVER partially deducted — either the full amount is deducted
 * or nothing changes.
 */
export async function checkAndDeductCredits(
  userId: string,
  amount = 1
): Promise<{ success: boolean; credits?: number; error?: string }> {
  try {
    if (!Number.isInteger(amount) || amount < 1) throw new Error("Invalid amount");

    const result = await prisma.$transaction(async (tx) => {
      // Conditional decrement: the balance check and the update are a single
      // UPDATE ... WHERE credits >= amount, so concurrent requests cannot both
      // pass the check (a read-then-update is racy under READ COMMITTED).
      const { count } = await tx.user.updateMany({
        where: { id: userId, credits: { gte: amount } },
        data: { credits: { decrement: amount } },
      });

      if (count !== 1) {
        const exists = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!exists) throw new Error("User not found");
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { credits: true },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: "GENERATION",
          description: "Image generation",
        },
      });

      return updatedUser.credits;
    });

    return { success: true, credits: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "INSUFFICIENT_CREDITS") {
      return { success: false, error: "Not enough credits" };
    }
    console.error("Failed to check and deduct credits:", error);
    return { success: false, error: msg };
  }
}

/**
 * Refund credits when a generation fails after a successful deduction.
 * Always call this in the catch block of any generation that used
 * checkAndDeductCredits.
 */
export async function refundCredits(
  userId: string,
  amount = 1
): Promise<{ success: boolean; credits?: number }> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    await prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "REFUND",
        description: "Generation failed — credits refunded",
      },
    });

    console.log(`Refunded ${amount} credit(s) to user ${userId}`);
    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to refund credits:", error);
    return { success: false };
  }
}
