import { FormEvent, useMemo, useState } from "react";

import type { SessionEntry } from "../hooks/useAnalyze";
import type { ClipListItem } from "../hooks/useClips";

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
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Session history</h2>
        </header>
        <p className="text-sm text-slate-400">
          No processed clips yet. Upload a video to build your session history.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Session history</h2>
        <p className="text-xs text-slate-400">Track chats, revisit summaries, and delete assets.</p>
      </header>
      {sortedClips.length ? (
        <div className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registered clips</p>
          <ul className="space-y-2">
            {sortedClips.map((clip) => {
              const { base, extension } = splitFilename(clip.filename);
              const accessibleName = describeFilenameForScreenReaders(clip.filename);
              const isActive = clip.clip_id === activeSubmissionId;
              return (
                <li
                  key={clip.clip_id}
                  className={`rounded-md border px-4 py-3 text-sm transition ${
                    isActive
                      ? "border-emerald-500/70 bg-emerald-950/40"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-100">
                        <span aria-hidden="true" className="filename-ext" data-ext={extension}>
                          {base}
                        </span>
                        <span className="sr-only">{accessibleName}</span>
                      </p>
                      <p className="text-xs text-slate-400">Registered {formatTimestamp(clip.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-300">
                      <span className="rounded-full border border-slate-600 px-3 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-200">
                        {clip.status}
                      </span>
                      {clip.last_analysis_at ? (
                        <p className="text-slate-400">Last analysis {formatTimestamp(clip.last_analysis_at)}</p>
                      ) : (
                        <p className="text-slate-500">Awaiting analysis</p>
                      )}
                      {typeof clip.latency_ms === "number" ? (
                        <p className="text-slate-400">Latency {clip.latency_ms} ms</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          void onSelect(clip.clip_id);
                        }}
                        className="mt-1 rounded-md border border-slate-500 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
                      >
                        View summary
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {latestSessions.length ? <hr className="border-slate-800" /> : null}
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
              className={`rounded-md border px-4 py-3 text-sm transition ${
                isActive
                  ? "border-emerald-500/70 bg-emerald-950/40"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="font-semibold text-slate-100"
                    title={session.registeredFileName ?? session.fileName ?? undefined}
                  >
                    <span aria-hidden="true" className="filename-ext" data-ext={extension}>
                      {base}
                    </span>
                    <span className="sr-only">{accessibleName}</span>
                  </p>
                  <p className="text-xs text-slate-400">Updated {lastUpdated}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onSelect(session.submissionId);
                    }}
                    className="rounded-md border border-slate-500 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    View summary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onDelete(session.submissionId);
                    }}
                    disabled={session.isDeleting}
                    className="rounded-md border border-rose-500 px-3 py-1 text-xs font-medium text-rose-100 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {session.isDeleting ? "Deleting…" : "Delete asset"}
                  </button>
                </div>
              </div>

              {session.deleteError ? (
                <p className="mt-2 text-xs text-rose-300">
                  {session.deleteError}
                  {session.deleteRemediation ? ` — ${session.deleteRemediation}` : null}
                </p>
              ) : null}
              <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => handleSubmit(event, session.submissionId)}>
                <label className="text-xs font-medium text-slate-300" htmlFor={`chat-${session.submissionId}`}>
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
                  className="resize-none rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={session.isChatting}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={session.isChatting}
                  >
                    {session.isChatting ? "Sending…" : "Send follow-up"}
                  </button>
                  {session.chatError ? (
                    <p className="text-xs text-rose-300">
                      {session.chatError}
                      {session.chatRemediation ? ` — ${session.chatRemediation}` : null}
                    </p>
                  ) : null}
                </div>
              </form>

              {session.chats.length ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversation</p>
                  <ul className="space-y-2">
                    {session.chats.map((entry) => (
                      <li key={entry.id} className="rounded-md border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200">
                        <p className="font-semibold text-slate-100">You</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-200">{entry.prompt}</p>
                        <p className="mt-3 font-semibold text-slate-100">Hafnia</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-200">{entry.response}</p>
                        <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-slate-500">
                          {formatTimestamp(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suggested follow-ups</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
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
    </section>
  );
}

export default SessionHistory;
