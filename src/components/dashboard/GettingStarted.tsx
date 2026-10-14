"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, X, Sparkles, Film, FolderOpen, Coins } from "lucide-react";
import { QUEST_BY_ID } from "@/lib/quests/definitions";

const HIDE_KEY = "sl:getting-started:hidden";
const COSTS_KEY = "sl:getting-started:costs";
const OPEN_KEY = "sl:getting-started:open";

// Tool pages have a sticky action button above the tab bar on phones; the
// card would cover it, so on those pages it only shows from md up.
const TOOL_PATHS = ["/generate", "/animate", "/edit", "/remove-bg", "/upscale", "/variations"];

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/**
 * First-steps checklist for new users. Steps tick off from real account
 * activity (passed from the server); "what things cost" ticks when opened.
 * Dismissable; disappears once everything is done.
 */
export function GettingStarted({ done }: { done: { generate: boolean; animate: boolean; project: boolean } }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [costsSeen, setCostsSeen] = useState(false);
  const [open, setOpen] = useState(true);
  // Server-rendered "done" is from page load; refresh after each generation
  // (credits change) so a finished step ticks off right away
  const [live, setLive] = useState<{ generate: boolean; animate: boolean; project: boolean } | null>(null);
  useEffect(() => {
    const refresh = () => {
      fetch("/api/quests", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { quests?: { id: string; complete: boolean }[] } | null) => {
          if (!d?.quests) return;
          const done = (id: string) => d.quests!.some((q) => q.id === id && q.complete);
          setLive({ generate: done("first_sprite"), animate: done("first_animation"), project: done("first_project") });
        })
        .catch(() => { /* keep the server values */ });
    };
    window.addEventListener("credits-updated", refresh);
    return () => window.removeEventListener("credits-updated", refresh);
  }, []);
  const isDone = { generate: done.generate || !!live?.generate, animate: done.animate || !!live?.animate, project: done.project || !!live?.project };

  // Read per-browser state after mount (localStorage isn't available during SSR)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setHidden(read(HIDE_KEY) === "1");
      setCostsSeen(read(COSTS_KEY) === "1");
      const o = read(OPEN_KEY);
      // Collapsed by default on phones so it never covers the workspace
      setOpen(o ? o === "1" : window.innerWidth >= 768);
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const steps = [
    { id: "generate", label: "Create your first sprite", hint: "Describe it in one sentence", href: "/generate", icon: Sparkles, ok: isDone.generate, reward: QUEST_BY_ID.first_sprite.reward },
    { id: "animate", label: "Animate a sprite", hint: "Walk, attack, breathe fire…", href: "/animate", icon: Film, ok: isDone.animate, reward: QUEST_BY_ID.first_animation.reward },
    { id: "project", label: "Start a project", hint: "Keep your game's assets together", href: "/projects", icon: FolderOpen, ok: isDone.project, reward: QUEST_BY_ID.first_project.reward },
    { id: "costs", label: "See what things cost", hint: "Credits explained in 1 minute", href: "/how-it-works#credits", icon: Coins, ok: costsSeen, reward: 0 },
  ];
  const count = steps.filter((s) => s.ok).length;
  const onTool = TOOL_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
  const visible = ready && !hidden && count < steps.length && !pathname?.startsWith("/admin") && !pathname?.startsWith("/moderator");

  // On phones the card sits above the tab bar: reserve room for it so it
  // never covers the last button of a page (see .app-main in globals.css).
  useEffect(() => {
    const root = document.documentElement;
    if (visible && !onTool) root.setAttribute("data-getting-started", "");
    else root.removeAttribute("data-getting-started");
    return () => root.removeAttribute("data-getting-started");
  }, [visible, onTool]);

  if (!visible) return null;

  const toggle = () => { const next = !open; setOpen(next); write(OPEN_KEY, next ? "1" : "0"); };
  const dismiss = () => { setHidden(true); write(HIDE_KEY, "1"); };

  return (
    <aside aria-label="Getting started"
      className={`fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 md:bottom-5 md:left-[92px] md:right-auto md:w-[300px] ${onTool ? "max-md:hidden" : ""}`}>
      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#161E39]/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur">
        <div className="flex items-center gap-2 py-1.5 pl-3.5 pr-2.5">
          <button type="button" onClick={toggle} aria-expanded={open} aria-controls="getting-started-steps" className="flex min-h-10 flex-1 items-center gap-2.5 rounded-lg text-left">
            <span className="relative h-7 w-7 shrink-0" aria-hidden>
              <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#FFA300" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(count / steps.length) * 94.2} 94.2`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-white">{count}/{steps.length}</span>
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-white">Getting started</span>
              <span className="block text-[11.5px] text-[#9AA1CC]">{steps.length - count} quick step{steps.length - count === 1 ? "" : "s"} left</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-[#9AA1CC] transition-transform ${open ? "" : "rotate-180"}`} />
          </button>
          <button type="button" onClick={dismiss} title="Hide" aria-label="Hide getting started"
            className="-mr-1.5 flex h-10 w-10 items-center justify-center rounded-lg text-[#9AA1CC] transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {open && (
          <ul id="getting-started-steps" className="border-t border-white/[0.06] p-1.5">
            {steps.map((s) => (
              <li key={s.id}>
                <Link href={s.href}
                  onClick={() => { if (s.id === "costs") { setCostsSeen(true); write(COSTS_KEY, "1"); } }}
                  className="group flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.05]">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    s.ok ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "border-white/[0.1] text-[#9AA1CC] group-hover:text-white"
                  }`}>
                    {s.ok ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] ${s.ok ? "text-[#8A92BF] line-through" : "text-white"}`}>{s.label}</span>
                    {!s.ok && <span className="block truncate text-[11.5px] text-[#8A92BF]">{s.hint}</span>}
                  </span>
                  {s.reward > 0 && <span className="shrink-0 font-mono text-[11.5px] font-semibold text-[#FFC857]">+{s.reward} cr</span>}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/quests" className="mt-1 flex min-h-10 items-center justify-center rounded-xl border-t border-white/[0.06] text-[12.5px] font-medium text-[#FFC857] transition hover:bg-white/[0.05]">
                Claim your rewards in Quests
              </Link>
            </li>
          </ul>
        )}
      </div>
    </aside>
  );
}
