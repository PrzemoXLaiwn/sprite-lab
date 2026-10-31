// GET  /api/st-packs/jobs — the last 20 jobs
// POST /api/st-packs/jobs — start a job from a chosen base
import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireStAdmin } from "../_lib/guard";
import { ST_EXPRESSION_LABELS, ST_EXPRESSION_SETS, resolveExpressionLabels } from "@/config/st-expressions";
import { ST_FRAMINGS, isOutputSize } from "@/config/st-packs";
import { getR2ObjectBuffer } from "@/lib/r2";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { baseKeyFor, createJob, listJobs, normaliseOptions, runWork, tick } from "@/lib/st-packs/jobs";
import { checkSfw } from "@/lib/st-packs/sfw";

export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  baseId: z.string().regex(UUID_RE),
  source: z.enum(["upload", "prompt"]),
  prompt: z.string().trim().max(600).optional(),
  styleNotes: z.string().trim().max(200).optional(),
  framing: z.enum(ST_FRAMINGS).default("waist"),
  expressionSet: z.enum(ST_EXPRESSION_SETS),
  labels: z.array(z.enum(ST_EXPRESSION_LABELS)).max(28).optional(),
  width: z.number().int(),
  height: z.number().int(),
  options: z.object({
    gif: z.boolean().optional(),
    png: z.boolean().optional(),
    grid: z.boolean().optional(),
    readme: z.boolean().optional(),
    matteMode: z.enum(["key", "runware"]).optional(),
    videoSeconds: z.number().int().min(3).max(5).optional(),
  }).default({}),
});

export async function GET() {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  return NextResponse.json({ jobs: await listJobs(20) });
}

export async function POST(request: Request) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const limited = await rateLimitUserAction("stpacks", guard.userId);
  if (limited.blocked) return limited.blocked;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job settings." }, { status: 400 });
  const b = parsed.data;
  if (!isOutputSize(b.width, b.height)) return NextResponse.json({ error: "Pick one of the listed output sizes." }, { status: 400 });
  const sfw = checkSfw(b.prompt, b.styleNotes);
  if (!sfw.ok) return NextResponse.json({ error: sfw.message }, { status: 400 });
  const labels = resolveExpressionLabels(b.expressionSet, b.labels ?? []);
  if (b.expressionSet === "custom" && labels.length < 1) return NextResponse.json({ error: "Pick at least one expression." }, { status: 400 });
  if (!(await getR2ObjectBuffer(baseKeyFor(b.baseId)))) return NextResponse.json({ error: "That base image is gone. Upload or generate it again." }, { status: 404 });

  const id = await createJob({
    userId: guard.userId,
    baseKey: baseKeyFor(b.baseId),
    source: b.source,
    prompt: b.prompt ?? null,
    styleNotes: b.styleNotes ?? null,
    framing: b.framing,
    expressionSet: b.expressionSet,
    labels,
    width: b.width,
    height: b.height,
    options: normaliseOptions(b.options),
  });
  const { work } = await tick(id);
  if (work.length) after(() => runWork(work));
  return NextResponse.json({ id });
}
