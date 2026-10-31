// GET /api/st-packs/base/[id] — a stored base still (admin only).
import { NextResponse } from "next/server";
import { requireStAdmin } from "../../_lib/guard";
import { getR2ObjectBuffer } from "@/lib/r2";
import { baseKeyFor } from "@/lib/st-packs/jobs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const png = await getR2ObjectBuffer(baseKeyFor(id));
  if (!png) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
