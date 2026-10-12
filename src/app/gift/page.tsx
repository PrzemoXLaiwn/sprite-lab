import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";

export const metadata: Metadata = { title: "Your gift — SpriteLab", robots: { index: false, follow: false } };

export default async function GiftPage({ searchParams }: { searchParams: Promise<{ status?: string; amount?: string }> }) {
  const { status, amount } = await searchParams;
  const n = Math.max(0, Math.min(10000, Number(amount) || 0));
  const content =
    status === "claimed"
      ? { title: `+${n} credits added`, body: "They're already in your account — thank you for being one of our first Pro users. Have fun building your game!" }
      : status === "invalid"
        ? { title: "This link isn't valid", body: "The gift link looks incomplete. Try opening it again from the email, or just reply to it and we'll sort it out." }
        : { title: "Already claimed", body: "This gift has already been added to your account — enjoy!" };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0D12] px-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#12151C] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF8A3D]/12">
          <Gift className="h-7 w-7 text-[#FF8A3D]" />
        </div>
        <h1 className="mt-5 font-display text-[28px] font-semibold">{content.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9BA3B4]">{content.body}</p>
        <Link href="/generate" className="px-corners mt-7 inline-flex h-12 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-6 text-[15px] font-semibold text-white transition hover:brightness-110">
          Open SpriteLab <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
