import { HOME_FAQ, ENGINE_GUIDES } from "@/data/geo-content";
import { GET as llms } from "../llms.txt/route";

// /llms-full.txt — llms.txt plus the FAQ and engine import guides, so an AI
// assistant can answer detailed questions without crawling every page.

export const dynamic = "force-static";

export async function GET() {
  const base = await llms().text();
  const body = `${base}
## Frequently asked questions
${HOME_FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Using SpriteLab sprites in Unity
${ENGINE_GUIDES.unity.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Using SpriteLab sprites in Godot 4
${ENGINE_GUIDES.godot.map((s, i) => `${i + 1}. ${s}`).join("\n")}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
