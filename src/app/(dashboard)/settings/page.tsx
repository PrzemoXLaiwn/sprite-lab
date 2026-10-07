"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  CreditCard,
  Shield,
  Loader2,
  Save,
  Check,
  History,
  Camera,
  Globe,
  Twitter,
  Github,
  Eye,
  EyeOff,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Mail,
  Megaphone,
  Package,
  Coins,
  Sun,
  CalendarDays,
  Gift,
  KeyRound,
  Trash2,
  Zap,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import { fetchUserProfile, updateProfile, fetchCreditHistory, checkUsername, uploadAvatar, fetchEmailPreferences, updateEmailPreferences, EmailPreferences } from "./page.actions";
import Link from "next/link";
import { ReferralCard } from "@/components/dashboard/ReferralCard";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  socialTwitter: string | null;
  socialGithub: string | null;
  isProfilePublic: boolean;
  credits: number;
  plan: string;
  createdAt: Date;
  _count: {
    generations: number;
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: Date;
}

// =============================================================================
// Design tokens (shared with the generate workspace)
// =============================================================================

const INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 text-[13px] text-white placeholder:text-[#7A8294] outline-none transition-colors focus:border-[#FF8A3D]/50 disabled:cursor-not-allowed disabled:text-[#8B93A5] disabled:opacity-70";
const BTN_PRIMARY =
  "px-corners inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";
const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white";
const LABEL = "mb-1.5 block text-[12px] font-medium text-[#C9CFDB]";
const HINT = "mt-1.5 text-[12px] text-[#8B93A5]";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Plan & billing", icon: CreditCard },
  { id: "history", label: "Credit history", icon: History },
  { id: "email", label: "Email notifications", icon: Mail },
  { id: "referrals", label: "Referrals", icon: Gift },
  { id: "security", label: "Security", icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const EMAIL_PREF_ROWS: Array<{
  key: keyof EmailPreferences;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "marketing", title: "Promotions & offers", description: "Special deals, discounts, and credit offers", icon: Megaphone },
  { key: "productUpdates", title: "Product updates", description: "New features, improvements, and tips", icon: Package },
  { key: "creditAlerts", title: "Credit alerts", description: "Reminders when your credits are running low", icon: Coins },
  { key: "dailyReminders", title: "Daily reminders", description: "Morning motivation with tips and trending categories", icon: Sun },
  { key: "weeklyDigest", title: "Weekly digest", description: "Your stats, community highlights, and new features", icon: CalendarDays },
];

function planLabel(plan?: string) {
  const p = (plan || "FREE").toUpperCase();
  if (p === "UNLIMITED") return "Studio";
  if (p === "PRO") return "Pro";
  if (p === "STARTER") return "Starter";
  if (p === "LIFETIME") return "Lifetime";
  return "Free";
}

// =============================================================================
// Small presentational helpers
// =============================================================================

function Section({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6 md:scroll-mt-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-[13px] text-[#8B93A5]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-[#FF8A3D]/40 bg-[#FF8A3D]" : "border-white/[0.08] bg-white/[0.08]"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform ${
          checked ? "translate-x-[21px]" : "translate-x-[1px]"
        }`}
      />
    </button>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="hidden space-y-1.5 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-6">
              <div className="mb-2 h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
              <div className="mb-6 h-3 w-60 animate-pulse rounded bg-white/[0.04]" />
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-xl bg-[#151922]" />
                <div className="h-10 animate-pulse rounded-xl bg-[#151922]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialGithub, setSocialGithub] = useState("");
  const [isProfilePublic, setIsProfilePublic] = useState(true);

  // Username validation. "idle" / "invalid" are derived synchronously from
  // the input; only the async availability result is stored in state.
  const [usernameCheck, setUsernameCheck] = useState<{ name: string; available: boolean } | null>(null);
  const usernameTimeout = useRef<NodeJS.Timeout | null>(null);
  const usernameUnchanged = !username || username === user?.username;
  const usernameInvalid = !usernameUnchanged && !/^[a-z0-9_]{3,20}$/.test(username.toLowerCase());
  const usernameStatus: "idle" | "checking" | "available" | "taken" | "invalid" = usernameUnchanged
    ? "idle"
    : usernameInvalid
    ? "invalid"
    : usernameCheck?.name === username
    ? usernameCheck.available
      ? "available"
      : "taken"
    : "checking";

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({
    marketing: true,
    productUpdates: true,
    creditAlerts: true,
    dailyReminders: false,
    weeklyDigest: true,
  });
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

  // Section nav
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profileResult, transactionsResult, emailPrefsResult] = await Promise.all([
      fetchUserProfile(),
      fetchCreditHistory(),
      fetchEmailPreferences(),
    ]);

    if (profileResult.success && profileResult.user) {
      const u = profileResult.user as UserData;
      setUser(u);
      setName(u.name || "");
      setUsername(u.username || "");
      setBio(u.bio || "");
      setWebsite(u.website || "");
      setSocialTwitter(u.socialTwitter || "");
      setSocialGithub(u.socialGithub || "");
      setIsProfilePublic(u.isProfilePublic ?? true);
    }

    if (transactionsResult.success) {
      setTransactions(transactionsResult.transactions);
    }

    if (emailPrefsResult.success && emailPrefsResult.preferences) {
      setEmailPrefs(emailPrefsResult.preferences);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(loadData, 0);
    return () => clearTimeout(t);
  }, [loadData]);

  // Check username availability with debounce
  useEffect(() => {
    if (usernameUnchanged || usernameInvalid) return;

    if (usernameTimeout.current) {
      clearTimeout(usernameTimeout.current);
    }

    usernameTimeout.current = setTimeout(async () => {
      const result = await checkUsername(username);
      if (result.success) {
        setUsernameCheck({ name: username, available: !!result.available });
      }
    }, 500);

    return () => {
      if (usernameTimeout.current) {
        clearTimeout(usernameTimeout.current);
      }
    };
  }, [username, usernameUnchanged, usernameInvalid]);

  // Once content is rendered: honour a deep link (/settings#billing) and
  // keep the left nav in sync with the section in view.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const el = document.getElementById(hash);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    }
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId);
      },
      { rootMargin: "-15% 0px -65% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const jumpTo = (id: SectionId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setActiveSection(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const result = await updateProfile({
      name: name.trim() || undefined,
      username: username.trim() || undefined,
      bio: bio.trim() || undefined,
      website: website.trim() || undefined,
      socialTwitter: socialTwitter.trim() || undefined,
      socialGithub: socialGithub.trim() || undefined,
      isProfilePublic,
    });

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadData();
    } else {
      const errorMsg = typeof result.error === "string" ? result.error : "Failed to save";
      setError(errorMsg);
    }

    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAvatar(formData);

    if (result.success) {
      await loadData();
    } else {
      setError(result.error || "Failed to upload avatar");
    }

    setUploadingAvatar(false);
  };

  const handleEmailPrefChange = async (key: keyof EmailPreferences, value: boolean) => {
    setSavingEmailPrefs(true);
    const newPrefs = { ...emailPrefs, [key]: value };
    setEmailPrefs(newPrefs);

    const result = await updateEmailPreferences({ [key]: value });
    if (!result.success) {
      // Revert on failure
      setEmailPrefs(emailPrefs);
      setError(result.error || "Failed to update email preferences");
    }
    setSavingEmailPrefs(false);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !user) {
    return <SettingsSkeleton />;
  }

  const generations = user?._count?.generations || 0;
  const credits = user?.credits || 0;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 text-[#ECEEF3] lg:px-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-[13px] text-[#8B93A5]">Manage your profile, plan and notifications</p>
      </div>

      {/* Mobile section nav */}
      <nav className="-mx-5 mb-5 flex gap-1.5 overflow-x-auto px-5 pb-1 lg:hidden" aria-label="Settings sections">
        {SECTIONS.map((s) => {
          const active = activeSection === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={jumpTo(s.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                active
                  ? "border-[#FF8A3D]/50 bg-[#FF8A3D]/10 text-white"
                  : "border-white/[0.08] bg-white/[0.04] text-[#8B93A5] hover:text-white"
              }`}
            >
              {s.label}
            </a>
          );
        })}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Desktop section nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-0.5" aria-label="Settings sections">
            <p className="mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[#7A8294]">~/settings</p>
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={jumpTo(s.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-[12px] transition-colors ${
                    active ? "bg-white/[0.07] text-white" : "text-[#8B93A5] hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <s.icon className={`h-4 w-4 ${active ? "text-[#FF8A3D]" : ""}`} />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss"
                className="rounded-md p-0.5 text-red-200/70 transition-colors hover:bg-red-500/10 hover:text-red-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Profile ─────────────────────────────────────────────── */}
          <Section id="profile" title="Profile" description="Update your profile and public information">
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    aria-label="Change profile picture"
                    className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[#151922] transition-colors hover:border-white/20"
                  >
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-[#7A8294]" />
                    )}
                    {uploadingAvatar && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </span>
                    )}
                  </button>
                  <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0E1016] bg-[#FF8A3D]">
                    <Camera className="h-3 w-3 text-white" />
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="text-[13px] font-medium text-white hover:text-[#FFB27A] disabled:opacity-60"
                  >
                    {uploadingAvatar ? "Uploading…" : "Change picture"}
                  </button>
                  <p className="mt-0.5 text-[12px] text-[#8B93A5]">JPG, PNG, WebP or GIF. Max 2MB</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Display Name */}
                <div>
                  <label htmlFor="name" className={LABEL}>Display name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    className={INPUT}
                  />
                </div>

                {/* Email (readonly) */}
                <div>
                  <label htmlFor="email" className={LABEL}>Email</label>
                  <input id="email" type="email" value={user?.email || ""} disabled className={INPUT} />
                  <p className={HINT}>Email cannot be changed</p>
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className={LABEL}>Username</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#7A8294]">@</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    className={`${INPUT} pl-7 pr-9 ${
                      usernameStatus === "taken" ? "border-red-400/40 focus:border-red-400/60" : ""
                    }`}
                    maxLength={20}
                  />
                  {usernameStatus !== "idle" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-[#8B93A5]" />}
                      {usernameStatus === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                      {usernameStatus === "taken" && <AlertCircle className="h-4 w-4 text-red-300" />}
                      {usernameStatus === "invalid" && <AlertCircle className="h-4 w-4 text-amber-300" />}
                    </div>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <p className="text-[#8B93A5]">
                    {usernameStatus === "taken" && <span className="text-red-200">Username is taken</span>}
                    {usernameStatus === "invalid" && <span className="text-amber-200">3-20 characters, letters, numbers, underscores</span>}
                    {usernameStatus === "available" && <span className="text-emerald-200">Username is available</span>}
                    {usernameStatus === "checking" && "Checking availability…"}
                    {usernameStatus === "idle" && "Your public profile URL"}
                  </p>
                  {user?.username && (
                    <Link
                      href={`/u/${user.username}`}
                      className="inline-flex items-center gap-1 font-medium text-[#FFB27A] hover:text-[#FF8A3D]"
                    >
                      <LinkIcon className="h-3 w-3" />
                      View public profile
                    </Link>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className={LABEL}>Bio</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className={`${INPUT} resize-none leading-relaxed`}
                  rows={3}
                  maxLength={200}
                />
                <p className="mt-1.5 text-right font-mono text-[11px] tabular-nums text-[#7A8294]">{bio.length}/200</p>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className={LABEL}>Website</label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="twitter" className={LABEL}>Twitter</label>
                  <div className="relative">
                    <Twitter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
                    <input
                      id="twitter"
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value.replace("@", ""))}
                      placeholder="username"
                      className={`${INPUT} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="github" className={LABEL}>GitHub</label>
                  <div className="relative">
                    <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8294]" />
                    <input
                      id="github"
                      type="text"
                      value={socialGithub}
                      onChange={(e) => setSocialGithub(e.target.value)}
                      placeholder="username"
                      className={`${INPUT} pl-9`}
                    />
                  </div>
                </div>
              </div>

              {/* Profile Visibility */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#151922] px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  {isProfilePublic ? (
                    <Eye className="h-4 w-4 shrink-0 text-[#FF8A3D]" />
                  ) : (
                    <EyeOff className="h-4 w-4 shrink-0 text-[#8B93A5]" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white">Public profile</p>
                    <p className="text-[12px] text-[#8B93A5]">
                      {isProfilePublic ? "Anyone can view your profile" : "Your profile is hidden"}
                    </p>
                  </div>
                </div>
                <Toggle checked={isProfilePublic} onChange={setIsProfilePublic} label="Public profile" />
              </div>
            </div>

            {/* Save */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.06] pt-5">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-200">
                  <Check className="h-3.5 w-3.5" /> Changes saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || usernameStatus === "taken" || usernameStatus === "checking"}
                className={BTN_PRIMARY}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </Section>

          {/* ── Plan & billing ──────────────────────────────────────── */}
          <Section
            id="billing"
            title="Plan & billing"
            description="Your current plan, credit balance and usage"
            action={
              <Link href="/pricing" className={`${BTN_PRIMARY} hidden shrink-0 py-2 sm:inline-flex`}>
                <Sparkles className="h-4 w-4" /> Upgrade
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#151922] p-4">
                <p className="text-[12px] text-[#8B93A5]">Current plan</p>
                <p className="mt-1 font-display text-[24px] font-semibold text-white">{planLabel(user?.plan)}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#151922] p-4">
                <p className="flex items-center gap-1.5 text-[12px] text-[#8B93A5]">
                  <Zap className="h-3.5 w-3.5 text-[#FF8A3D]" /> Credits remaining
                </p>
                <p className="mt-1 font-sans tracking-tight text-[24px] font-semibold tabular-nums text-white">{credits}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#151922] p-4">
                <p className="text-[12px] text-[#8B93A5]">Total generations</p>
                <p className="mt-1 font-sans tracking-tight text-[24px] font-semibold tabular-nums text-white">{generations}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#8B93A5]">
                {generations === 0 ? (
                  <>
                    No assets yet —{" "}
                    <Link href="/generate" className="font-medium text-[#FFB27A] hover:text-[#FF8A3D]">
                      generate your first one
                    </Link>
                    .
                  </>
                ) : (
                  <>{generations} assets created so far. Keep going.</>
                )}
              </p>
              <div className="flex gap-2">
                <Link href="/pricing" className={`${BTN_PRIMARY} flex-1 py-2 sm:hidden`}>
                  <Sparkles className="h-4 w-4" /> Upgrade
                </Link>
                <Link href="/pricing" className={`${BTN_SECONDARY} flex-1 py-2 sm:flex-none`}>
                  <Coins className="h-4 w-4" /> Buy credits
                </Link>
              </div>
            </div>
          </Section>

          {/* ── Credit history ──────────────────────────────────────── */}
          <Section
            id="history"
            title="Credit history"
            description="Your 10 most recent credit transactions"
            action={
              <Link href="/usage" className="hidden shrink-0 items-center gap-1 text-[12px] font-medium text-[#8B93A5] hover:text-white sm:inline-flex">
                Usage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {transactions.length > 0 ? (
              <ul className="-mx-2 divide-y divide-white/[0.06]">
                {transactions.slice(0, 10).map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#ECEEF3]">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#7A8294]">{formatDate(transaction.createdAt)}</p>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[12px] font-semibold tabular-nums ${
                        transaction.amount > 0 ? "text-emerald-300" : "text-[#C9CFDB]"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount} credits
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-10 text-center">
                <History className="mb-2 h-5 w-5 text-[#7A8294]" />
                <p className="text-[13px] font-medium text-[#C9CFDB]">No credit history yet</p>
                <p className="mt-0.5 text-[12px] text-[#8B93A5]">Purchases and generations will show up here.</p>
              </div>
            )}
          </Section>

          {/* ── Email notifications ─────────────────────────────────── */}
          <Section
            id="email"
            title="Email notifications"
            description="Control what emails you receive from us"
            action={savingEmailPrefs ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8B93A5]" /> : undefined}
          >
            <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#151922]">
              {EMAIL_PREF_ROWS.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                      <row.icon className="h-4 w-4 text-[#C9CFDB]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{row.title}</p>
                      <p className="text-[12px] text-[#8B93A5]">{row.description}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={emailPrefs[row.key]}
                    onChange={(checked) => handleEmailPrefChange(row.key, checked)}
                    disabled={savingEmailPrefs}
                    label={row.title}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-[#7A8294]">
              We&apos;ll always send you important account notifications like receipts and security alerts.
            </p>
          </Section>

          {/* ── Referrals ───────────────────────────────────────────── */}
          <div id="referrals" className="scroll-mt-16 md:scroll-mt-6">
            <ReferralCard />
          </div>

          {/* ── Security ────────────────────────────────────────────── */}
          <Section id="security" title="Security" description="Manage your password and account">
            <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#151922]">
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                    <KeyRound className="h-4 w-4 text-[#C9CFDB]" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-white">Password</p>
                    <p className="text-[12px] text-[#8B93A5]">Send yourself a reset link to set a new password</p>
                  </div>
                </div>
                <Link href="/reset-password" className={`${BTN_SECONDARY} py-2`}>
                  Change password
                </Link>
              </div>
              {/* Two-factor authentication intentionally not surfaced.
                  Add the row here once Supabase MFA is wired up — until
                  then a "Coming Soon" placeholder reads as broken. */}
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/[0.06]">
                    <Trash2 className="h-4 w-4 text-red-200" />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-white">Delete account</p>
                    <p className="text-[12px] text-[#8B93A5]">Permanently remove your account, generations and projects</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-2 text-[13px] font-medium text-red-200 transition-colors hover:bg-red-500/[0.12]"
                  onClick={() => {
                    const ok = window.confirm(
                      "Delete your account?\n\nThis cannot be undone. All your generations and projects will be removed.\n\nIf you'd like a refund or have feedback, email support@sprite-lab.com first."
                    );
                    if (!ok) return;
                    window.location.href = "mailto:support@sprite-lab.com?subject=Delete%20my%20SpriteLab%20account&body=Please%20delete%20my%20account.";
                  }}
                >
                  Delete account
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
