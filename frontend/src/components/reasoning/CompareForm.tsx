 
import { FormEvent, useMemo, useState } from "react";

import type { ClipListItem } from "../../hooks/useClips";
import { useCompareClips } from "../../hooks/useCompareClips";
import type { ReasoningEvidence } from "../../types/reasoning";
import { Card, CardContent, CardHeader, CardTitle } from "../Card";
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

function formatSecondsLabel(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatTimestampRange(range?: ReasoningEvidence["timestamp_range"]) {
  if (!range || range.length !== 2) {
    return null;
  }

  const [start, end] = range;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  return `${formatSecondsLabel(start)} – ${formatSecondsLabel(end)}`;
}

function normalizeExplanation(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function CompareForm({ clips }: CompareFormProps) {
  const [clipA, setClipA] = useState<string>("");
  const [clipB, setClipB] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const compareMutation: ReturnType<typeof useCompareClips> = useCompareClips();
  const isPending = compareMutation.isPending;
  const isSuccess = compareMutation.isSuccess;

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
  compareMutation.reset();
    const runComparison = async () => {
      try {
  await compareMutation.mutateAsync({
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
      return <p className="text-sm text-text-secondary/75">No evidence returned for this comparison.</p>;
    }

    return (
      <ul className="space-y-3">
        {items.map((item, index) => {
          const clip = clipLookup.get(item.clip_id);
          const clipLabel = clip?.filename ?? item.clip_id;
          const rangeLabel = formatTimestampRange(item.timestamp_range);

          return (
            <li
              key={`${item.clip_id}-${item.label}-${index}`}
              className="rounded-2xl border border-border-glass/75 bg-surface-glass/75 p-3 shadow-glass/20"
            >
              <div className="text-sm font-semibold text-text-primary">{item.label}</div>
              <p className="text-xs text-text-secondary/80">
                Clip: <span className="font-medium text-text-primary">{clipLabel}</span>
              </p>
              {rangeLabel ? <p className="text-xs text-text-secondary/80">Timestamp: {rangeLabel}</p> : null}
              {item.description ? <p className="text-xs text-text-secondary/80">{item.description}</p> : null}
            </li>
          );
        })}
      </ul>
    );
  };

  const comparisonResult = isSuccess && compareMutation.data ? compareMutation.data : null;
  const confidenceLabel = formatConfidence(comparisonResult?.confidence ?? null);
  const explanationParagraphs = useMemo(
    () => normalizeExplanation(comparisonResult?.explanation ?? null),
    [comparisonResult?.explanation],
  );
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
      <Card interactive={false} surface="glass">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <fieldset className="grid gap-4 md:grid-cols-2" disabled={isPending}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary" htmlFor="compare-clip-a">
                First clip
              </label>
              <select
                id="compare-clip-a"
                className="rounded-lg border border-border-glass/70 bg-surface-glass/70 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
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
                className="rounded-lg border border-border-glass/70 bg-surface-glass/70 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
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
              className="min-h-[96px] rounded-lg border border-border-glass/70 bg-surface-glass/70 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setFormError(null);
              }}
              placeholder="e.g. Which intersection shows longer congestion near zone 3?"
            />
          </div>

          {formError ? (
            <p className="text-sm text-rose-500" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-text-primary px-4 py-2 text-sm font-semibold text-surface-canvas transition hover:bg-text-accent focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 focus:ring-offset-surface-glass disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
            >
              {isPending ? "Comparing…" : "Run comparison"}
            </button>
            {isSuccess ? (
              <button
                type="button"
                className="text-sm font-medium text-text-secondary underline-offset-4 hover:underline"
                onClick={() => {
                    compareMutation.reset();
                  setFormError(null);
                }}
              >
                Clear result
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      {comparisonResult ? (
        <Card interactive={false} surface="glass">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Answer</p>
            <CardTitle className="text-lg">
              {answerLabel ?? comparisonResult.answer.replace("_", " ")}
            </CardTitle>
            {explanationParagraphs.length ? (
              <div className="space-y-2 text-sm text-text-secondary">
                {explanationParagraphs.map((paragraph, index) => (
                  <p key={`explanation-${index}`}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{comparisonResult.explanation}</p>
            )}
            {confidenceLabel ? (
              <p className="text-xs text-text-secondary/75">Confidence: {confidenceLabel}</p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Evidence</h3>
              {renderEvidence(comparisonResult.evidence)}
            </div>

            <OverlapHeatmap evidence={comparisonResult.evidence} clips={analyzedClips} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default CompareForm;
