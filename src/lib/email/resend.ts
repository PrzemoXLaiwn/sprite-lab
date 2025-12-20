import { Resend } from "resend";

// Initialize Resend client
// Make sure to set RESEND_API_KEY in your environment variables
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
// NOTE: Until you verify your domain in Resend, you can only send from onboarding@resend.dev
// To use your own domain (sprite-lab.com):
// 1. Go to https://resend.com/domains
// 2. Add sprite-lab.com and verify DNS records
// 3. Set RESEND_VERIFIED_DOMAIN=true in .env.local
export const EMAIL_FROM = process.env.RESEND_VERIFIED_DOMAIN === "true"
  ? "SpriteLab <noreply@sprite-lab.com>"
  : "SpriteLab <onboarding@resend.dev>";
export const EMAIL_REPLY_TO = "support@sprite-lab.com";
