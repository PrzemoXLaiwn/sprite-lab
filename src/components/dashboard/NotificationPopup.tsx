"use client";

import { useState, useEffect, useCallback } from "react";
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
const CONFETTI_COLORS = ["#FF8A3D", "#FFB27A", "#FF9F43", "#ECEEF3"];
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
    const interval = setInterval(fetchNotifications, 60_000);

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
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1016] shadow-2xl">
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
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-[#7A8294] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="pixel-grid relative p-6 pt-8 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/10">
              {currentNotification.type === "CREDIT_GRANT" ? (
                <Gift className="animate-bounce-slow h-6 w-6 text-[#FF8A3D]" />
              ) : (
                <Sparkles className="h-6 w-6 text-[#FF8A3D]" />
              )}
            </div>

            {/* Title */}
            <h2 id="notification-title" className="font-display text-[22px] font-semibold tracking-tight text-white">
              {currentNotification.title}
            </h2>

            {/* Credit amount for credit grants */}
            {currentNotification.type === "CREDIT_GRANT" && notificationData?.amount && (
              <div className="mt-3 flex items-baseline justify-center gap-2">
                <span className="font-sans tracking-tight text-[44px] font-semibold leading-none tabular-nums text-[#FFB27A]">
                  +{notificationData.amount}
                </span>
                <span className="font-mono text-[12px] text-[#8B93A5]">credits</span>
              </div>
            )}

            {/* Message */}
            <p className="mb-6 mt-3 text-[13px] leading-relaxed text-[#C9CFDB]">
              {currentNotification.message}
            </p>

            {/* Admin info */}
            {notificationData?.adminName && (
              <p className="-mt-3 mb-6 font-mono text-[11px] text-[#7A8294]">
                from <span className="text-[#FFB27A]">{notificationData.adminName}</span>
              </p>
            )}

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="px-corners w-full bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
            >
              Awesome, thanks!
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
