import { useCallback } from "react";

import SummaryPanel from "../components/SummaryPanel";
import UploadForm from "../components/UploadForm";
import { useAnalyze } from "../hooks/useAnalyze";

function App() {
  const { state, analyze, cancel, reset, isLoading } = useAnalyze();
  const { status, summary, error, fileName } = state;

  const handleAnalyze = useCallback(
    (file: File) => {
      void analyze(file);
    },
    [analyze]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100">ClipNotes</h1>
          <p className="text-base text-slate-400">
            Upload short clips to receive Hafnia-powered summaries in seconds.
          </p>
        </header>

  <UploadForm status={status} onAnalyze={handleAnalyze} onCancel={cancel} onReset={reset} />

        <SummaryPanel
          status={status}
          summary={summary}
          error={error}
          fileName={fileName}
        />

        <footer className="text-xs text-slate-500">
          {isLoading ? "Processing with Hafnia…" : "Built for rapid training recaps."}
        </footer>
      </section>
    </main>
  );
}

export default App;
