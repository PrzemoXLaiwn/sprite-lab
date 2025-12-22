"use client";

import { useState } from "react";
import { X, Heart, MessageSquare, Sparkles, Mail, Zap, Star, Bug, Send, Loader2, Rocket, Gift, Check } from "lucide-react";
import Link from "next/link";

export function WipBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug" | "other">("feature");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackText.trim(),
          email: feedbackEmail.trim() || undefined,
          context: JSON.stringify({
            source: "early_access_banner",
            page: typeof window !== "undefined" ? window.location.pathname : "unknown",
          }),
        }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setShowFeedbackForm(false);
          setSent(false);
          setFeedbackText("");
          setFeedbackEmail("");
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to send feedback:", err);
    } finally {
      setSending(false);
    }
  };

  const handleCloseFeedback = () => {
    setShowFeedbackForm(false);
    setSent(false);
    setFeedbackText("");
    setFeedbackEmail("");
  };

  return (
    <>
      {/* Early Access Banner - Positive & Exciting */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer group"
      >
        <div className="relative h-11 overflow-hidden bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500">
          {/* Animated shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />

          {/* Text overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <Rocket className="w-5 h-5 text-white animate-bounce" />
            <span className="text-white font-bold text-sm tracking-wide">
              <span className="text-yellow-300">EARLY ACCESS</span>
              <span className="hidden sm:inline text-white/90 mx-2">—</span>
              <span className="hidden sm:inline text-white/90">You're one of the first! Click for exclusive perks</span>
            </span>
            <Gift className="w-5 h-5 text-yellow-300" />
          </div>
        </div>
      </div>

      {/* Main Modal - Positive Messaging */}
      {isModalOpen && !showFeedbackForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-gradient-to-b from-[#0a0a0f] to-[#0f0f18] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 overflow-hidden"
          >
            {/* Gradient header */}
            <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500" />

            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Content */}
            <div className="p-8 pt-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  Early Access
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                You're One of the <span className="text-emerald-400">First!</span>
              </h2>

              <p className="text-gray-400 mb-6">
                Thanks for being an early SpriteLab user! Enjoy{" "}
                <span className="text-emerald-400 font-medium">10 free credits</span> as our thank you.
                We're adding new features every week based on your feedback.
              </p>

              {/* What's Coming */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">New Features Added Weekly</h3>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white">More art styles & categories</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white">Sprite sheet generation</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white">Animation support (coming soon!)</span>
                </div>
              </div>

              {/* Special Offer */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Gift className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Early Adopter Special</h3>
                    <p className="text-xs text-gray-400">
                      Up to 70% OFF launch pricing! Lock in these rates before they're gone.
                    </p>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-semibold text-sm transition-all"
                >
                  <Zap className="w-4 h-4" />
                  See Launch Pricing
                </Link>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Share Your Ideas
                </button>
                <a
                  href="mailto:support@sprite-lab.com?subject=Hello!"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Say Hello
                </a>
              </div>

              {/* Footer note - Positive! */}
              <p className="text-center text-xs text-gray-500 mt-6">
                Your feedback shapes SpriteLab's future. We read every message!
              </p>
            </div>

            {/* Gradient footer */}
            <div className="relative h-2 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500" />
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleCloseFeedback}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 rounded-3xl blur-lg opacity-30 animate-pulse" />

            <div className="relative bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

              {/* Close button */}
              <button
                onClick={handleCloseFeedback}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {sent ? (
                <div className="relative text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-10 h-10 text-emerald-400 fill-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Thank you!</h3>
                  <p className="text-white/60">Your feedback helps us build something amazing.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-white/10 mb-4">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">We'd love to hear from you</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Got Ideas?</h3>
                    <p className="text-white/60">Help us make SpriteLab even better!</p>
                  </div>

                  {/* Feedback Type */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { id: "feature", icon: Star, label: "Feature", color: "#ffd93d" },
                      { id: "bug", icon: Bug, label: "Bug", color: "#ff4444" },
                      { id: "other", icon: MessageSquare, label: "Other", color: "#00d4ff" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setFeedbackType(type.id as "feature" | "bug" | "other")}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                          feedbackType === type.id
                            ? "border-white/30 bg-white/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                        style={{
                          borderColor: feedbackType === type.id ? type.color : undefined,
                          backgroundColor: feedbackType === type.id ? `${type.color}15` : undefined,
                        }}
                      >
                        <type.icon className="w-4 h-4" style={{ color: type.color }} />
                        <span className={`text-sm font-medium ${feedbackType === type.id ? "text-white" : "text-white/60"}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={
                        feedbackType === "feature"
                          ? "I'd love to see..."
                          : feedbackType === "bug"
                          ? "I found an issue with..."
                          : "My thoughts..."
                      }
                      className="w-full h-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none"
                      maxLength={2000}
                      autoFocus
                    />
                  </div>

                  {/* Email (optional) */}
                  <div className="mb-5">
                    <input
                      type="email"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="Email (optional - for follow-up)"
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseFeedback}
                      className="flex-1 h-11 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-white font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackText.trim() || sending}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send
                        </>
                      )}
                    </button>
                  </div>

                  {/* Skip text */}
                  <p className="text-center text-xs text-white/30 mt-4">
                    Your feedback shapes SpriteLab's future!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
