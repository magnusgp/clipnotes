import { useCallback } from "react";
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";

import SessionHistory from "../components/SessionHistory";
import StatusBanner from "../components/StatusBanner";
import SummaryPanel from "../components/SummaryPanel";
import UploadForm from "../components/UploadForm";
import ReasoningMetricsPanel from "../components/reasoning/ReasoningMetricsPanel";
import { ThemeToggle } from "../components/ThemeToggle";
import { Hero } from "../components/Hero";
import { FeatureFlagProvider, isFeatureEnabled, useFeatureFlags } from "../flags";
import type { FeatureFlagMap } from "../types/config";
import CompareReason from "./CompareReason";
import Settings from "./Settings";
import Metrics from "./Metrics";
import Insights from "./Insights";
import InsightsShare from "./InsightsShare";
import { useAnalyze } from "../hooks/useAnalyze";
import { useClips } from "../hooks/useClips";

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
  const { flags } = useFeatureFlags();
  const liveModeEnabled = isFeatureEnabled(flags, "ENABLE_LIVE_MODE", false);
  const graphViewEnabled = isFeatureEnabled(flags, "ENABLE_GRAPH_VIEW", true);

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

      <section id="upload" className="grid gap-10 lg:grid-cols-[1.2fr,1fr]">
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

        <div className="space-y-8" id="insights">
          {graphViewEnabled ? (
            <ReasoningMetricsPanel
              clips={clips}
              isRefreshing={isLoading || isClipListLoading}
              onRefreshClips={refreshClips}
              error={clipListError}
            />
          ) : null}

          <div id="history">
            <SessionHistory
              clips={clips}
              sessions={history}
              activeSubmissionId={summary?.submission_id ?? analysis?.clip_id}
              onSelect={handleSelectSession}
              onSendChat={sendChat}
              onDelete={deleteSession}
            />
            {liveModeEnabled ? (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
                Live mode enabled — session history will stream in automatically.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="text-xs text-text-secondary">
        {isLoading || isClipListLoading ? "Processing with Hafnia…" : "Built for rapid training recaps."}
      </footer>
    </>
  );
}

function AppLayout() {
  const { flags } = useFeatureFlags();
  const navItems = [
    { id: "monitoring", label: "Monitoring", path: "/" },
    ...(isFeatureEnabled(flags, "ENABLE_GRAPH_VIEW", true) ? [{ id: "metrics", label: "Metrics", path: "/metrics" }] : []),
    { id: "insights", label: "Insights", path: "/insights" },
    { id: "settings", label: "Settings", path: "/settings" },
  ];

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
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 focus:ring-offset-surface-canvas ${
                      isActive
                        ? "bg-accent-primary/15 text-accent-primary"
                        : "text-text-secondary hover:text-text-primary"
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

function ShareLayout() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-surface-canvas text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.18),transparent_52%)]"
      />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
        <Outlet />
      </div>
    </main>
  );
}

interface AppProps {
  initialFlags?: FeatureFlagMap;
  loadFlags?: boolean;
}

function App({ initialFlags, loadFlags = true }: AppProps = {}) {
  return (
    <FeatureFlagProvider loadFromServer={loadFlags} initialFlags={initialFlags}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<MonitoringDashboard />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="share" element={<ShareLayout />}>
            <Route index element={<InsightsShare />} />
            <Route path=":token" element={<InsightsShare />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FeatureFlagProvider>
  );
}

export default App;
