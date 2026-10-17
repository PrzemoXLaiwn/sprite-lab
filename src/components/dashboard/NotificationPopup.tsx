"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Gift, X, Sparkles } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  createdAt: string;
}

// Deterministic confetti layout — computed once at module load so render
// stays pure (no Math.random during render).
const CONFETTI_COLORS = ["#FFA300", "#FFC857", "#FFB733", "#FFF1E8"];
const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 53 + 17) % 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: ((i * 7) % 20) / 10,
  duration: 2 + ((i * 13) % 20) / 10,
}));

export function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      // 401 = signed-out user. Stop polling — no point hammering the
      // endpoint until the session is restored.
      if (response.status === 401) return;
      const data = await response.json();
      if (data.success && data.notifications?.length > 0) {
        setNotifications(data.notifications);
        // Show the first unread notification
        if (!currentNotification && !isClosing) {
          setCurrentNotification(data.notifications[0]);
          setTimeout(() => setIsVisible(true), 50);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [currentNotification, isClosing]);

  useEffect(() => {
    // Initial fetch
    const initial = setTimeout(fetchNotifications, 0);

    // Poll every 60 seconds. The previous 30s cadence doubled request volume
    // for no perceptible UX gain — notifications appear after server-side
    // events (purchases, admin grants) that don't need real-time polling.
    const interval = setInterval(() => { if (!document.hidden) fetchNotifications(); }, 60_000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleDismiss = async () => {
    if (!currentNotification) return;

    setIsClosing(true);
    setIsVisible(false);

    // Wait for animation
    setTimeout(async () => {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: currentNotification.id }),
        });
      } catch (error) {
        console.error("Failed to dismiss notification:", error);
      }

      // Remove from list and show next
      const remaining = notifications.filter((n) => n.id !== currentNotification.id);
      setNotifications(remaining);
      setCurrentNotification(remaining[0] || null);
      setIsClosing(false);

      if (remaining[0]) {
        setTimeout(() => setIsVisible(true), 50);
      }
    }, 300);
  };

  // Keyboard: focus the button when the popup opens, Escape dismisses.
  const ctaRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef(handleDismiss);
  useEffect(() => { dismissRef.current = handleDismiss; });
  useEffect(() => {
    if (!isVisible) return;
    ctaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismissRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVisible]);

  const parseData = (data?: string) => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  if (!currentNotification) return null;

  const notificationData = parseData(currentNotification.data);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleDismiss}
        aria-hidden
      />

      {/* Popup */}
      <div
        className={`fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#19223F] shadow-2xl">
          {/* Confetti particles (CSS only, deterministic positions) */}
          {currentNotification.type === "CREDIT_GRANT" && isVisible && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {CONFETTI.map((p, i) => (
                <div
                  key={i}
                  className="animate-confetti absolute h-1.5 w-1.5"
                  style={{
                    left: `${p.left}%`,
                    backgroundColor: p.color,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-[#9AA1CC] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="pixel-grid relative p-6 pt-8 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFA300]/25 bg-[#FFA300]/10">
              {currentNotification.type === "CREDIT_GRANT" ? (
                <Gift className="animate-bounce-slow h-6 w-6 text-[#FFA300]" />
              ) : (
                <Sparkles className="h-6 w-6 text-[#FFA300]" />
              )}
            </div>

            {/* Title */}
            <h2 id="notification-title" className="font-display text-[22px] font-semibold tracking-tight text-white">
              {currentNotification.title}
            </h2>

            {/* Credit amount for credit grants */}
            {currentNotification.type === "CREDIT_GRANT" && notificationData?.amount && (
              <div className="mt-3 flex items-baseline justify-center gap-2">
                <span className="font-sans tracking-tight text-[44px] font-semibold leading-none tabular-nums text-[#FFC857]">
                  +{notificationData.amount}
                </span>
                <span className="font-mono text-[12px] text-[#9AA1CC]">credits</span>
              </div>
            )}

            {/* Message */}
            <p className="mb-6 mt-3 text-[13px] leading-relaxed text-[#C8CCE8]">
              {currentNotification.message}
            </p>

            {/* Admin info */}
            {notificationData?.adminName && (
              <p className="-mt-3 mb-6 font-mono text-[11px] text-[#8A92BF]">
                from <span className="text-[#FFC857]">{notificationData.adminName}</span>
              </p>
            )}

            {/* CTA Button */}
            <button
              type="button"
              ref={ctaRef}
              onClick={handleDismiss}
              className="px-corners w-full bg-[#FFA300] py-3 text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
