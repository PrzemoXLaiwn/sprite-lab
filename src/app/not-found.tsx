import Link from "next/link";
import Image from "next/image";
import { Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c084fc]/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#c084fc]/15 rounded-full blur-[200px] animate-float" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00d4ff]/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: "2s", animationDuration: "10s" }} />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Sad Coreling */}
        <div className="relative w-56 h-56 mx-auto mb-8">
          <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-[#c084fc]/20" />
          <Image
            src="/coreling-sad.png"
            alt="Sad Coreling"
            width={224}
            height={224}
            className="relative drop-shadow-2xl animate-float-sway"
          />
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl md:text-9xl font-display font-black mb-4 text-gradient-animated">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Oops! Page Not Found
        </h2>

        <p className="text-white/50 mb-10 text-lg leading-relaxed">
          Looks like Coreling got lost in the void. The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:shadow-xl hover:shadow-[#00ff88]/30 transition-all hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link
            href="/generate"
            className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 hover:border-[#00ff88]/30"
          >
            <Sparkles className="w-5 h-5 text-[#00ff88]" />
            Start Creating
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="mt-16 flex items-center justify-center gap-3">
          {["🎮", "🎨", "✨"].map((emoji, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg animate-float"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
