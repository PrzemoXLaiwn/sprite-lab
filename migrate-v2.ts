/**
 * Migration Script: Supabase Storage → Cloudflare R2
 * 
 * Uruchom: npx tsx migrate-to-r2.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load .env.local first, then .env
config({ path: ".env.local" });
config({ path: ".env" });

// ============================================
// KONFIGURACJA
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "spritelab-images";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Validate config
console.log("🔧 Checking configuration...");
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? "✅" : "❌ MISSING"}`);
console.log(`   SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "✅" : "❌ MISSING"}`);
console.log(`   R2_ACCOUNT_ID: ${R2_ACCOUNT_ID ? "✅" : "❌ MISSING"}`);
console.log(`   R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? "✅" : "❌ MISSING"}`);
console.log(`   R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? "✅" : "❌ MISSING"}`);
console.log(`   R2_PUBLIC_URL: ${R2_PUBLIC_URL ? "✅" : "❌ MISSING"}`);
console.log("");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase configuration! Check your .env.local file.");
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error("❌ Missing R2 configuration! Check your .env.local file.");
  process.exit(1);
}

const BATCH_SIZE = 10;
const DRY_RUN = false;

// ============================================
// SETUP CLIENTS
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
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

async function testSupabaseConnection(): Promise<boolean> {
  console.log("🔌 Testing Supabase connection...");
  try {
    const { count, error } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true });
    
    if (error) {
      console.error(`   ❌ Connection failed: ${error.message}`);
      return false;
    }
    console.log(`   ✅ Connected! Found ${count} total records in generations table.`);
    return true;
  } catch (err) {
    console.error(`   ❌ Connection failed: ${err}`);
    return false;
  }
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
  const urlParts = originalUrl.split("/");
  const originalFileName = urlParts[urlParts.length - 1];
  return `users/${userId}/generations/${originalFileName}`;
}

async function uploadToR2(buffer: Buffer, filePath: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filePath,
    Body: buffer,
    ContentType: "image/png",
    CacheControl: "public, max-age=31536000",
  });

  await r2Client.send(command);
  return `${R2_PUBLIC_URL}/${filePath}`;
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

  // Test connection first
  const connected = await testSupabaseConnection();
  if (!connected) {
    console.error("\n❌ Cannot connect to Supabase. Is the service still restricted?");
    console.error("   Check: https://supabase.com/dashboard → your project → Usage");
    process.exit(1);
  }

  console.log(`\n   Dry run: ${DRY_RUN ? "YES (no changes)" : "NO (will make changes)"}\n`);

  const generations = await getSupabaseGenerations();

  if (generations.length === 0) {
    console.log("✅ Brak rekordów do migracji - wszystkie obrazy są już na R2!");
    return;
  }

  let success = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  // Process in batches
  for (let i = 0; i < generations.length; i += BATCH_SIZE) {
    const batch = generations.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(generations.length / BATCH_SIZE)}`);

    await Promise.all(
      batch.map(async (gen) => {
        try {
          console.log(`   [${gen.id.slice(0, 8)}] Przetwarzanie...`);

          if (DRY_RUN) {
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
          console.log(`   [${gen.id.slice(0, 8)}] ✅ Done`);

          success++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.log(`   [${gen.id.slice(0, 8)}] ❌ Error: ${errorMsg}`);
          errors.push({ id: gen.id, error: errorMsg });
          failed++;
        }
      })
    );

    // Small delay between batches
    if (i + BATCH_SIZE < generations.length) {
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