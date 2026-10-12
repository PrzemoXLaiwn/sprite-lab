# SpriteLab — working rules

sprite-lab.com: AI game-asset generator for indie devs (sprites, animations, directions, engine packs). The owner talks in Polish; reply in Polish, keep code, UI copy and commits in English.

## Stack
Next.js 16 App Router · React · TypeScript · Tailwind v4 · shadcn/Radix · Prisma + Supabase (Postgres, auth) · Stripe · Cloudflare R2 · Vercel.
Image models via Runware (FLUX.2 klein, GPT Image Mini, Nano Banana); Claude for planning/rig joints; Cloudflare Workers AI as fallback.

## Commands
- `npm run typecheck` · `npm test` (Vitest, `src/**/*.test.ts`) · `npm run lint` · `npx next build`
- Deploy: `npx vercel --prod --yes` (then confirm with `npx vercel ls`)
- One-off DB/API scripts: `npx tsx --env-file=.env.local scripts/<file>.ts`, delete them afterwards
- A Stop hook (`.claude/hooks/verify.mjs`) runs typecheck + tests when TS files changed. Don't finish with it red.
- The local repo is for snapshots/rollback only. Publishing to GitHub goes through `scripts/push-github.ps1` and only when asked.

## Hard rules (money, people, secrets)
- Never send emails or campaigns without the owner's explicit OK. Never enable `RELAUNCH_EMAILS_ENABLED`.
- Secrets live only in `.env.local` / Vercel env. Never read, print or commit them; the GitHub repo is public.
- Every paid action must cost the user more than it costs us (see `src/config/pricing.test.ts`). When a model or price changes, update the test's provider costs first.
- Testing real generation spends real money (Runware, Anthropic) and the shared Cloudflare free allowance: keep it to the minimum that proves the point.
- Refund credits on every failure path; never charge for an output the user didn't get.
- Writes to `users.email_preferences` go through `mergeEmailPreferences` (jsonb merge), never a read-modify-write.
- Don't claim features we don't have (marketing, landing, TikTok scripts). No fake statistics.

## UI / design
- Dark UI, surfaces `#0B0D12` (page) / `#0E1016` (cards) / `#151922` (inputs, raised), accent orange `#FF8A3D`→`#FF9F43`, text `#ECEEF3` / `#C9CFDB` / `#8B93A5`. Fonts: Inter, Space Grotesk (display), JetBrains Mono (labels/numbers). **Never a pixel font.**
- It must not look AI-generated: no generic gradient hero blobs, no emoji bullets, no "Unlock the power of…" copy. Real product output (sprites, GIFs, sheets) is the decoration.
- Mobile first: works at 390px, 16px side gutter, no horizontal scroll, tap targets ≥40px. The bottom nav must keep Admin/Mod for staff.
- Check the rendered result (playwright-cli or headless Chrome, desktop 1280 + mobile 390) before saying a visual change is done. Charts follow the dataviz skill (validated palette, one axis, legend + table view).

## Engineering
- Read the surrounding code first and match its style; prefer small modules and explicit types over new dependencies.
- Pixel art must stay on whole pixels (nearest-neighbour, integer scales); animation must not flicker or change the character's size/colours between frames.
- Handle loading, empty and error states; give the user a readable message (e.g. capacity/limit errors → 503 with a friendly text).
- For bigger changes, compare 2–3 approaches briefly and pick one; prove it with a test, a build or a screenshot, and say plainly what was and wasn't verified.

## Game mechanics / engine output
- Define inputs, state, outputs and edge cases before coding a mechanic; keep logic separate from rendering.
- Engine exports (Godot `.tres`, Unity frames, GameMaker strips, `hitboxes.json`) must import without manual fixes. Test with a real sheet when changing `src/lib/export/engine-pack.ts`.
