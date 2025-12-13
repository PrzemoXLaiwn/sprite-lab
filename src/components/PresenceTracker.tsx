"use client";

import { useEffect } from "react";

// Send heartbeat every 30 seconds
const HEARTBEAT_INTERVAL = 30 * 1000;

export function PresenceTracker() {
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Send heartbeat on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Send heartbeat on user activity
    const handleActivity = debounce(() => {
      sendHeartbeat();
    }, 5000);

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, []);

  return null; // This component doesn't render anything
}

function sendHeartbeat() {
  fetch("/api/presence", {
    method: "POST",
    keepalive: true, // Allow request to complete even if page is closing
  }).catch(() => {
    // Silently fail - presence is not critical
  });
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}
