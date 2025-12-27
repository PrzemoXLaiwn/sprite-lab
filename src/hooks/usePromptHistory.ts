"use client";

import { useState, useEffect, useCallback } from "react";

// ===========================================
// PROMPT HISTORY HOOK
// ===========================================
// Stores recent prompts in localStorage for quick reuse

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  styleId: string;
  styleName: string;
  mode: "2d" | "3d";
  timestamp: number;
}

const STORAGE_KEY = "spritelab_prompt_history";
const MAX_HISTORY_ITEMS = 20;

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PromptHistoryItem[];
        // Sort by timestamp descending (newest first)
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(parsed);
      }
    } catch (err) {
      console.error("Failed to load prompt history:", err);
    }
    setIsLoaded(true);
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((items: PromptHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save prompt history:", err);
    }
  }, []);

  // Add new prompt to history
  const addToHistory = useCallback((
    prompt: string,
    styleId: string,
    styleName: string,
    mode: "2d" | "3d"
  ) => {
    if (!prompt.trim()) return;

    const newItem: PromptHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: prompt.trim(),
      styleId,
      styleName,
      mode,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Remove duplicates (same prompt text)
      const filtered = prev.filter(item =>
        item.prompt.toLowerCase() !== prompt.trim().toLowerCase()
      );

      // Add new item at the beginning
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Remove item from history
  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear prompt history:", err);
    }
  }, []);

  // Get recent prompts (limited)
  const getRecent = useCallback((limit: number = 5) => {
    return history.slice(0, limit);
  }, [history]);

  // Search history
  const searchHistory = useCallback((query: string) => {
    if (!query.trim()) return history;
    const lowerQuery = query.toLowerCase();
    return history.filter(item =>
      item.prompt.toLowerCase().includes(lowerQuery)
    );
  }, [history]);

  return {
    history,
    isLoaded,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecent,
    searchHistory,
  };
}
