import { useMemo } from "react";

import type { ClipListItem } from "../../hooks/useClips";
import type { ReasoningHistoryEntry } from "../../types/reasoning";
import { Card, CardContent, CardHeader, CardTitle } from "../Card";

interface ReasoningHistoryProps {
  history: ReasoningHistoryEntry[];
  clips: ClipListItem[];
  isSyncing?: boolean;
  syncError?: string | null;
  onRefresh?: () => void | Promise<void>;
  onClear?: () => void;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function ReasoningHistory({ history, clips, isSyncing = false, syncError, onRefresh, onClear }: ReasoningHistoryProps) {
  const clipNames = useMemo(() => {
    return new Map(clips.map((clip) => [clip.clip_id, clip.filename]));
  }, [clips]);

  return (
    <Card interactive={false} surface="glass">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-accent-primary">Reasoning history</p>
          <CardTitle className="text-lg">Conversation log</CardTitle>
          <p className="text-sm text-text-secondary">
            Recent answers are saved so you can revisit insights without rerunning comparisons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              className="rounded-full border border-border-glass px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-accent-primary hover:text-text-accent focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 focus:ring-offset-surface-glass disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void onRefresh();
              }}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing…" : "Refresh"}
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/60 focus:ring-offset-2 focus:ring-offset-surface-glass"
              onClick={() => {
                onClear();
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {syncError ? (
          <p role="alert" className="text-xs text-rose-400">
            {syncError}
          </p>
        ) : null}

        {history.length === 0 ? (
          <p className="text-sm text-text-secondary/80">
            No conversation history yet. Ask a follow-up to start building the log.
          </p>
        ) : (
          <ul className="space-y-4">
            {history
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((entry) => {
                const clipLabels = entry.clip_ids
                  .map((clipId) => clipNames.get(clipId) ?? clipId)
                  .join(", ");

                return (
                  <li key={entry.id} className="space-y-2 rounded-2xl border border-border-glass/80 bg-surface-glass/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-accent-primary">Follow-up</span>
                      <span className="text-xs text-text-secondary/75">{formatTimestamp(entry.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Q: {entry.question || "Untitled question"}</p>
                    <p className="text-sm text-text-secondary">A: {entry.answer.answer}</p>
                    {clipLabels ? <p className="text-xs text-text-secondary/75">Clips: {clipLabels}</p> : null}
                    {entry.answer.evidence && entry.answer.evidence.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-text-secondary">Evidence</p>
                        <ul className="space-y-1">
                          {entry.answer.evidence.map((item, index) => (
                            <li key={`${item.clip_id}-${index}`} className="text-xs text-text-secondary/75">
                              {clipNames.get(item.clip_id) ?? item.clip_id}: {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default ReasoningHistory;
