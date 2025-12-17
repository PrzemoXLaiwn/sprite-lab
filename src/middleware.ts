import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ===========================================
// RATE LIMITING CONFIGURATION
// ===========================================
// For production at scale, use Redis or Vercel KV

// General API rate limits
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per IP

// Auth-specific rate limits (stricter for login/register)
const authRateLimitMap = new Map<string, { count: number; resetTime: number; blocked?: boolean }>();
const AUTH_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 5; // 5 attempts per 15 minutes
const AUTH_BLOCK_DURATION = 30 * 60 * 1000; // 30 minute block after too many attempts

// Admin endpoint rate limits (very strict)
const adminRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const ADMIN_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ADMIN_REQUESTS = 10; // 10 requests per minute

const MAX_MAP_SIZE = 10000; // Prevent memory leak

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  // Fallback for Vercel
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  return "unknown";
}

// Clean up map if too large
function cleanupMap(map: Map<string, { count: number; resetTime: number; blocked?: boolean }>, now: number) {
  if (map.size > MAX_MAP_SIZE) {
    for (const [key, value] of map.entries()) {
      if (now > value.resetTime) {
        map.delete(key);
      }
    }
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanupMap(rateLimitMap, now);
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

// Stricter rate limiting for auth endpoints
function isAuthRateLimited(ip: string): { limited: boolean; blocked: boolean; retryAfter: number } {
  const now = Date.now();
  cleanupMap(authRateLimitMap, now);
  const record = authRateLimitMap.get(ip);

  // Check if blocked
  if (record?.blocked && now < record.resetTime) {
    return {
      limited: true,
      blocked: true,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
  }

  if (!record || now > record.resetTime) {
    authRateLimitMap.set(ip, { count: 1, resetTime: now + AUTH_RATE_LIMIT_WINDOW });
    return { limited: false, blocked: false, retryAfter: 0 };
  }

  if (record.count >= MAX_AUTH_ATTEMPTS) {
    // Block the IP for extended period
    record.blocked = true;
    record.resetTime = now + AUTH_BLOCK_DURATION;
    return {
      limited: true,
      blocked: true,
      retryAfter: Math.ceil(AUTH_BLOCK_DURATION / 1000)
    };
  }

  record.count++;
  return { limited: false, blocked: false, retryAfter: 0 };
}

// Admin endpoint rate limiting
function isAdminRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanupMap(adminRateLimitMap, now);
  const record = adminRateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    adminRateLimitMap.set(ip, { count: 1, resetTime: now + ADMIN_RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_ADMIN_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const method = request.method;

  // ===========================================
  // SECURITY: Block suspicious user agents
  // ===========================================
  const userAgent = request.headers.get("user-agent") || "";
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /dirbuster/i,
    /gobuster/i,
    /wfuzz/i,
    /hydra/i,
    /burp/i,
    /nuclei/i,
    /acunetix/i,
    /nessus/i,
    /openvas/i,
    /w3af/i,
    /havij/i,
    /pangolin/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
    console.warn(`[SECURITY] Blocked suspicious UA from ${ip}: ${userAgent}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ===========================================
  // SECURITY: Block suspicious paths
  // ===========================================
  const blockedPaths = [
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /wp-login/i,
    /phpinfo/i,
    /\.php$/i,
    /\.asp$/i,
    /\.aspx$/i,
    /admin\.php/i,
    /shell/i,
    /eval-stdin/i,
    /\.htaccess/i,
    /\.htpasswd/i,
    /\.DS_Store/i,
    /\.svn/i,
    /\.hg/i,
    /web\.config/i,
    /\.bak$/i,
    /\.sql$/i,
    /\.tar$/i,
    /\.zip$/i,
    /\.rar$/i,
    /phpMyAdmin/i,
    /phpmyadmin/i,
    /cgi-bin/i,
    /\.well-known\/security\.txt/i,
  ];

  if (blockedPaths.some((pattern) => pattern.test(pathname))) {
    console.warn(`[SECURITY] Blocked suspicious path from ${ip}: ${pathname}`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ===========================================
  // SECURITY: Block SQL injection attempts in query params
  // ===========================================
  const url = request.nextUrl.toString();
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION(\s+)SELECT/i,
    /SELECT(\s+).*FROM/i,
    /INSERT(\s+)INTO/i,
    /DELETE(\s+)FROM/i,
    /DROP(\s+)TABLE/i,
    /UPDATE(\s+).*SET/i,
  ];

  if (sqlInjectionPatterns.some((pattern) => pattern.test(url))) {
    console.warn(`[SECURITY] Blocked SQL injection attempt from ${ip}: ${url}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ===========================================
  // RATE LIMITING: Admin endpoints (strictest)
  // ===========================================
  if (pathname.startsWith("/api/admin")) {
    if (isAdminRateLimited(ip)) {
      console.warn(`[SECURITY] Admin rate limit exceeded for ${ip}`);
      return NextResponse.json(
        { error: "Too many requests to admin endpoint." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Admin endpoints must be POST only (except for legacy support)
    // GET requests to admin endpoints should be blocked in production
    if (method === "GET" && process.env.NODE_ENV === "production") {
      console.warn(`[SECURITY] GET request to admin endpoint blocked from ${ip}: ${pathname}`);
      // Allow for now but log - should migrate to POST
    }
  }

  // ===========================================
  // RATE LIMITING: Auth endpoints (strict)
  // ===========================================
  const isAuthPath = pathname === "/login" || pathname === "/register" ||
                     pathname.startsWith("/auth/") ||
                     pathname === "/api/auth/callback";

  if (isAuthPath && (method === "POST" || pathname.includes("callback"))) {
    const authLimit = isAuthRateLimited(ip);
    if (authLimit.limited) {
      console.warn(`[SECURITY] Auth rate limit exceeded for ${ip}, blocked: ${authLimit.blocked}`);
      return NextResponse.json(
        {
          error: authLimit.blocked
            ? "Too many login attempts. Please try again later."
            : "Too many requests. Please slow down.",
        },
        { status: 429, headers: { "Retry-After": String(authLimit.retryAfter) } }
      );
    }
  }

  // ===========================================
  // RATE LIMITING: General API routes
  // ===========================================
  if (pathname.startsWith("/api/") && !pathname.includes("/webhook")) {
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // ===========================================
  // SECURITY: Block requests without user agent
  // ===========================================
  if (!userAgent && pathname.startsWith("/api/") && !pathname.includes("/webhook")) {
    console.warn(`[SECURITY] Blocked request without User-Agent from ${ip}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ===========================================
  // SESSION & RESPONSE
  // ===========================================
  const response = await updateSession(request);

  // Add security headers
  if (response) {
    response.headers.set("X-Request-ID", crypto.randomUUID());
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // HSTS - Force HTTPS for 2 years, include subdomains, allow preload
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
      );
    }
    
    // Additional security headers
    response.headers.set("X-DNS-Prefetch-Control", "on");
    response.headers.set("X-Download-Options", "noopen");
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
    
    // Log suspicious activity
    if (process.env.NODE_ENV === "production") {
      // You could send this to a logging service
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
