"use client";

import { useEffect, useRef, type RefObject } from "react";
import { trapTabKey } from "./focus-trap";

/** Scroll lock, initial focus, Tab wrap, and focus restore for one dialog. */
export function useDialogFocus(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const openerRef = useRef<HTMLElement | null>(null);
  const tokenRef = useRef<object | null>(null);
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (active && !dialogRef.current?.contains(active)) openerRef.current = active;
    const token = {};
    tokenRef.current = token;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (dialogRef.current) trapTabKey(dialogRef.current, event);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      const opener = openerRef.current;
      // Skip the extra cleanup React runs in development, which would yank
      // focus back while the dialog is opening again.
      queueMicrotask(() => {
        if (tokenRef.current !== token) return;
        if (opener?.isConnected) opener.focus();
      });
    };
  }, [open, dialogRef, initialFocusRef]);
}
