/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { FormEvent, useMemo, useState } from "react";

import type { ClipListItem } from "../../hooks/useClips";
import { useCompareClips } from "../../hooks/useCompareClips";
import type { ReasoningEvidence } from "../../types/reasoning";
import OverlapHeatmap from "./OverlapHeatmap";

export interface CompareFormProps {
  clips: ClipListItem[];
}

function formatConfidence(confidence?: number | null) {
  if (confidence === undefined || confidence === null) {
    return null;
  }

  return `${Math.round(confidence * 100)}%`;
}

function CompareForm({ clips }: CompareFormProps) {
  const [clipA, setClipA] = useState<string>("");
  const [clipB, setClipB] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const { mutateAsync, reset, isPending, isSuccess, data } = useCompareClips();

  const analyzedClips = useMemo<ClipListItem[]>(
    () => clips.filter((clip) => clip.status === "ready" || clip.status === "completed"),
    [clips],
  );
  const clipLookup = useMemo(() => new Map(analyzedClips.map((clip) => [clip.clip_id, clip])), [analyzedClips]);

  const canSubmit = Boolean(clipA && clipB && question.trim()) && clipA !== clipB && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!clipA || !clipB) {
      setFormError("Select two clips with completed analyses before running a comparison.");
      return;
    }

    if (clipA === clipB) {
      setFormError("Select two different clips to compare.");
      return;
    }

    if (!question.trim()) {
      setFormError("Enter a question to compare.");
      return;
    }

    setFormError(null);
    reset();
    const runComparison = async () => {
      try {
        await mutateAsync({
          clip_a: clipA,
          clip_b: clipB,
          question: question.trim(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to compare clips.";
        setFormError(message);
      }
    };

    void runComparison();
  };

  const renderEvidence = (items: ReasoningEvidence[]) => {
    if (items.length === 0) {
      return <p className="text-sm text-text-secondary/70">No evidence returned for this comparison.</p>;
    }

    return (
      <ul className="space-y-3">
        {items.map((item, index) => {
          const clip = clipLookup.get(item.clip_id);
          const clipLabel = clip?.filename ?? item.clip_id;

          return (
            <li
              key={`${item.clip_id}-${item.label}-${index}`}
              className="rounded-lg border border-border-glass bg-surface-canvas/60 p-3"
            >
              <div className="text-sm font-semibold text-text-primary">{item.label}</div>
              <p className="text-xs text-text-secondary/75">
                Clip: <span className="font-medium text-text-primary">{clipLabel}</span>
              </p>
              {item.timestamp_range ? (
                <p className="text-xs text-text-secondary/75">
                  Timestamp: {item.timestamp_range[0].toFixed(2)}s – {item.timestamp_range[1].toFixed(2)}s
                </p>
              ) : null}
              {item.description ? <p className="text-xs text-text-secondary/75">{item.description}</p> : null}
            </li>
          );
        })}
      </ul>
    );
  };

  const comparisonResult = isSuccess && data ? data : null;
  const confidenceLabel = formatConfidence(comparisonResult?.confidence ?? null);
  const answerLabel = useMemo(() => {
    if (!comparisonResult) {
      return null;
    }

    switch (comparisonResult.answer) {
      case "clip_a":
        return clipLookup.get(clipA)?.filename ?? "Clip A";
      case "clip_b":
        return clipLookup.get(clipB)?.filename ?? "Clip B";
      case "equal":
        return "Clips appear equal";
      case "uncertain":
      default:
        return "Reasoner uncertain";
    }
  }, [comparisonResult, clipA, clipB, clipLookup]);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-2xl border border-border-glass bg-surface-canvas/60 p-6 shadow-glass"
        onSubmit={handleSubmit}
        noValidate
      >
        <fieldset className="grid gap-4 md:grid-cols-2" disabled={isPending}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary" htmlFor="compare-clip-a">
              First clip
            </label>
            <select
              id="compare-clip-a"
              className="rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={clipA}
              onChange={(event) => {
                const value = event.target.value;
                setClipA(value);
                if (value && clipB && value === clipB) {
                  setFormError("Select two different clips to compare.");
                } else {
                  setFormError(null);
                }
              }}
            >
              <option value="">Select a clip…</option>
              {analyzedClips.map((clip) => (
                <option key={clip.clip_id} value={clip.clip_id}>
                  {clip.filename}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-primary" htmlFor="compare-clip-b">
              Second clip
            </label>
            <select
              id="compare-clip-b"
              className="rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={clipB}
              onChange={(event) => {
                const value = event.target.value;
                setClipB(value);
                if (value && clipA && value === clipA) {
                  setFormError("Select two different clips to compare.");
                } else {
                  setFormError(null);
                }
              }}
            >
              <option value="">Select a clip…</option>
              {analyzedClips.map((clip) => (
                <option key={clip.clip_id} value={clip.clip_id}>
                  {clip.filename}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary" htmlFor="compare-question">
            Question
          </label>
          <textarea
            id="compare-question"
            className="min-h-[96px] rounded-lg border border-border-glass bg-surface-canvas/70 px-3 py-2 text-sm text-text-primary focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setFormError(null);
            }}
            placeholder="e.g. Which intersection shows longer congestion near zone 3?"
          />
        </div>

        {formError ? (
          <p className="text-sm text-rose-400" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit}
          >
            {isPending ? "Comparing…" : "Run comparison"}
          </button>
          {isSuccess ? (
            <button
              type="button"
              className="text-sm font-medium text-text-secondary underline-offset-4 hover:underline"
              onClick={() => {
                reset();
                setFormError(null);
              }}
            >
              Clear result
            </button>
          ) : null}
        </div>
      </form>

      {comparisonResult ? (
        <section className="space-y-4 rounded-2xl border border-border-glass bg-surface-canvas/60 p-6 shadow-glass">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-emerald-400">Answer</p>
            <h2 className="text-lg font-semibold text-text-primary">{answerLabel ?? comparisonResult.answer.replace("_", " ")}</h2>
            <p className="text-sm text-text-secondary">{comparisonResult.explanation}</p>
            {confidenceLabel ? (
              <p className="text-xs text-text-secondary/75">Confidence: {confidenceLabel}</p>
            ) : null}
          </header>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Evidence</h3>
            {renderEvidence(comparisonResult.evidence)}
          </div>

          <OverlapHeatmap evidence={comparisonResult.evidence} clips={analyzedClips} />
        </section>
      ) : null}
    </div>
  );
}

export default CompareForm;
