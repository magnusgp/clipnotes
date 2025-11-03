import { useMemo } from "react";

import type { ClipListItem } from "../../hooks/useClips";
import type { ReasoningEvidence } from "../../types/reasoning";

export interface OverlapHeatmapProps {
  evidence: ReasoningEvidence[];
  clips: ClipListItem[];
}

function formatRange(range?: [number, number]) {
  if (!range) {
    return "Unknown";
  }

  const [start, end] = range;
  return `${start.toFixed(2)}s – ${end.toFixed(2)}s`;
}

function normalizeRanges(items: ReasoningEvidence[]) {
  const ranges = items.reduce<Array<[number, number]>>((accumulator, item) => {
    const range = item.timestamp_range;
    if (Array.isArray(range) && range.length === 2) {
      const [start, end] = range;
      accumulator.push([Math.min(start, end), Math.max(start, end)]);
    }
    return accumulator;
  }, []);

  if (ranges.length === 0) {
    return items.map(() => ({ width: 100, offset: 0 }));
  }

  const minStart = ranges.reduce((min, [start]) => Math.min(min, start), ranges[0][0]);
  const maxEnd = ranges.reduce((max, [, end]) => Math.max(max, end), ranges[0][1]);
  const totalSpan = Math.max(maxEnd - minStart, 0.01);

  return items.map((item) => {
    const range = item.timestamp_range;
    if (!range || range.length !== 2) {
      return { width: 100, offset: 0 };
    }

    const [startRaw, endRaw] = range;
    const start = Math.min(startRaw, endRaw);
    const end = Math.max(startRaw, endRaw);
    const duration = Math.max(end - start, 0.01);
    const width = Math.max((duration / totalSpan) * 100, 6);
    const offset = ((start - minStart) / totalSpan) * 100;
    return {
      width,
      offset,
    };
  });
}

export function OverlapHeatmap({ evidence, clips }: OverlapHeatmapProps) {
  const clipsById = useMemo(() => new Map(clips.map((clip) => [clip.clip_id, clip])), [clips]);

  const grouped = useMemo(() => {
    return evidence.reduce<Record<string, ReasoningEvidence[]>>((accumulator, item) => {
      const existing = accumulator[item.clip_id] ?? [];
      existing.push(item);
      accumulator[item.clip_id] = existing;
      return accumulator;
    }, {});
  }, [evidence]);

  const clipIds = Object.keys(grouped);

  if (clipIds.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" aria-label="Evidence heatmap">
      <h3 className="text-sm font-semibold text-slate-200">Evidence heatmap</h3>
      <p className="mt-1 text-xs text-slate-400">Highlights intervals called out by the reasoning service.</p>
      <div className="mt-4 space-y-4">
        {clipIds.map((clipId) => {
          const items = grouped[clipId];
          const metrics = normalizeRanges(items);
          const clip = clipsById.get(clipId);
          const clipLabel = clip?.filename ?? clipId;

          return (
            <div key={clipId} className="space-y-2">
              <div className="text-sm font-medium text-slate-100">{clipLabel}</div>
              <ul className="space-y-2">
                {items.map((item, index) => {
                  const sizing = metrics[index];
                  return (
                    <li key={`${clipId}-${item.label}-${index}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-medium text-slate-100">{item.label}</span>
                        <span>{formatRange(item.timestamp_range)}</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                        <span
                          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400/80 to-sky-400/80"
                          style={{ width: `${sizing.width}%`, left: `${sizing.offset ?? 0}%` }}
                          aria-hidden
                        />
                      </div>
                      {item.description ? <p className="text-xs text-slate-400">{item.description}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default OverlapHeatmap;
