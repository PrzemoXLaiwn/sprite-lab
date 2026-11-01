/**
 * Host for a server-to-server call that carries QUEUE_SECRET. It must be this
 * project's own deployment. NEXT_PUBLIC_APP_URL is a public, user-facing URL
 * and is not used here: in production it pointed at a host outside this
 * project (every kick answered 404 there, and the secret left our network).
 * Production uses the project's production domain (Vercel system env);
 * previews use their own deployment URL. ST_PACKS_WORKER_URL overrides both.
 */
export function internalBaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.ST_PACKS_WORKER_URL) return env.ST_PACKS_WORKER_URL.replace(/\/+$/, "");
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}
