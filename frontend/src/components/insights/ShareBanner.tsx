import { useCallback, useMemo } from "react";

import type { InsightShareResponse, InsightWindow } from "../../types/insights";
import { useToast } from "../toast/ToastProvider";
import { cn } from "../../utils/cn";

interface ShareBannerProps {
  window: InsightWindow;
  share: InsightShareResponse | null;
  isCreating: boolean;
  onCreateShare: (window: InsightWindow) => Promise<void>;
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ShareBanner({ window: insightWindow, share, isCreating, onCreateShare }: ShareBannerProps) {
  const toast = useToast();
  const browserWindow =
    typeof globalThis !== "undefined" && typeof (globalThis as { window?: Window }).window !== "undefined"
      ? (globalThis as { window: Window }).window
      : null;

  const generatedLabel = useMemo(() => formatTimestamp(share?.generated_at), [share?.generated_at]);
  const expiresLabel = useMemo(() => formatTimestamp(share?.cache_expires_at), [share?.cache_expires_at]);

  const resolvedShareUrl = useMemo(() => {
    if (!share?.url) {
      return null;
    }
    if (!browserWindow) {
      return share.url;
    }
    try {
      const currentOrigin = browserWindow.location.origin;
      const target = share.url.startsWith("http") ? new URL(share.url) : new URL(share.url, currentOrigin);
      if (target.origin !== currentOrigin) {
        target.protocol = browserWindow.location.protocol;
        target.host = browserWindow.location.host;
      }
      return target.toString();
    } catch {
      return share.url;
    }
  }, [browserWindow, share?.url]);

  const handleCopy = useCallback(async () => {
    if (!share?.url) {
      return;
    }
    const url = resolvedShareUrl ?? share.url;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      toast.push({
        title: "Share link copied",
        description: "Invite stakeholders to review this snapshot.",
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to copy share link.";
      toast.push({
        title: "Copy failed",
        description: message,
        variant: "error",
      });
    }
  }, [resolvedShareUrl, share?.url, toast]);

  return (
    <section className="rounded-2xl border border-border-glass/60 bg-surface-panel/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-text-secondary/70">Share timeline</p>
          <h2 className="text-lg font-semibold text-text-primary">Generate a read-only link</h2>
          <p className="text-sm text-text-secondary/80">
            Share the {insightWindow === "7d" ? "seven day" : "twenty four hour"} insight snapshot with stakeholders without granting dashboard access.
          </p>
          {share ? (
            <div className="flex flex-col gap-1 text-xs text-text-secondary/70">
              {generatedLabel ? <span>Snapshot generated at {generatedLabel}</span> : null}
              {expiresLabel ? <span>Cache expires at {expiresLabel}</span> : <span>Link refreshes when cache updates.</span>}
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[22rem]">
          {share ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-glass/60 bg-surface-glass/50 px-3 py-2 text-sm">
              <span className="truncate" title={resolvedShareUrl ?? share.url}>
                {resolvedShareUrl ?? share.url}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleCopy();
                }}
                className="rounded-md border border-border-glass/70 px-2 py-1 text-xs font-semibold text-accent-primary transition hover:border-accent-primary/70 hover:text-accent-primary"
              >
                Copy
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void onCreateShare(insightWindow);
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-border-glass/70 px-4 py-2 text-sm font-semibold transition",
              "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30",
              isCreating && "opacity-70",
            )}
            disabled={isCreating}
          >
            {isCreating ? "Generating link..." : "Generate share link"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ShareBanner;
