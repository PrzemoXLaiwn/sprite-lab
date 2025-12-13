import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - SpriteLab",
    default: "Sign In - SpriteLab",
  },
  description: "Sign in or create an account to start generating game assets with AI. Free to try.",
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#030305]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#00ff88]/10 via-[#c084fc]/5 to-[#030305] relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-[10%] -left-32 w-[500px] h-[500px] bg-[#00ff88]/20 rounded-full blur-[150px] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[20%] -right-32 w-[400px] h-[400px] bg-[#c084fc]/20 rounded-full blur-[150px] animate-float" style={{ animationDelay: "2s", animationDuration: "10s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00d4ff]/10 rounded-full blur-[120px]" />

        {/* Decorative dots */}
        <div className="absolute top-[15%] right-[20%] w-2 h-2 rounded-full bg-[#00ff88] animate-pulse shadow-lg shadow-[#00ff88]" />
        <div className="absolute bottom-[25%] left-[15%] w-1.5 h-1.5 rounded-full bg-[#c084fc] animate-pulse shadow-lg shadow-[#c084fc]" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[45%] right-[10%] w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse shadow-lg shadow-[#00d4ff]" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-10 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image
                src="/logo.png"
                alt="SpriteLab"
                width={48}
                height={48}
                className="relative"
              />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">
              Sprite<span className="text-[#00ff88] text-glow">Lab</span>
            </span>
          </Link>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-black mb-4 leading-tight">
            Create Game Assets
            <span className="block text-gradient-animated mt-1">In Seconds</span>
          </h1>

          <p className="text-white/60 text-lg mb-10 max-w-md leading-relaxed">
            Join thousands of game developers using AI to create stunning
            sprites, 3D models, and game assets.
          </p>

          {/* Happy Coreling Mascot */}
          <div className="relative w-56 h-56 mb-10">
            <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-[#c084fc]/30" />
            <Image
              src="/coreling-happy.png"
              alt="Happy Coreling"
              width={224}
              height={224}
              className="relative animate-float-sway drop-shadow-2xl"
            />
          </div>

          {/* Asset preview */}
          <div className="flex flex-wrap gap-3">
            {["⚔️", "🛡️", "💎", "🧪", "🗝️", "📜"].map((emoji, i) => (
              <div
                key={i}
                className="group w-14 h-14 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff88]/50 flex items-center justify-center text-2xl animate-float transition-all hover:bg-[#00ff88]/5 cursor-default"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <span className="group-hover:scale-110 transition-transform">{emoji}</span>
              </div>
            ))}
          </div>

          {/* Trust badge */}
          <div className="mt-10 flex items-center gap-2 text-white/40 text-sm">
            <Sparkles className="w-4 h-4 text-[#00ff88]" />
            <span>Trusted by 10,000+ game developers</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00ff88]/5 via-transparent to-transparent" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Link href="/" className="flex items-center gap-2.5 group mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image
                  src="/logo.png"
                  alt="SpriteLab"
                  width={40}
                  height={40}
                  className="relative"
                />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                Sprite<span className="text-[#00ff88]">Lab</span>
              </span>
            </Link>

            {/* Mobile Coreling */}
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-2xl" />
              <Image
                src="/coreling-happy.png"
                alt="Happy Coreling"
                width={96}
                height={96}
                className="relative animate-float drop-shadow-xl"
              />
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
