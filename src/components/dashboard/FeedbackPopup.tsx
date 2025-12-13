"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Star, Bug, Send, Loader2, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Show popup after X days since last shown (or first visit)
const DAYS_BETWEEN_POPUPS = 7;
const STORAGE_KEY = "spritelab_feedback_last_shown";
const FEEDBACK_SUBMITTED_KEY = "spritelab_feedback_submitted";
const FIRST_VISIT_KEY = "spritelab_first_visit";

export function FeedbackPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug" | "other">("feature");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Don't show if user already submitted feedback
    const hasSubmitted = localStorage.getItem(FEEDBACK_SUBMITTED_KEY);
    if (hasSubmitted) return;

    // Check first visit
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) {
      // First visit - mark it and don't show popup yet
      localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
      return;
    }

    // Check last shown time
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    const firstVisitTime = parseInt(firstVisit, 10);

    // Wait at least 3 days after first visit before showing
    const daysSinceFirstVisit = (now - firstVisitTime) / (1000 * 60 * 60 * 24);
    if (daysSinceFirstVisit < 3) return;

    // If never shown, show it
    if (!lastShown) {
      // Delay popup slightly so it doesn't appear immediately on page load
      const timer = setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem(STORAGE_KEY, now.toString());
      }, 5000); // 5 second delay

      return () => clearTimeout(timer);
    }

    // Check if enough days have passed
    const lastShownTime = parseInt(lastShown, 10);
    const daysSinceLastShown = (now - lastShownTime) / (1000 * 60 * 60 * 24);

    if (daysSinceLastShown >= DAYS_BETWEEN_POPUPS) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem(STORAGE_KEY, now.toString());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = async () => {
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
            source: "periodic_popup",
            page: typeof window !== "undefined" ? window.location.pathname : "unknown",
          }),
        }),
      });

      if (response.ok) {
        setSent(true);
        // Mark that user has submitted feedback (won't show again)
        localStorage.setItem(FEEDBACK_SUBMITTED_KEY, "true");
        setTimeout(() => {
          setIsVisible(false);
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to send feedback:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#c084fc] via-[#00d4ff] to-[#00ff88] rounded-3xl blur-lg opacity-30 animate-pulse" />

        <div className="relative bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#c084fc]/5 via-transparent to-[#00d4ff]/5" />
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#00ff88]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {sent ? (
            <div className="relative text-center py-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                <Heart className="w-10 h-10 text-[#00ff88] fill-[#00ff88]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Thank you!</h3>
              <p className="text-white/60">Your feedback helps us build something amazing.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#c084fc]/20 to-[#00d4ff]/20 border border-white/10 mb-4">
                  <Sparkles className="w-4 h-4 text-[#ffd93d]" />
                  <span className="text-sm font-medium text-white">Quick feedback</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">How's SpriteLab?</h3>
                <p className="text-white/60">Help us make it even better!</p>
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
                  className="w-full h-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#c084fc]/50 resize-none"
                  maxLength={2000}
                  autoFocus
                />
              </div>

              {/* Email (optional) */}
              <div className="mb-5">
                <Input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="Email (optional - for follow-up)"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#c084fc]/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!feedbackText.trim() || sending}
                  className="flex-1 h-11 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white font-semibold"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
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
  );
}
