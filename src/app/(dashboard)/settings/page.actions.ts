"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser, updateUserProfile, getCreditTransactions, checkUsernameAvailable, UpdateProfileData } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export async function fetchUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", user: null };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        _count: {
          select: { generations: true },
        },
      },
    });

    return { success: true, user: dbUser };
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { success: false, error: "Failed to fetch profile", user: null };
  }
}

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // If username is being updated, check availability
  if (data.username) {
    const normalizedUsername = data.username.toLowerCase().trim();

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return {
        success: false,
        error: "Username must be 3-20 characters, lowercase letters, numbers, and underscores only"
      };
    }

    const { available } = await checkUsernameAvailable(normalizedUsername, user.id);
    if (!available) {
      return { success: false, error: "Username is already taken" };
    }
    data.username = normalizedUsername;
  }

  const result = await updateUserProfile(user.id, data);
  return result;
}

export async function checkUsername(username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, available: false };
  }

  const normalizedUsername = username.toLowerCase().trim();

  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    return { success: true, available: false, error: "Invalid format" };
  }

  const result = await checkUsernameAvailable(normalizedUsername, user.id);
  return { success: true, ...result };
}

export async function fetchCreditHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", transactions: [] };
  }

  const result = await getCreditTransactions(user.id);
  return result;
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or GIF" };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "File too large. Max 2MB" };
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    console.error("Upload error details:", {
      message: uploadError.message,
      name: uploadError.name,
      cause: uploadError.cause,
    });
    return { success: false, error: `Failed to upload avatar: ${uploadError.message}` };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  // Update user profile with new avatar URL
  await updateUserProfile(user.id, { avatarUrl: publicUrl });

  return { success: true, url: publicUrl };
}
