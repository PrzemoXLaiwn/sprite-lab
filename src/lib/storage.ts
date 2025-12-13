import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "generations";

/**
 * Upload an image from URL to Supabase Storage
 * Returns the permanent public URL
 */
export async function uploadImageToStorage(
  imageUrl: string,
  userId: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Fetch image from Replicate URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique path: userId/timestamp-filename.png
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
    const filePath = `${userId}/${timestamp}-${safeName}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: "image/png",
        cacheControl: "31536000", // 1 year cache
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    console.log("Image uploaded successfully:", urlData.publicUrl);
    return { success: true, url: urlData.publicUrl };

  } catch (error) {
    console.error("Failed to upload image to storage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImageFromStorage(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Extract file path from URL
    const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
    if (urlParts.length !== 2) {
      // Not a Supabase Storage URL, ignore
      return { success: true };
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Storage delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error("Failed to delete image from storage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
