import type { ReactNode } from "react";

/**
 * Renders the public legal pages. The source is a small Markdown subset
 * (headings, paragraphs, lists, tables, blockquotes, bold, code, links)
 * so the four policies stay readable without a Markdown dependency.
 */

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; header: string[]; rows: string[][] };

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("# ") ||
    line.startsWith("## ") ||
    line.startsWith("### ") ||
    line.startsWith("> ") ||
    line.startsWith("|") ||
    line.startsWith("- ")
  );
}

export function parseLegalMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!isSeparatorRow(lines[i])) rows.push(splitRow(lines[i]));
        i += 1;
      }
      const [header, ...body] = rows;
      if (header) blocks.push({ type: "table", header, rows: body });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const para = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  return blocks;
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      href={href}
      className="text-[#FFC857] underline underline-offset-2 hover:text-[#FFB733]"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

function earliest(text: string, from: number, markers: string[]): { at: number; marker: string } | null {
  let best: { at: number; marker: string } | null = null;
  for (const marker of markers) {
    const at = text.indexOf(marker, from);
    if (at === -1) continue;
    if (!best || at < best.at) best = { at, marker };
  }
  return best;
}

/** Bold, code and links, including a link nested in bold (or bold in a link label). Code stays literal. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let index = 0;

  while (i < text.length) {
    const next = earliest(text, i, ["**", "`", "["]);
    if (!next) {
      out.push(text.slice(i));
      break;
    }
    if (next.at > i) out.push(text.slice(i, next.at));
    const key = `${keyPrefix}-${index}`;
    index += 1;

    if (next.marker === "**") {
      const end = text.indexOf("**", next.at + 2);
      if (end === -1) {
        out.push(text.slice(next.at));
        break;
      }
      out.push(
        <strong key={key} className="font-semibold text-[#FFF1E8]">
          {renderInline(text.slice(next.at + 2, end), key)}
        </strong>,
      );
      i = end + 2;
      continue;
    }

    if (next.marker === "`") {
      const end = text.indexOf("`", next.at + 1);
      if (end === -1) {
        out.push(text.slice(next.at));
        break;
      }
      out.push(
        <code key={key} className="font-code text-[0.92em] text-[#FFF1E8]">
          {text.slice(next.at + 1, end)}
        </code>,
      );
      i = end + 1;
      continue;
    }

    const link = text.slice(next.at).match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    if (!link) {
      out.push("[");
      i = next.at + 1;
      continue;
    }
    out.push(
      <LegalLink key={key} href={link[2]}>
        {renderInline(link[1], key)}
      </LegalLink>,
    );
    i = next.at + link[0].length;
  }

  return out;
}

export function LegalDocument({ markdown }: { markdown: string }) {
  const blocks = parseLegalMarkdown(markdown);
  const title = blocks.find((block) => block.type === "h1");
  const body = blocks.filter((block) => block.type !== "h1");

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-20">
        {title && title.type === "h1" && (
          <h1 className="mt-3 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[48px]">
            {title.text}
          </h1>
        )}
        <div className="max-w-none text-[15px] leading-relaxed">
          {body.map((block, index) => {
            const key = `${block.type}-${index}`;
            if (block.type === "p" && block.text.startsWith("Last updated:")) {
              return (
                <p key={key} className="mt-4 mb-12 font-mono text-[12px] text-[#8A92BF]">
                  {block.text}
                </p>
              );
            }
            if (block.type === "h2") {
              return (
                <h2 key={key} className="mb-3 mt-10 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">
                  {renderInline(block.text, key)}
                </h2>
              );
            }
            if (block.type === "h3") {
              return (
                <h3 key={key} className="mb-2 mt-6 text-[16px] font-semibold text-white">
                  {renderInline(block.text, key)}
                </h3>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={key} className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  {block.items.map((item, itemIndex) => (
                    <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                  ))}
                </ul>
              );
            }
            if (block.type === "quote") {
              return (
                <blockquote
                  key={key}
                  className="mb-4 whitespace-pre-line border-l-2 border-[#FFA300]/50 bg-[#FFA300]/[0.06] px-4 py-3 text-muted-foreground"
                >
                  {renderInline(block.text, key)}
                </blockquote>
              );
            }
            if (block.type === "table") {
              return (
                <div key={key} className="mb-6 max-w-full overflow-x-auto rounded-2xl border border-white/[0.08]">
                  <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px] leading-snug">
                    <thead className="bg-[#212B4E]">
                      <tr>
                        {block.header.map((cell) => (
                          <th key={cell} scope="col" className="px-4 py-3 text-[12px] font-semibold text-[#FFF1E8]">
                            {renderInline(cell, `${key}-h-${cell}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, rowIndex) => (
                        <tr key={`${key}-r-${rowIndex}`} className="border-t border-white/[0.06]">
                          {row.map((cell, cellIndex) => {
                            const Cell = cellIndex === 0 ? "th" : "td";
                            return (
                              <Cell
                                key={`${key}-c-${rowIndex}-${cellIndex}`}
                                {...(cellIndex === 0 ? { scope: "row" as const } : {})}
                                className={`px-4 py-3 align-top text-muted-foreground ${cellIndex === 0 ? "font-medium text-[#FFF1E8]" : ""}`}
                              >
                                {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                              </Cell>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return (
              <p key={key} className="mb-4 text-muted-foreground">
                {renderInline(block.text, key)}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
