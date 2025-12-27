import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 Storage Client
 * Primary storage for SpriteLab images - zero egress costs!
 */

// ===========================================
// R2 CLIENT CONFIGURATION
// ===========================================

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

/**
 * Generate a unique file path for R2
 */
function generateFilePath(userId: string, extension: string = "png"): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  return `generations/${userId}/${timestamp}-${randomId}.${extension}`;
}

/**
 * Get the public URL for a file path
 */
function getPublicUrl(filePath: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL || "";
  // Ensure no double slashes
  const cleanUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
  return `${cleanUrl}/${filePath}`;
}

/**
 * Extract file path from R2 public URL
 */
function extractFilePath(imageUrl: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL || "";
  if (!imageUrl.startsWith(publicUrl)) {
    return null;
  }
  // Remove the public URL prefix to get the file path
  let filePath = imageUrl.replace(publicUrl, "");
  // Remove leading slash if present
  if (filePath.startsWith("/")) {
    filePath = filePath.substring(1);
  }
  return filePath;
}

// ===========================================
// MAIN FUNCTIONS
// ===========================================

/**
 * Upload an image from URL to R2
 * Downloads the image and re-uploads to R2 for permanent storage
 */
export async function uploadToR2(
  imageUrl: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!client || !bucketName) {
      return { success: false, error: "R2 not configured" };
    }

    // Download the image
    console.log("[R2] 📥 Downloading image from source...");
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = response.headers.get("content-type") || "image/png";
    const extension = contentType.includes("webp") ? "webp" :
                      contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

    // Generate file path
    const filePath = generateFilePath(userId, extension);

    // Upload to R2
    console.log(`[R2] 📤 Uploading to R2: ${filePath}`);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // 1 year cache
    });

    await client.send(command);

    const publicUrl = getPublicUrl(filePath);
    console.log(`[R2] ✅ Upload successful: ${publicUrl}`);

    return { success: true, url: publicUrl };

  } catch (error) {
    console.error("[R2] ❌ Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "R2 upload failed",
    };
  }
}

/**
 * Upload a base64 image to R2
 */
export async function uploadBase64ToR2(
  base64Data: string,
  userId: string,
  contentType: string = "image/png"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!client || !bucketName) {
      return { success: false, error: "R2 not configured" };
    }

    // Remove data URL prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.includes(",")) {
      cleanBase64 = base64Data.split(",")[1];
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, "base64");

    // Determine extension from content type
    const extension = contentType.includes("webp") ? "webp" :
                      contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

    // Generate file path
    const filePath = generateFilePath(userId, extension);

    // Upload to R2
    console.log(`[R2] 📤 Uploading base64 to R2: ${filePath}`);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // 1 year cache
    });

    await client.send(command);

    const publicUrl = getPublicUrl(filePath);
    console.log(`[R2] ✅ Base64 upload successful: ${publicUrl}`);

    return { success: true, url: publicUrl };

  } catch (error) {
    console.error("[R2] ❌ Base64 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "R2 upload failed",
    };
  }
}

/**
 * Delete an image from R2
 */
export async function deleteFromR2(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!client || !bucketName) {
      return { success: false, error: "R2 not configured" };
    }

    // Extract file path from URL
    const filePath = extractFilePath(imageUrl);
    if (!filePath) {
      // Not an R2 URL, nothing to delete
      return { success: true };
    }

    console.log(`[R2] 🗑️ Deleting from R2: ${filePath}`);
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });

    await client.send(command);
    console.log("[R2] ✅ Delete successful");

    return { success: true };

  } catch (error) {
    console.error("[R2] ❌ Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "R2 delete failed",
    };
  }
}

/**
 * Check if a URL is an R2 URL
 */
export function isR2Url(url: string): boolean {
  const publicUrl = process.env.R2_PUBLIC_URL || "";
  return url.startsWith(publicUrl);
}

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.in");
}
