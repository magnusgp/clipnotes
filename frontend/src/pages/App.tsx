import { useCallback } from "react";

import SessionHistory from "../components/SessionHistory";
import StatusBanner from "../components/StatusBanner";
import SummaryPanel from "../components/SummaryPanel";
import UploadForm from "../components/UploadForm";
import { useAnalyze } from "../hooks/useAnalyze";
import { useClips } from "../hooks/useClips";

function App() {
  const { clips, refresh: refreshClips, isLoading: isClipListLoading } = useClips();
  const { state, analyze, cancel, reset, selectSession, sendChat, deleteSession, isLoading } = useAnalyze({
    onClipRegistered: refreshClips,
    onClipsRefreshed: refreshClips,
  });
  const {
    status,
    summary,
    analysis,
    error,
    remediation,
    fileName,
    pendingFileName,
    statusChangedAt,
    history,
  } = state;

  const handleAnalyze = useCallback(
    (file: File) => {
      void analyze(file);
    },
    [analyze]
  );

  const handleSelectSession = useCallback(
    (submissionId: string) => {
      void selectSession(submissionId);
    },
    [selectSession]
  );

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.16),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.14),transparent_52%)]"
      />
      <section className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        <div
          aria-hidden
          className="absolute inset-x-8 top-8 -z-10 h-64 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 via-sky-500/15 to-transparent blur-3xl"
        />
        <header className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 shadow-xl shadow-emerald-900/20">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100">ClipNotes Monitoring</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-400">
            Upload short clips, trigger Hafnia analysis, and review the timeline of key events from one monitoring canvas.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.35fr,1fr]">
          <div className="space-y-6">
            <StatusBanner
              status={status}
              fileName={fileName}
              pendingFileName={pendingFileName}
              error={error}
              remediation={remediation}
              statusChangedAt={statusChangedAt}
            />

            <UploadForm status={status} onAnalyze={handleAnalyze} onCancel={cancel} onReset={reset} />

            <SummaryPanel
              status={status}
              summary={summary}
              analysis={analysis}
              error={error}
              remediation={remediation}
              fileName={fileName}
              statusChangedAt={statusChangedAt}
            />
          </div>

          <SessionHistory
            clips={clips}
            sessions={history}
            activeSubmissionId={summary?.submission_id ?? analysis?.clip_id}
            onSelect={handleSelectSession}
            onSendChat={sendChat}
            onDelete={deleteSession}
          />
        </div>

        <footer className="text-xs text-slate-500">
          {isLoading || isClipListLoading ? "Processing with Hafnia…" : "Built for rapid training recaps."}
        </footer>
      </section>
    </main>
  );
}

export default App;
