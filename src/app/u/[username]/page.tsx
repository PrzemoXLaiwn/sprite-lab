import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Calendar,
  Globe,
  Twitter,
  Github,
  Heart,
  Images,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { CHECKERBOARD, isPixelStyleId } from "@/components/community/shared";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function getProfile(username: string) {
  const user = await prisma.user.findFirst({
    where: {
      username: username.toLowerCase(),
      isProfilePublic: true,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      bio: true,
      website: true,
      socialTwitter: true,
      socialGithub: true,
      plan: true,
      badges: true,
      totalLikesReceived: true,
      createdAt: true,
      generations: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          styleId: true,
          likes: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          generations: { where: { isPublic: true } },
        },
      },
    },
  });

  return user;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { username } = await params;
  const user = await getProfile(username);

  if (!user) {
    return { title: { absolute: "User Not Found | SpriteLab" }, robots: { index: false } };
  }

  const display = user.name || user.username;
  return {
    // absolute: the root template would add a second "| SpriteLab"
    title: { absolute: `${display} — game assets made with SpriteLab` },
    description: user.bio || `Sprites and game assets ${display} made with SpriteLab, the AI game asset generator.`,
    alternates: { canonical: `https://www.sprite-lab.com/u/${encodeURIComponent(user.username ?? username)}` },
  };
}

const SOCIAL_LINK =
  "inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[12px] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white";

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const user = await getProfile(username);

  if (!user) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "PRO":
        return "border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#FFB27A]";
      case "UNLIMITED":
        return "border-amber-400/20 bg-amber-500/[0.06] text-amber-200";
      case "STARTER":
        return "border-sky-400/20 bg-sky-500/[0.06] text-sky-200";
      default:
        return "border-white/[0.08] bg-white/[0.04] text-[#C9CFDB]";
    }
  };

  const stats = [
    { label: "public assets", value: user._count.generations, icon: Images },
    { label: "likes received", value: user.totalLikesReceived, icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0E1016]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={26} height={26} />
            <span className="font-display text-[16px] font-semibold tracking-normal text-white">
              Sprite<span className="text-[#FF8A3D]">Lab</span>
            </span>
          </Link>
          <Link
            href="/community"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8">
        {/* Profile header */}
        <section className="pixel-grid rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151922]">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name || user.username || ""} className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-[#7A8294]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[26px] font-semibold leading-tight tracking-normal text-white">
                  {user.name || user.username}
                </h1>
                {user.plan !== "FREE" && (
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-medium ${getPlanBadgeColor(user.plan)}`}>
                    {user.plan}
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[12px] text-[#8B93A5]">@{user.username}</p>

              {user.bio && (
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#C9CFDB]">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-baseline gap-2">
                    <span className="font-sans tracking-tight text-[22px] font-semibold leading-none tracking-normal text-white tabular-nums">{s.value}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-[#8B93A5]">
                      <s.icon className="h-3 w-3 text-[#FF8A3D]" />
                      {s.label}
                    </span>
                  </div>
                ))}
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8B93A5]">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDate(user.createdAt)}
                </span>
              </div>

              {/* Social links */}
              {(user.website || user.socialTwitter || user.socialGithub) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {user.website && (
                    <a
                      href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={SOCIAL_LINK}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                  {user.socialTwitter && (
                    <a
                      href={`https://twitter.com/${user.socialTwitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={SOCIAL_LINK}
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      @{user.socialTwitter}
                    </a>
                  )}
                  {user.socialGithub && (
                    <a
                      href={`https://github.com/${user.socialGithub}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={SOCIAL_LINK}
                    >
                      <Github className="h-3.5 w-3.5" />
                      {user.socialGithub}
                    </a>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/generate"
              className="px-corners flex h-10 shrink-0 items-center justify-center gap-2 self-start bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 text-[13px] font-semibold text-white transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Create your own
            </Link>
          </div>
        </section>

        {/* Public gallery */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Public gallery</h2>
            {user._count.generations > user.generations.length && (
              <span className="font-mono text-[11px] text-[#7A8294]">
                latest {user.generations.length} of {user._count.generations}
              </span>
            )}
          </div>

          {user.generations.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {user.generations.map((gen) => (
                <div
                  key={gen.id}
                  title={gen.prompt}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151922] transition-colors hover:border-white/20"
                  style={CHECKERBOARD}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gen.imageUrl}
                    alt={gen.prompt}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-contain p-[10%] pb-[20%] transition-transform duration-300 group-hover:scale-105 ${isPixelStyleId(gen.styleId) ? "pixel-perfect" : ""}`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
                    <p className="line-clamp-1 text-[12px] font-medium text-white">{gen.prompt}</p>
                    <div className="mt-1 flex items-center gap-1 text-[#C9CFDB]">
                      <Heart className={`h-3 w-3 ${gen.likes > 0 ? "fill-rose-400 text-rose-400" : ""}`} />
                      <span className="font-mono text-[11px] tabular-nums">{gen.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0E1016] px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Images className="h-5 w-5 text-[#8B93A5]" />
              </div>
              <p className="text-[15px] font-semibold text-white">No public assets yet</p>
              <p className="mt-1 text-[13px] text-[#8B93A5]">Shared sprites will show up here.</p>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="mt-12 flex flex-col items-center rounded-2xl border border-white/[0.06] bg-[#0E1016] px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-white">Want to create your own game assets?</p>
          <p className="mt-1 text-[13px] text-[#8B93A5]">Generate sprites from a text prompt in seconds.</p>
          <Link
            href="/generate"
            className="px-corners mt-5 flex h-10 items-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-5 text-[13px] font-semibold text-white transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" />
            Start creating for free
          </Link>
        </section>
      </main>
    </div>
  );
}
