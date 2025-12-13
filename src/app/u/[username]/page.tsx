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
import { Button } from "@/components/ui/button";

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
    return { title: "User Not Found | SpriteLab" };
  }

  return {
    title: `${user.name || user.username} | SpriteLab`,
    description: user.bio || `Check out ${user.name || user.username}'s game assets on SpriteLab`,
  };
}

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
        return "bg-[#c084fc]/20 text-[#c084fc] border-[#c084fc]/30";
      case "UNLIMITED":
        return "bg-[#ffd93d]/20 text-[#ffd93d] border-[#ffd93d]/30";
      case "STARTER":
        return "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30";
      default:
        return "bg-white/10 text-white/60 border-white/10";
    }
  };

  return (
    <div className="min-h-screen bg-[#030305]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00ff88]/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#c084fc]/5 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image src="/logo.png" alt="SpriteLab" width={32} height={32} className="relative" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/community">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 border-2 border-[#00ff88]/30 flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || user.username || ""} className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-white/40" />
              )}
            </div>
            {/* Plan badge */}
            {user.plan !== "FREE" && (
              <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 text-[10px] font-bold rounded-full border ${getPlanBadgeColor(user.plan)}`}>
                {user.plan}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">
              {user.name || user.username}
            </h1>
            <p className="text-white/50 mb-3">@{user.username}</p>

            {user.bio && (
              <p className="text-white/70 mb-4 max-w-xl">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2 text-white/60">
                <Images className="w-4 h-4 text-[#00ff88]" />
                <span className="font-medium">{user._count.generations}</span>
                <span className="text-sm">public assets</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Heart className="w-4 h-4 text-[#ff4444]" />
                <span className="font-medium">{user.totalLikesReceived}</span>
                <span className="text-sm">likes received</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {user.website && (
                <a
                  href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
              {user.socialTwitter && (
                <a
                  href={`https://twitter.com/${user.socialTwitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  @{user.socialTwitter}
                </a>
              )}
              {user.socialGithub && (
                <a
                  href={`https://github.com/${user.socialGithub}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors"
                >
                  <Github className="w-4 h-4" />
                  {user.socialGithub}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Public Gallery */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00ff88]" />
            Public Gallery
          </h2>

          {user.generations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {user.generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#00ff88]/50 transition-all"
                >
                  <img
                    src={gen.imageUrl}
                    alt={gen.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-white/90 line-clamp-2 mb-1">{gen.prompt}</p>
                      <div className="flex items-center gap-1 text-white/60">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{gen.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
              <Images className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No public assets yet</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-white/40 mb-4">Want to create your own game assets?</p>
          <Button asChild>
            <Link href="/generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Creating for Free
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
