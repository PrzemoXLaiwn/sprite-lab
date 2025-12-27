"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  User,
  CreditCard,
  Bell,
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
} from "lucide-react";
import { fetchUserProfile, updateProfile, fetchCreditHistory, checkUsername, uploadAvatar, fetchEmailPreferences, updateEmailPreferences, EmailPreferences } from "./page.actions";
import Link from "next/link";
import { Mail, Megaphone, Package, Coins } from "lucide-react";

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

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const usernameTimeout = useRef<NodeJS.Timeout | null>(null);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({
    marketing: true,
    productUpdates: true,
    creditAlerts: true,
  });
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

  useEffect(() => {
    const loadData = async () => {
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
    };

    loadData();
  }, []);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameStatus("idle");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    if (usernameTimeout.current) {
      clearTimeout(usernameTimeout.current);
    }

    usernameTimeout.current = setTimeout(async () => {
      const result = await checkUsername(username);
      if (result.success) {
        setUsernameStatus(result.available ? "available" : "taken");
      }
    }, 500);

    return () => {
      if (usernameTimeout.current) {
        clearTimeout(usernameTimeout.current);
      }
    };
  }, [username, user?.username]);

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

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and profile</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your profile and public information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 border-2 border-[#00ff88]/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#00ff88]/60 transition-colors"
                    onClick={handleAvatarClick}
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-white/40" />
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <button
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00ff88] flex items-center justify-center hover:bg-[#00ff88]/80 transition-colors"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                  >
                    <Camera className="w-4 h-4 text-black" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="font-medium">Profile Picture</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF. Max 2MB</p>
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="mt-1.5"
                />
              </div>

              {/* Username */}
              <div>
                <Label htmlFor="username">Username</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    className="pl-8"
                    maxLength={20}
                  />
                  {usernameStatus !== "idle" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {usernameStatus === "taken" && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {usernameStatus === "invalid" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usernameStatus === "taken" && <span className="text-red-500">Username is taken</span>}
                  {usernameStatus === "invalid" && <span className="text-yellow-500">3-20 characters, letters, numbers, underscores</span>}
                  {usernameStatus === "available" && <span className="text-green-500">Username is available!</span>}
                  {usernameStatus === "idle" && "Your public profile URL"}
                </p>
                {user?.username && (
                  <Link
                    href={`/u/${user.username}`}
                    className="text-xs text-[#00ff88] hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    View public profile
                  </Link>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="mt-1.5 resize-none"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">{bio.length}/200</p>
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website">Website</Label>
                <div className="relative mt-1.5">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <div className="relative mt-1.5">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="twitter"
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value.replace("@", ""))}
                      placeholder="username"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="github">GitHub</Label>
                  <div className="relative mt-1.5">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="github"
                      type="text"
                      value={socialGithub}
                      onChange={(e) => setSocialGithub(e.target.value)}
                      placeholder="username"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Profile Visibility */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  {isProfilePublic ? (
                    <Eye className="w-5 h-5 text-[#00ff88]" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Public Profile</p>
                    <p className="text-sm text-muted-foreground">
                      {isProfilePublic ? "Anyone can view your profile" : "Your profile is hidden"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isProfilePublic}
                  onCheckedChange={setIsProfilePublic}
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveProfile}
                disabled={saving || usernameStatus === "taken" || usernameStatus === "checking"}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Credit History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Credit History
              </CardTitle>
              <CardDescription>Your recent credit transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {transaction.description || transaction.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount} credits
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No credit history yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Email Preferences */}
          <Card id="email">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Preferences
              </CardTitle>
              <CardDescription>Control what emails you receive from us</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Marketing Emails */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c084fc]/10 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-[#c084fc]" />
                    </div>
                    <div>
                      <p className="font-medium">Promotions & Offers</p>
                      <p className="text-sm text-muted-foreground">
                        Special deals, discounts, and credit offers
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailPrefs.marketing}
                    onCheckedChange={(checked) => handleEmailPrefChange("marketing", checked)}
                    disabled={savingEmailPrefs}
                  />
                </div>

                {/* Product Updates */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#00d4ff]" />
                    </div>
                    <div>
                      <p className="font-medium">Product Updates</p>
                      <p className="text-sm text-muted-foreground">
                        New features, improvements, and tips
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailPrefs.productUpdates}
                    onCheckedChange={(checked) => handleEmailPrefChange("productUpdates", checked)}
                    disabled={savingEmailPrefs}
                  />
                </div>

                {/* Credit Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-[#00ff88]" />
                    </div>
                    <div>
                      <p className="font-medium">Credit Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Reminders when your credits are running low
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={emailPrefs.creditAlerts}
                    onCheckedChange={(checked) => handleEmailPrefChange("creditAlerts", checked)}
                    disabled={savingEmailPrefs}
                  />
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  We'll always send you important account notifications like receipts and security alerts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Enable Two-Factor Authentication
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{user?.plan || "FREE"}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Credits Remaining</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{user?.credits || 0}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link href="/pricing">Buy More</Link>
                </Button>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Generations</p>
                <span className="text-2xl font-bold">
                  {user?._count?.generations || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  You're doing great!
                </p>
                <p className="text-lg font-semibold">
                  {user?._count?.generations || 0} assets created
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep creating amazing game assets
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
