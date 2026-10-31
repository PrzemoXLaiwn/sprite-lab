// Session proxy: a signed-out buyer keeps the checkout URL through sign-in, and
// a refresh glitch (token already rotated, half-written cookie) passes the
// request through instead of logging the person out.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type GetUser = () => Promise<{ data: { user: { id: string } | null }; error: { message: string; code?: string } | null }>;
let getUser: GetUser;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: (c: Array<{ name: string; value: string; options?: object }>) => void } }) => ({
    auth: {
      getUser: async () => {
        const result = await getUser();
        // Like the real client: a failed refresh blanks the session cookies first
        if (result.error) opts.cookies.setAll([{ name: "sb-test-auth-token", value: "", options: { maxAge: 0 } }]);
        return result;
      },
    },
  }),
}));

import { isSessionRefreshGlitch, updateSession } from "./middleware";

const req = (path: string) => new NextRequest(`https://sprite-lab.com${path}`, { headers: { cookie: "sb-test-auth-token=abc" } });
const signedOut: GetUser = async () => ({ data: { user: null }, error: { message: "Auth session missing!" } });

describe("updateSession", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("sends a signed-out buyer to sign-in with the checkout URL and offer kept", async () => {
    getUser = signedOut;
    const res = await updateSession(req("/checkout/starter?offer=first3"));
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("redirectTo")).toBe("/checkout/starter?offer=first3");
  });

  it("still protects app pages", async () => {
    getUser = signedOut;
    const res = await updateSession(req("/generate"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("a refresh token already rotated elsewhere: no redirect, cookies untouched", async () => {
    getUser = async () => ({ data: { user: null }, error: { message: "Invalid Refresh Token: Already Used", code: "refresh_token_already_used" } });
    const res = await updateSession(req("/generate"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    // The page sees the cookies the browser sent, not the blanked ones
    expect(res.headers.get("x-middleware-request-cookie")).toContain("sb-test-auth-token=abc");
  });

  it("a half-written session cookie that makes the client throw: passed through too", async () => {
    getUser = async () => { throw new TypeError("Cannot create property 'user' on string 'eyJhb'"); };
    const res = await updateSession(req("/animate"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("a signed-in visitor on /login with a checkout return goes to the checkout", async () => {
    getUser = async () => ({ data: { user: { id: "u1" } }, error: null });
    const res = await updateSession(req("/login?redirectTo=%2Fcheckout%2Fstarter%3Foffer%3Dfirst3"));
    expect(res.headers.get("location")).toBe("https://sprite-lab.com/checkout/starter?offer=first3");
  });
});

describe("isSessionRefreshGlitch", () => {
  it("recognises the refresh and cookie-parse failures, not an ordinary missing session", () => {
    expect(isSessionRefreshGlitch(new Error("Invalid Refresh Token: Already Used"))).toBe(true);
    expect(isSessionRefreshGlitch({ message: "Invalid Refresh Token: Refresh Token Not Found", code: "refresh_token_not_found" })).toBe(true);
    expect(isSessionRefreshGlitch(new TypeError("Cannot create property 'user' on string 'x'"))).toBe(true);
    expect(isSessionRefreshGlitch(new Error("Auth session missing!"))).toBe(false);
    expect(isSessionRefreshGlitch(new Error("fetch failed"))).toBe(false);
  });
});
