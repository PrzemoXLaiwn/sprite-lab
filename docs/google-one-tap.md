# Google One Tap on the landing page

One Tap shows Google's "Continue as …" prompt to signed-out visitors on the
home page. It stays off (no script, nothing rendered) until
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set.

## What to set

1. **Google Cloud console → APIs & Services → Credentials.** Open the OAuth 2.0
   Client ID (type "Web application") that Supabase's Google provider already
   uses. Copy its **Client ID** (ends in `.apps.googleusercontent.com`).
2. In the same client, under **Authorized JavaScript origins**, add:
   - `https://www.sprite-lab.com`
   - `https://sprite-lab.com` (if the bare domain serves the site)
   - `http://localhost:3000` and `http://localhost` (only for local testing)
3. **Vercel → Project → Settings → Environment Variables:** add
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = the Client ID from step 1 (Production, and
   Preview if you want it there). It is a public value, not a secret. Redeploy:
   `NEXT_PUBLIC_*` values are baked in at build time.
4. **Supabase → Authentication → Sign In / Providers → Google:** the same
   Client ID must be in "Client IDs" (it is, if it's the one Supabase already
   uses). Leave "Skip nonce checks" **off**: the page sends a hashed nonce.

No other changes are needed: the CSP in `next.config.ts` already allows
`accounts.google.com/gsi/` for scripts, styles, frames and connections.

## How it works

- `src/components/landing/GoogleOneTap.tsx` loads
  `https://accounts.google.com/gsi/client`, creates a random nonce, gives Google
  its SHA-256 hash and passes the raw nonce with Google's ID token to
  `supabase.auth.signInWithIdToken({ provider: "google", token, nonce })`.
- After sign-in a brand-new account goes to `/auth/confirm` (same as the
  regular Google signup), an existing one to `/generate`.

## Known differences from the regular Google button

One Tap signs in on the client, so it skips `/auth/callback`. For a new
account that means: no welcome email, no referral code, and no name/avatar
copied from Google (the user row is created on the first app visit by
`getOrCreateUser`). Sharing the callback's sync code with One Tap needs your
OK because it would send the welcome email from a new path.

## Checking it

Open the home page signed out in Chrome with a Google account signed in to the
browser. The prompt appears top right (desktop) or as a bottom sheet (mobile).
If it doesn't: check the browser console for `[GSI_LOGGER]` messages (usually
"origin not allowed" → step 2), and that you haven't dismissed it recently
(Google enforces a cool-down after the user closes it).
