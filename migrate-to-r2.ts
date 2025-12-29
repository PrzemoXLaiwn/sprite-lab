/**
 * Migration Script: Supabase Storage → Cloudflare R2
 * 
 * Ten skrypt:
 * 1. Pobiera wszystkie rekordy z image_url wskazującym na Supabase
 * 2. Downloaduje obrazy z Supabase Storage
 * 3. Uploaduje je na Cloudflare R2
 * 4. Aktualizuje URL-e w bazie danych
 * 
 * Uruchom: npx tsx migrate-to-r2.ts
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ============================================
// KONFIGURACJA - UZUPEŁNIJ SWOIMI DANYMI
// ============================================

const CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gbwujuoybibdvyqyz.supabase.co",
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY",
  
  // Cloudflare R2
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "190c02b6d902949de53acc9975069c81",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "YOUR_R2_ACCESS_KEY",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "YOUR_R2_SECRET_KEY",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "spritelab-images",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "https://pub-6411769b95ba423f9b01e8987f6d6e34.r2.dev",
  
  // Migration settings
  BATCH_SIZE: 10, // Ile obrazów przetwarzać naraz
  DRY_RUN: false, // true = tylko pokaż co by zrobił, bez zmian
};

// ============================================
// SETUP CLIENTS
// ============================================

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${CONFIG.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.R2_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.R2_SECRET_ACCESS_KEY,
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

interface Generation {
  id: string;
  image_url: string;
  user_id: string;
  created_at: string;
}

async function getSupabaseGenerations(): Promise<Generation[]> {
  console.log("📋 Pobieranie rekordów z Supabase URL-ami...");
  
  const { data, error } = await supabase
    .from("generations")
    .select("id, image_url, user_id, created_at")
    .like("image_url", "%supabase%")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Błąd pobierania danych: ${error.message}`);
  }

  console.log(`   Znaleziono ${data?.length || 0} rekordów do migracji`);
  return data || [];
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function generateR2Path(userId: string, originalUrl: string): string {
  // Wyciągnij oryginalną nazwę pliku lub wygeneruj nową
  const urlParts = originalUrl.split("/");
  const originalFileName = urlParts[urlParts.length - 1];
  
  // Format: users/{userId}/generations/{filename}
  return `users/${userId}/generations/${originalFileName}`;
}

async function uploadToR2(buffer: Buffer, filePath: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: CONFIG.R2_BUCKET_NAME,
    Key: filePath,
    Body: buffer,
    ContentType: "image/png",
    CacheControl: "public, max-age=31536000",
  });

  await r2Client.send(command);
  return `${CONFIG.R2_PUBLIC_URL}/${filePath}`;
}

async function updateDatabaseUrl(id: string, newUrl: string): Promise<void> {
  const { error } = await supabase
    .from("generations")
    .update({ image_url: newUrl })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update record ${id}: ${error.message}`);
  }
}

// ============================================
// MAIN MIGRATION
// ============================================

async function migrate() {
  console.log("🚀 Starting migration: Supabase Storage → Cloudflare R2\n");
  console.log(`   Dry run: ${CONFIG.DRY_RUN ? "YES (no changes)" : "NO (will make changes)"}\n`);

  const generations = await getSupabaseGenerations();

  if (generations.length === 0) {
    console.log("✅ Brak rekordów do migracji!");
    return;
  }

  let success = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  // Process in batches
  for (let i = 0; i < generations.length; i += CONFIG.BATCH_SIZE) {
    const batch = generations.slice(i, i + CONFIG.BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(generations.length / CONFIG.BATCH_SIZE)}`);

    await Promise.all(
      batch.map(async (gen) => {
        try {
          console.log(`   [${gen.id.slice(0, 8)}] Przetwarzanie...`);

          if (CONFIG.DRY_RUN) {
            console.log(`   [${gen.id.slice(0, 8)}] ✓ (dry run)`);
            success++;
            return;
          }

          // 1. Download from Supabase
          const imageBuffer = await downloadImage(gen.image_url);
          console.log(`   [${gen.id.slice(0, 8)}] Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`);

          // 2. Upload to R2
          const r2Path = generateR2Path(gen.user_id, gen.image_url);
          const newUrl = await uploadToR2(imageBuffer, r2Path);
          console.log(`   [${gen.id.slice(0, 8)}] Uploaded to R2`);

          // 3. Update database
          await updateDatabaseUrl(gen.id, newUrl);
          console.log(`   [${gen.id.slice(0, 8)}] ✅ Done → ${newUrl.slice(0, 50)}...`);

          success++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.log(`   [${gen.id.slice(0, 8)}] ❌ Error: ${errorMsg}`);
          errors.push({ id: gen.id, error: errorMsg });
          failed++;
        }
      })
    );

    // Small delay between batches to avoid rate limits
    if (i + CONFIG.BATCH_SIZE < generations.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(50));
  console.log(`   Total:   ${generations.length}`);
  console.log(`   Success: ${success} ✅`);
  console.log(`   Failed:  ${failed} ❌`);

  if (errors.length > 0) {
    console.log("\n❌ Failed records:");
    errors.forEach((e) => console.log(`   - ${e.id}: ${e.error}`));
  }

  console.log("\n✨ Migration complete!");
}

// ============================================
// RUN
// ============================================

migrate().catch((error) => {
  console.error("💥 Migration failed:", error);
  process.exit(1);
});