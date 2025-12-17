"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationFeedbackProps {
  generationId: string;
  initialRating?: number | null;
  onFeedback?: (rating: number) => void;
  compact?: boolean;
}

export function GenerationFeedback({
  generationId,
  initialRating = null,
  onFeedback,
  compact = false,
}: GenerationFeedbackProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [isLoading, setIsLoading] = useState(false);

  const submitFeedback = async (newRating: number) => {
    if (isLoading) return;

    // Toggle off if clicking same rating
    const finalRating = rating === newRating ? 0 : newRating;

    setIsLoading(true);
    setRating(finalRating);

    try {
      const response = await fetch("/api/analytics/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          rating: finalRating,
          feedbackType: "thumbs",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      onFeedback?.(finalRating);
    } catch (error) {
      console.error("Feedback error:", error);
      // Revert on error
      setRating(initialRating);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => submitFeedback(1)}
          disabled={isLoading}
          className={cn(
            "p-1 rounded transition-colors",
            rating === 1
              ? "text-green-500 bg-green-500/20"
              : "text-[#a0a0b0] hover:text-green-500 hover:bg-green-500/10"
          )}
          title="Good result"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => submitFeedback(-1)}
          disabled={isLoading}
          className={cn(
            "p-1 rounded transition-colors",
            rating === -1
              ? "text-red-500 bg-red-500/20"
              : "text-[#a0a0b0] hover:text-red-500 hover:bg-red-500/10"
          )}
          title="Bad result"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#a0a0b0]">Rate this:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => submitFeedback(1)}
        disabled={isLoading}
        className={cn(
          "h-8 px-3",
          rating === 1
            ? "border-green-500 bg-green-500/20 text-green-500"
            : "border-[#2a2a3d] hover:border-green-500 hover:text-green-500"
        )}
      >
        {isLoading && rating === 1 ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ThumbsUp className="w-4 h-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => submitFeedback(-1)}
        disabled={isLoading}
        className={cn(
          "h-8 px-3",
          rating === -1
            ? "border-red-500 bg-red-500/20 text-red-500"
            : "border-[#2a2a3d] hover:border-red-500 hover:text-red-500"
        )}
      >
        {isLoading && rating === -1 ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ThumbsDown className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
