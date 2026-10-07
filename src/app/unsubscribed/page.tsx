import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email preferences — SpriteLab", robots: { index: false } };

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="pixel-grid flex min-h-screen items-center justify-center bg-[#0B0D12] px-4 text-[#ECEEF3]">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0E1016] p-8 text-center">
        <h1 className="font-display text-[22px] font-semibold text-white">
          {error ? "That link didn't work" : "You're unsubscribed"}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#A6ADBB]">
          {error
            ? "The link may be incomplete. You can turn emails off any time in Settings → Notifications."
            : "You won't get promotional emails from SpriteLab any more. Account emails (like password resets) still arrive."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/settings" className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-medium leading-10 text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white">
            Email settings
          </Link>
          <Link href="/" className="h-10 rounded-xl bg-white px-4 text-[13px] font-semibold leading-10 text-black hover:bg-white/90">
            Go to SpriteLab
          </Link>
        </div>
      </div>
    </main>
  );
}
