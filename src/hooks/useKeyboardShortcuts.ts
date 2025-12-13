"use client";

import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * Custom hook for keyboard shortcuts
 *
 * Usage:
 * useKeyboardShortcuts([
 *   { key: "Enter", ctrl: true, action: () => handleGenerate() },
 *   { key: "r", action: () => randomPrompt() },
 *   { key: "s", ctrl: true, action: () => save(), preventDefault: true },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        // For shortcuts with modifiers, allow even when typing
        const hasModifier = shortcut.ctrl || shortcut.alt || shortcut.meta;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Skip non-modifier shortcuts when typing
          if (isTyping && !hasModifier) {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Pre-defined keyboard shortcut sets for different pages
 */

export interface GeneratorShortcuts {
  onGenerate: () => void;
  onRandomPrompt: () => void;
  onCopyPrompt?: () => void;
  onDownload?: () => void;
}

export function useGeneratorShortcuts({
  onGenerate,
  onRandomPrompt,
  onCopyPrompt,
  onDownload,
}: GeneratorShortcuts) {
  useKeyboardShortcuts([
    {
      key: "Enter",
      ctrl: true,
      action: onGenerate,
      description: "Generate sprite (Ctrl+Enter)",
    },
    {
      key: "r",
      ctrl: true,
      action: onRandomPrompt,
      description: "Random prompt (Ctrl+R)",
      preventDefault: true, // Prevent page refresh
    },
    ...(onCopyPrompt
      ? [
          {
            key: "c",
            ctrl: true,
            shift: true,
            action: onCopyPrompt,
            description: "Copy prompt (Ctrl+Shift+C)",
          },
        ]
      : []),
    ...(onDownload
      ? [
          {
            key: "s",
            ctrl: true,
            action: onDownload,
            description: "Download image (Ctrl+S)",
            preventDefault: true, // Prevent browser save dialog
          },
        ]
      : []),
  ]);
}

export interface GalleryShortcuts {
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onNextImage?: () => void;
  onPrevImage?: () => void;
}

export function useGalleryShortcuts({
  onDelete,
  onDownload,
  onShare,
  onNextImage,
  onPrevImage,
}: GalleryShortcuts) {
  useKeyboardShortcuts([
    ...(onDelete
      ? [
          {
            key: "Delete",
            action: onDelete,
            description: "Delete selected (Delete)",
          },
        ]
      : []),
    ...(onDownload
      ? [
          {
            key: "d",
            ctrl: true,
            action: onDownload,
            description: "Download (Ctrl+D)",
            preventDefault: true,
          },
        ]
      : []),
    ...(onShare
      ? [
          {
            key: "s",
            ctrl: true,
            shift: true,
            action: onShare,
            description: "Share (Ctrl+Shift+S)",
          },
        ]
      : []),
    ...(onNextImage
      ? [
          {
            key: "ArrowRight",
            action: onNextImage,
            description: "Next image (→)",
          },
        ]
      : []),
    ...(onPrevImage
      ? [
          {
            key: "ArrowLeft",
            action: onPrevImage,
            description: "Previous image (←)",
          },
        ]
      : []),
  ]);
}

/**
 * Component to display available shortcuts
 */
export const GENERATOR_SHORTCUTS_INFO = [
  { keys: "Ctrl + Enter", action: "Generate sprite" },
  { keys: "Ctrl + R", action: "Random prompt" },
  { keys: "Ctrl + S", action: "Download image" },
  { keys: "Ctrl + Shift + C", action: "Copy prompt" },
];

export const GALLERY_SHORTCUTS_INFO = [
  { keys: "← / →", action: "Navigate images" },
  { keys: "Delete", action: "Delete selected" },
  { keys: "Ctrl + D", action: "Download" },
];
