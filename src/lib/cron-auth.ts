import { timingSafeEqual } from "crypto";

/**
 * Verify that a request comes from Vercel Cron (or an operator holding the secret).
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set
 * in the project env. The `x-vercel-cron` header is NOT proof — any client can
 * send it — so it is deliberately ignored.
 *
 * Fails closed: without CRON_SECRET every request is rejected, except in local
 * development (NODE_ENV=development) for convenience.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") return true;
    console.error("[CRON] CRON_SECRET is not set — rejecting cron request");
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
