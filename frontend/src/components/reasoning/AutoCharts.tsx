import type { ReasoningMetricsResponse } from "../../types/reasoning";

interface AutoChartsProps {
  metrics?: ReasoningMetricsResponse | null;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function normalizeEntries(record: Record<string, number>): Array<[string, number]> {
  return Object.entries(record).filter(([, value]) => Number.isFinite(value));
}

function renderBar(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return "0%";
  }
  const ratio = Math.max(0, value) / maxValue;
  const percent = Math.round(ratio * 100);
  return `${percent}%`;
}

function AutoCharts({ metrics }: AutoChartsProps) {
  if (!metrics) {
    return (
      <p className="text-sm text-slate-400" role="status">
        No metrics available for this clip yet.
      </p>
    );
  }

  const countEntries = normalizeEntries(metrics.counts_by_label).sort((a, b) => b[1] - a[1]);
  const durationEntries = normalizeEntries(metrics.durations_by_label).sort((a, b) => b[1] - a[1]);
  const severityEntries = normalizeEntries(metrics.severity_distribution).sort((a, b) => b[1] - a[1]);

  const maxCount = countEntries.length ? Math.max(...countEntries.map(([, value]) => value)) : 0;
  const maxDuration = durationEntries.length ? Math.max(...durationEntries.map(([, value]) => value)) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Event counts</p>
          <h3 className="text-sm font-semibold text-slate-100">Top detections</h3>
          <p className="text-xs text-slate-400">Visual summary of how often each label appeared.</p>
        </header>
        {countEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No labeled events detected.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {countEntries.map(([label, value]) => (
              <li key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{label}</span>
                  <span className="text-slate-400">{value}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800/80" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-emerald-400/80"
                    style={{ width: renderBar(value, maxCount) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Durations</p>
          <h3 className="text-sm font-semibold text-slate-100">Time spent per label</h3>
          <p className="text-xs text-slate-400">Aggregated duration for each detection (seconds).</p>
        </header>
        {durationEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No timing information available.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {durationEntries.map(([label, value]) => (
              <li key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{label}</span>
                  <span className="text-slate-400">{value.toFixed(2)}s</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800/80" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-sky-400/80"
                    style={{ width: renderBar(value, maxDuration) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 md:col-span-2">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-400">Severity mix</p>
          <h3 className="text-sm font-semibold text-slate-100">Share of criticality</h3>
          <p className="text-xs text-slate-400">Ratios derived from either duration or count distribution.</p>
        </header>
        {severityEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No severity data captured.</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-3">
            {severityEntries.map(([severity, value]) => (
              <div key={severity} className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-300">{severity}</dt>
                <dd className="text-lg font-semibold text-slate-100">{toPercent(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

export default AutoCharts;
