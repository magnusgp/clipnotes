import { useMemo } from "react";

import type { ClipListItem } from "../../hooks/useClips";
import type { ReasoningHistoryEntry } from "../../types/reasoning";

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
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Reasoning history</p>
          <h2 className="text-lg font-semibold text-slate-100">Conversation log</h2>
          <p className="text-sm text-slate-300">Recent answers are saved so you can revisit insights without rerunning comparisons.</p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              onClick={() => {
                onClear();
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </header>

      {syncError ? (
        <p role="alert" className="text-xs text-rose-400">
          {syncError}
        </p>
      ) : null}

      {history.length === 0 ? (
        <p className="text-sm text-slate-400">No conversation history yet. Ask a follow-up to start building the log.</p>
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
                <li key={entry.id} className="space-y-2 rounded-lg border border-slate-800/70 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-emerald-400">Follow-up</span>
                    <span className="text-xs text-slate-400">{formatTimestamp(entry.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">Q: {entry.question || "Untitled question"}</p>
                  <p className="text-sm text-slate-300">A: {entry.answer.answer}</p>
                  {clipLabels ? <p className="text-xs text-slate-400">Clips: {clipLabels}</p> : null}
                  {entry.answer.evidence && entry.answer.evidence.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-300">Evidence</p>
                      <ul className="space-y-1">
                        {entry.answer.evidence.map((item, index) => (
                          <li key={`${item.clip_id}-${index}`} className="text-xs text-slate-400">
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
    </section>
  );
}

export default ReasoningHistory;
