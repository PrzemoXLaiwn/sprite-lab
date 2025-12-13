"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  createdAt: string;
}

export function NotificationPopup() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
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
    fetchNotifications();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleDismiss}
      />

      {/* Popup */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-md transition-all duration-300 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="relative bg-gradient-to-br from-[#0f0f1a] to-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Glow effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/10 via-transparent to-[#c084fc]/10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#00ff88]/20 rounded-full blur-3xl" />

          {/* Confetti particles (CSS only) */}
          {currentNotification.type === "CREDIT_GRANT" && isVisible && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ["#00ff88", "#00d4ff", "#c084fc", "#ffd93d"][i % 4],
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative p-6 pt-8 text-center">
            {/* Icon */}
            {currentNotification.type === "CREDIT_GRANT" ? (
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] rounded-full blur-xl opacity-50 animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center animate-bounce-slow">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-[#ffd93d] animate-bounce" />
              </div>
            ) : (
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-[#00d4ff]/30 rounded-full blur-xl" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#00d4ff] to-[#c084fc] flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              {currentNotification.title}
            </h2>

            {/* Credit amount for credit grants */}
            {currentNotification.type === "CREDIT_GRANT" && notificationData?.amount && (
              <div className="mb-4">
                <span className="text-5xl font-display font-bold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-transparent bg-clip-text animate-pulse">
                  +{notificationData.amount}
                </span>
                <span className="text-lg text-white/60 ml-2">credits</span>
              </div>
            )}

            {/* Message */}
            <p className="text-white/70 mb-6 leading-relaxed">
              {currentNotification.message}
            </p>

            {/* Admin info */}
            {notificationData?.adminName && (
              <p className="text-sm text-white/40 mb-6">
                From: <span className="text-[#00ff88]">{notificationData.adminName}</span>
              </p>
            )}

            {/* CTA Button */}
            <Button
              onClick={handleDismiss}
              className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold py-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              Awesome, thanks!
            </Button>
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
