import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Replicate from "replicate";

// ===========================================
// GUEST GENERATION API
// Allows 2 free generations without login
// ===========================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Simple rate limiting by IP
const guestGenerations = new Map<string, { count: number; resetTime: number }>();
const MAX_GUEST_GENERATIONS = 2;
const GUEST_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const MAX_MAP_SIZE = 50000;

// Cleanup old entries
function cleanupMap(now: number) {
  if (guestGenerations.size > MAX_MAP_SIZE) {
    for (const [key, value] of guestGenerations.entries()) {
      if (now > value.resetTime) {
        guestGenerations.delete(key);
      }
    }
  }
}

function getClientIP(headersList: Headers): string {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  const cfConnectingIP = headersList.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  return "unknown";
}

function checkGuestLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanupMap(now);

  const record = guestGenerations.get(ip);

  if (!record || now > record.resetTime) {
    return { allowed: true, remaining: MAX_GUEST_GENERATIONS };
  }

  if (record.count >= MAX_GUEST_GENERATIONS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_GUEST_GENERATIONS - record.count };
}

function incrementGuestCount(ip: string): void {
  const now = Date.now();
  const record = guestGenerations.get(ip);

  if (!record || now > record.resetTime) {
    guestGenerations.set(ip, { count: 1, resetTime: now + GUEST_LIMIT_WINDOW });
  } else {
    record.count++;
  }
}

// Simple guest-friendly styles
const GUEST_STYLES = {
  pixel: {
    name: "Pixel Art",
    model: "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    prompt: "pixel art style, 16-bit, retro game sprite, clean edges, limited color palette",
    negative: "blurry, realistic, 3D render, photograph, noisy, gradient, anti-aliased",
  },
  cartoon: {
    name: "Cartoon",
    model: "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    prompt: "cartoon style, bold outlines, vibrant colors, game asset, clean design",
    negative: "realistic, photograph, blurry, noisy, complex background",
  },
};

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const ip = getClientIP(headersList);

    // Check guest limit
    const { allowed, remaining } = checkGuestLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "You've used your 2 free generations. Sign up for 15 free credits!",
          limitReached: true,
          signupUrl: "/register",
        },
        { status: 429 }
      );
    }

    // Parse request
    const body = await request.json();
    const { prompt, style = "pixel" } = body;

    // Validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please describe what you want to create." },
        { status: 400 }
      );
    }

    if (prompt.trim().length > 200) {
      return NextResponse.json(
        { error: "Description too long. Maximum 200 characters for guest mode." },
        { status: 400 }
      );
    }

    const styleConfig = GUEST_STYLES[style as keyof typeof GUEST_STYLES] || GUEST_STYLES.pixel;

    // Build prompt
    const finalPrompt = `${styleConfig.prompt}, ${prompt.trim()}, game sprite, single object, centered, transparent background, high quality`;

    console.log("===========================================");
    console.log("GUEST GENERATION");
    console.log("===========================================");
    console.log("IP:", ip);
    console.log("Remaining after this:", remaining - 1);
    console.log("Prompt:", prompt.trim());

    // Generate with SDXL
    const output = await replicate.run(styleConfig.model as `${string}/${string}:${string}`, {
      input: {
        prompt: finalPrompt,
        negative_prompt: styleConfig.negative,
        width: 1024,
        height: 1024,
        num_outputs: 1,
        scheduler: "K_EULER",
        num_inference_steps: 25,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 2147483647),
      },
    });

    // Get image URL
    let imageUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      if (typeof firstOutput === "string") {
        imageUrl = firstOutput;
      } else if (firstOutput && typeof firstOutput === "object" && "url" in firstOutput) {
        imageUrl = (firstOutput as { url: string }).url;
      }
    }

    if (!imageUrl) {
      console.error("No image URL from generation");
      return NextResponse.json(
        { error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Increment count AFTER successful generation
    incrementGuestCount(ip);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("GUEST GENERATION COMPLETE!");
    console.log("Duration:", duration + "s");
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl,
      style: styleConfig.name,
      remaining: remaining - 1,
      duration: `${duration}s`,
      message: remaining - 1 === 0
        ? "This was your last free generation! Sign up for 15 more credits."
        : `You have ${remaining - 1} free generation${remaining - 1 === 1 ? "" : "s"} left.`,
    });
  } catch (error) {
    console.error("[Guest Generate] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET - Check remaining generations
export async function GET(request: Request) {
  const headersList = await headers();
  const ip = getClientIP(headersList);
  const { remaining } = checkGuestLimit(ip);

  return NextResponse.json({
    remaining,
    max: MAX_GUEST_GENERATIONS,
    signupBonus: 15,
  });
}
