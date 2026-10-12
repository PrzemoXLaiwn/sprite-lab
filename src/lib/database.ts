// =============================================================================
// SPRITELAB — DATABASE RE-EXPORT BARREL
// =============================================================================
// This file is kept as a backwards-compatibility shim.
// All implementation has been moved to src/lib/db/ domain files:
//
//   Credits   → src/lib/db/credits.ts
//   Users     → src/lib/db/users.ts
//   Generations → src/lib/db/generations.ts
//
// Every export from the old database.ts is re-exported here so that
// existing callers (`import { x } from "@/lib/database"`) keep working
// without any changes during the migration.
//
// MIGRATION STATUS: All existing code still imports from here.
// TODO (Phase 3): Update each import site to the new domain path,
//                 then delete this file.
// =============================================================================

// --- Credits ---
export {
  getUserCredits,
  deductCredit,
  checkAndDeductCredits,
  refundCredits,
  addCredits,
  getCreditTransactions,
} from "./db/credits";

// --- Users ---
export {
  getOrCreateUser,
  getUser,
  updateUserProfile,
  checkUsernameAvailable,
  getPublicProfile,
  planToTier,
  getUserTier,
} from "./db/users";

// Types from users
export type { UpdateProfileData, UserTier } from "./db/users";

// --- Generations ---
export {
  saveGeneration,
  getUserGenerations,
  deleteGeneration,
  getUserStats,
} from "./db/generations";

// Types from generations
export type { SaveGenerationParams } from "./db/generations";
