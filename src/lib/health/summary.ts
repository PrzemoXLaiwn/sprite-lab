export type HealthLevel = "healthy" | "degraded" | "unhealthy";

/**
 * MISSING and ERROR fail the site, except a Redis ping error: rate limiting
 * falls open, so that check degrades the report and still returns 200.
 */
export function summarizeHealth(checks: Record<string, { status: string }>): {
  status: HealthLevel;
  httpStatus: 200 | 503;
} {
  let hasFailure = false;
  let hasDegraded = false;
  for (const [name, check] of Object.entries(checks)) {
    if (check.status === "MISSING" || (check.status === "ERROR" && name !== "rate_limiting")) {
      hasFailure = true;
    } else if (check.status === "PARTIAL" || (name === "rate_limiting" && check.status === "ERROR")) {
      hasDegraded = true;
    }
  }
  if (hasFailure) return { status: "unhealthy", httpStatus: 503 };
  if (hasDegraded) return { status: "degraded", httpStatus: 200 };
  return { status: "healthy", httpStatus: 200 };
}
