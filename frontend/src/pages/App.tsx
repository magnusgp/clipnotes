import { useCallback } from "react";
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";

import SessionHistory from "../components/SessionHistory";
import StatusBanner from "../components/StatusBanner";
import SummaryPanel from "../components/SummaryPanel";
import UploadForm from "../components/UploadForm";
import { ThemeToggle } from "../components/ThemeToggle";
import { Hero } from "../components/Hero";
import CompareReason from "./CompareReason";
import Settings from "./Settings";
import { useAnalyze } from "../hooks/useAnalyze";
import { useClips } from "../hooks/useClips";

type NavigationItem = {
  id: string;
  label: string;
  path: string;
};

const NAV_ITEMS: NavigationItem[] = [
  { id: "monitoring", label: "Monitoring", path: "/" },
  { id: "settings", label: "Settings", path: "/settings" },
];

function MonitoringDashboard() {
  const { clips, refresh: refreshClips, isLoading: isClipListLoading, error: clipListError } = useClips();
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
    <>
      <Hero />

      <section id="upload" className="grid gap-10 lg:grid-cols-[1.35fr,1fr]">
        <div className="space-y-8">
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

          <CompareReason
            clips={clips}
            onRefreshClips={refreshClips}
            isRefreshing={isLoading || isClipListLoading}
            error={clipListError}
          />
        </div>

        <div id="history">
          <SessionHistory
            clips={clips}
            sessions={history}
            activeSubmissionId={summary?.submission_id ?? analysis?.clip_id}
            onSelect={handleSelectSession}
            onSendChat={sendChat}
            onDelete={deleteSession}
          />
        </div>
      </section>

      <footer className="text-xs text-text-secondary">
        {isLoading || isClipListLoading ? "Processing with Hafnia…" : "Built for rapid training recaps."}
      </footer>
    </>
  );
}

function AppLayout() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-surface-canvas text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.18),transparent_52%)]"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-14">
        <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-glass bg-surface-glass/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-text-secondary/80">
            ClipNotes Monitoring
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm font-semibold" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                      isActive ? "bg-emerald-400/20 text-emerald-300" : "text-slate-300 hover:text-slate-100"
                    }`
                  }
                  end={item.path === "/"}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <Outlet />
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<MonitoringDashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
