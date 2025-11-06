import { FormEvent, useMemo, useState } from "react";

import type { SessionEntry } from "../hooks/useAnalyze";
import type { ClipListItem } from "../hooks/useClips";
import { Card } from "./Card";
import { cn } from "../utils/cn";

interface SessionHistoryProps {
  sessions: SessionEntry[];
  clips: ClipListItem[];
  activeSubmissionId?: string;
  onSelect: (submissionId: string) => void | Promise<void>;
  onSendChat: (submissionId: string, prompt: string) => void | Promise<void>;
  onDelete: (submissionId: string) => void | Promise<void>;
}

function splitFilename(filename: string): { base: string; extension: string } {
  const index = filename.lastIndexOf(".");
  if (index <= 0) {
    return { base: filename, extension: "" };
  }
  return {
    base: filename.slice(0, index),
    extension: filename.slice(index),
  };
}

function describeFilenameForScreenReaders(filename: string): string {
  const { base, extension } = splitFilename(filename);
  if (!extension) {
    return base;
  }
  const ext = extension.slice(1).toLowerCase();
  if (ext === "mp4") {
    return `${base} dot m p four`;
  }
  return `${base} dot ${ext}`;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const FOLLOW_UP_SUGGESTIONS = [
  "Summarize key risks to brief the crew",
  "Identify the calmest section for playback",
  "Recommend drills that reinforce this clip",
];

export function SessionHistory({
  sessions,
  clips,
  activeSubmissionId,
  onSelect,
  onSendChat,
  onDelete,
}: SessionHistoryProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>, submissionId: string) => {
    event.preventDefault();
    const prompt = drafts[submissionId] ?? "";
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }
    void onSendChat(submissionId, trimmed);
    setDrafts((previous) => ({
      ...previous,
      [submissionId]: "",
    }));
  };

  const latestSessions = useMemo(() => sessions.slice(), [sessions]);
  const sortedClips = useMemo(() => clips.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)), [clips]);

  if (sortedClips.length === 0 && latestSessions.length === 0) {
    return (
      <Card interactive={false} surface="glass">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Session history</h2>
        </header>
        <p className="text-sm text-text-secondary">
          No processed clips yet. Upload a video to build your session history.
        </p>
      </Card>
    );
  }

  return (
    <Card interactive={false} surface="glass">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Session history</h2>
        <p className="text-xs text-text-secondary">Track chats, revisit summaries, and delete assets.</p>
      </header>
      {sortedClips.length ? (
        <div className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Registered clips</p>
          <ul className="space-y-2">
            {sortedClips.map((clip) => {
              const { base, extension } = splitFilename(clip.filename);
              const accessibleName = describeFilenameForScreenReaders(clip.filename);
              const isActive = clip.clip_id === activeSubmissionId;
              return (
                <li
                  key={clip.clip_id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm transition-all",
                    isActive
                      ? "border-accent-primary/70 bg-accent-primary/10 text-text-accent shadow-glass"
                      : "border-border-glass/75 bg-surface-glass/70 text-text-secondary hover:border-accent-primary/45 hover:text-text-primary",
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">
                          <span aria-hidden="true" className="filename-ext" data-ext={extension}>
                            {base}
                          </span>
                          <span className="sr-only">{accessibleName}</span>
                        </p>
                        <p className="text-xs text-text-secondary/80">Registered {formatTimestamp(clip.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-text-secondary/80 text-right">
                        <span className="rounded-full border border-border-glass/80 px-3 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-text-primary">
                          {clip.status}
                        </span>
                        {clip.last_analysis_at ? (
                          <p className="text-text-secondary/75">Last analysis {formatTimestamp(clip.last_analysis_at)}</p>
                        ) : (
                          <p className="text-text-secondary/70">Awaiting analysis</p>
                        )}
                        {typeof clip.latency_ms === "number" ? (
                          <p className="text-text-secondary/75">Latency {clip.latency_ms} ms</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          void onSelect(clip.clip_id);
                        }}
                        className="rounded-full border border-border-glass px-3 py-1 text-xs font-semibold text-text-primary transition hover:border-accent-primary hover:text-text-accent"
                      >
                        View summary
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {latestSessions.length ? <hr className="border-border-glass/70" /> : null}
        </div>
      ) : null}
      <ul className="space-y-4">
        {latestSessions.map((session) => {
          const isActive = session.submissionId === activeSubmissionId;
          const lastUpdated = formatTimestamp(session.lastUpdated);
          const chatDraft = drafts[session.submissionId] ?? "";

          const registeredName = session.registeredFileName ?? session.fileName ?? session.submissionId;
          const { base, extension } = splitFilename(registeredName);
          const accessibleName = describeFilenameForScreenReaders(registeredName);

          return (
            <li
              key={session.submissionId}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm transition-all",
                isActive
                  ? "border-accent-primary/70 bg-accent-primary/10 text-text-accent shadow-glass"
                  : "border-border-glass/75 bg-surface-glass/70 text-text-secondary hover:border-accent-primary/45 hover:text-text-primary",
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className="font-semibold text-text-primary"
                      title={session.registeredFileName ?? session.fileName ?? undefined}
                    >
                      <span aria-hidden="true" className="filename-ext" data-ext={extension}>
                        {base}
                      </span>
                      <span className="sr-only">{accessibleName}</span>
                    </p>
                    <p className="text-xs text-text-secondary/80">Updated {lastUpdated}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-text-secondary/80 text-right">
                    <span className="rounded-full border border-border-glass/80 px-3 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-text-primary">
                      {session.chats.length ? `${session.chats.length} chat${session.chats.length > 1 ? "s" : ""}` : "No chats yet"}
                    </span>
                    {session.isChatting ? (
                      <p className="text-text-secondary/75">Preparing response…</p>
                    ) : session.chatError ? (
                      <p className="text-rose-200">Follow-up failed</p>
                    ) : (
                      <p className="text-text-secondary/70">Ready for follow-ups</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onSelect(session.submissionId);
                    }}
                    className="rounded-full border border-border-glass px-3 py-1 text-xs font-semibold text-text-primary transition hover:border-accent-primary hover:text-text-accent"
                  >
                    View summary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onDelete(session.submissionId);
                    }}
                    disabled={session.isDeleting}
                    className="rounded-full border border-rose-400/80 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {session.isDeleting ? "Deleting…" : "Delete asset"}
                  </button>
                </div>
              </div>

              {session.deleteError ? (
                <p className="mt-2 text-xs text-rose-200">
                  {session.deleteError}
                  {session.deleteRemediation ? ` — ${session.deleteRemediation}` : null}
                </p>
              ) : null}
              <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => handleSubmit(event, session.submissionId)}>
                <label className="text-xs font-semibold text-text-secondary/90" htmlFor={`chat-${session.submissionId}`}>
                  Ask a follow-up
                </label>
                <textarea
                  id={`chat-${session.submissionId}`}
                  name="prompt"
                  rows={2}
                  value={chatDraft}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [session.submissionId]: event.target.value,
                    }))
                  }
                  placeholder="Clarify a moment, request timestamps, etc."
                  className="resize-none rounded-2xl border border-border-glass/75 bg-surface-glass/70 px-3 py-2 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                  disabled={session.isChatting}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="rounded-full bg-text-primary px-3 py-1.5 text-xs font-semibold text-surface-canvas transition hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={session.isChatting}
                  >
                    {session.isChatting ? "Sending…" : "Send follow-up"}
                  </button>
                  {session.chatError ? (
                    <p className="text-xs text-rose-200">
                      {session.chatError}
                      {session.chatRemediation ? ` — ${session.chatRemediation}` : null}
                    </p>
                  ) : null}
                </div>
              </form>

              {session.chats.length ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Conversation</p>
                  <ul className="space-y-2">
                    {session.chats.map((entry) => (
                      <li key={entry.id} className="rounded-2xl border border-border-glass/75 bg-surface-glass/70 p-3 text-xs text-text-secondary">
                        <p className="font-semibold text-text-primary">You</p>
                        <p className="mt-1 whitespace-pre-wrap text-text-secondary">{entry.prompt}</p>
                        <p className="mt-3 font-semibold text-text-primary">Hafnia</p>
                        <p className="mt-1 whitespace-pre-wrap text-text-secondary">{entry.response}</p>
                        <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-text-secondary/70">
                          {formatTimestamp(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-border-glass/75 bg-surface-glass/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Suggested follow-ups</p>
                  <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                    {FOLLOW_UP_SUGGESTIONS.map((suggestion) => (
                      <li key={suggestion}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default SessionHistory;
