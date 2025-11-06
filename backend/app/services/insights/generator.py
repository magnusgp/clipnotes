from __future__ import annotations

from typing import Sequence

from backend.app.services.insights.aggregator import AggregatedInsights
from backend.app.models.insights import InsightTopLabel


class SummaryGenerator:
    """Produce deterministic fallback summaries for the Insight Layer."""

    def build_fallback(self, aggregated: AggregatedInsights) -> str:
        total_events = (
            aggregated.severity_totals.low
            + aggregated.severity_totals.medium
            + aggregated.severity_totals.high
        )
        if total_events == 0:
            return "No significant events were detected in the selected window."

        window_phrase = "the past 24 hours" if aggregated.window == "24h" else "the past 7 days"
        parts: list[str] = [f"{total_events} notable moments were recorded over {window_phrase}."]

        if aggregated.severity_totals.high > 0:
            parts.append(
                f"High-severity events occurred {aggregated.severity_totals.high} time(s),"
                f" alongside {aggregated.severity_totals.medium} medium and {aggregated.severity_totals.low} low severity occurrences."
            )
        else:
            parts.append(
                f"Most activity remained low impact ({aggregated.severity_totals.low} low,"
                f" {aggregated.severity_totals.medium} medium severity)."
            )

        label_clause = _format_top_labels(aggregated.top_labels)
        if label_clause:
            parts.append(label_clause)

        if aggregated.delta is not None and aggregated.delta:
            delta_bits = _format_delta(aggregated.delta)
            if delta_bits:
                parts.append(delta_bits)

        return " ".join(part.strip() for part in parts if part)


def _format_top_labels(top_labels: Sequence[InsightTopLabel]) -> str:
    if not top_labels:
        return ""

    names = [label.label for label in top_labels[:3]]
    if not names:
        return ""

    if len(names) == 1:
        return f"Dominant activity: {names[0]}."

    return f"Dominant activity: {', '.join(names[:-1])}, and {names[-1]}."


def _format_delta(delta: dict[str, int]) -> str:
    parts: list[str] = []
    analyses_delta = delta.get("analyses")
    high_delta = delta.get("high_severity")

    if isinstance(analyses_delta, int) and analyses_delta != 0:
        trend = "increased" if analyses_delta > 0 else "decreased"
        parts.append(f"Total analyses {trend} by {abs(analyses_delta)} compared to the prior window.")

    if isinstance(high_delta, int) and high_delta != 0:
        trend = "rose" if high_delta > 0 else "fell"
        parts.append(f"High-severity incidents {trend} by {abs(high_delta)}.")

    return " ".join(parts)
