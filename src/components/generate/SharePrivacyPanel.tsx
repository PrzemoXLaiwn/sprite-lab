"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { shareActionLabel, shareCaption, type ConfirmedPublic } from "@/lib/community-share";

const SECONDARY =
  "btn btn-secondary inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[13px]";

/**
 * Disclosure follows the last visibility the server confirmed.
 * Pending and error do not change that. Unknown is not described as private.
 * `onShare` runs only from the button.
 */
export function SharePrivacyPanel({
  published,
  pending,
  error,
  onShare,
}: {
  published: ConfirmedPublic;
  pending: boolean;
  error?: string | null;
  onShare: (makePublic: boolean) => void;
}) {
  const caption = shareCaption(published);
  const action = shareActionLabel(published);
  const state = published === true ? "public" : published === false ? "private" : "unknown";
  return (
    <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-[#19223F] px-3 py-3" data-share-state={state} data-share-pending={pending ? "true" : "false"}>
      <p className="text-[13px] font-medium text-white">{caption.title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#A7ADD4]">{caption.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {action && (
          <button
            type="button"
            onClick={() => onShare(published === false)}
            disabled={pending}
            className={SECONDARY}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {action}
          </button>
        )}
        <Link href="/community" className={SECONDARY}>Community gallery</Link>
      </div>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-[#FFC857]">{error}</p>}
    </div>
  );
}
