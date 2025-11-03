"""Utilities for deriving visualization metrics from stored analyses."""

from __future__ import annotations

from collections import OrderedDict, defaultdict
from typing import Any, Mapping, cast
from uuid import UUID

from backend.app.models.reasoning import GraphEdge, GraphNode, GraphPayload, ReasoningMetricsResponse
from backend.app.store.base import AnalysisRecord, Moment


def summarize_clip_metrics(analysis: AnalysisRecord) -> ReasoningMetricsResponse:
    """Aggregate counts, durations, and severity ratios for visualization panels."""

    counts, durations, severity_totals, severity_counts = _accumulate_moments(analysis.moments)
    durations_final = {label: round(value, 2) for label, value in durations.items()}

    severity_distribution = _derive_severity_distribution(severity_totals, severity_counts)
    object_graph = _extract_object_graph(analysis.raw)

    return ReasoningMetricsResponse(
        clip_id=analysis.clip_id,
        counts_by_label=dict(counts),
        durations_by_label=durations_final,
        severity_distribution=severity_distribution,
        object_graph=object_graph,
    )


def _accumulate_moments(moments: list[Moment]) -> tuple[OrderedDict[str, int], OrderedDict[str, float], dict[str, float], dict[str, int]]:
    counts: OrderedDict[str, int] = OrderedDict()
    durations: OrderedDict[str, float] = OrderedDict()
    severity_totals: dict[str, float] = defaultdict(float)
    severity_counts: dict[str, int] = defaultdict(int)

    for moment in moments:
        label = _normalize_label(moment.label)
        duration = _normalized_duration(moment.start_s, moment.end_s)

        counts[label] = counts.get(label, 0) + 1
        durations[label] = durations.get(label, 0.0) + duration

        severity = _normalize_label(moment.severity)
        severity_totals[severity] += duration
        severity_counts[severity] += 1

    return counts, durations, severity_totals, severity_counts


def _normalized_duration(start: float, end: float) -> float:
    try:
        start_value = float(start)
        end_value = float(end)
    except (TypeError, ValueError):
        return 0.0
    duration = end_value - start_value
    if duration < 0:
        return 0.0
    return duration


def _normalize_label(value: object) -> str:
    if not isinstance(value, str):
        return "unknown"
    stripped = value.strip()
    return stripped or "unknown"


def _derive_severity_distribution(durations: Mapping[str, float], counts: Mapping[str, int]) -> dict[str, float]:
    total_duration = sum(value for value in durations.values() if value > 0)
    if total_duration > 0:
        return {severity: round(value / total_duration, 4) for severity, value in durations.items() if value > 0}

    total_counts = sum(counts.values())
    if total_counts > 0:
        return {severity: round(count / total_counts, 4) for severity, count in counts.items() if count > 0}

    return {}


def _extract_object_graph(raw: object) -> GraphPayload | None:
    if not isinstance(raw, dict):
        return None

    raw_dict = cast(Mapping[str, object], raw)

    candidates: list[object] = [
        raw_dict.get("object_graph"),
        raw_dict.get("graph"),
        raw_dict.get("object_interaction_graph"),
    ]

    structured = raw_dict.get("structured_summary")
    if isinstance(structured, dict):
        structured_map = cast(Mapping[str, object], structured)
        candidates.append(structured_map.get("object_graph"))
        candidates.append(structured_map.get("object_interactions"))
    elif isinstance(structured, list):
        candidates.extend(structured)

    reasoning_section = raw_dict.get("reasoning")
    if isinstance(reasoning_section, dict):
        reasoning_map = cast(Mapping[str, object], reasoning_section)
        candidates.append(reasoning_map.get("object_graph"))
        candidates.append(reasoning_map.get("graph"))
        candidates.append(reasoning_map.get("object_interactions"))

    for candidate in candidates:
        graph = _coerce_graph(candidate)
        if graph is not None:
            return graph

    return None


def _coerce_graph(candidate: object) -> GraphPayload | None:
    if not isinstance(candidate, dict):
        return None

    candidate_dict = cast(Mapping[str, object], candidate)

    nodes_raw = candidate_dict.get("nodes")
    edges_raw = candidate_dict.get("edges")

    if not isinstance(nodes_raw, list) or not isinstance(edges_raw, list):
        return None

    nodes: list[GraphNode] = []
    for raw_node in nodes_raw:
        if not isinstance(raw_node, dict):
            continue
        node_map = cast(Mapping[str, object], raw_node)
        node_id = node_map.get("id")
        label = node_map.get("label")
        if not isinstance(node_id, str) or not node_id.strip():
            continue
        label_text = label.strip() if isinstance(label, str) and label.strip() else node_id.strip()
        metadata_raw = node_map.get("metadata")
        metadata = cast(dict[str, Any], metadata_raw) if isinstance(metadata_raw, dict) else None
        nodes.append(GraphNode(id=node_id.strip(), label=label_text, metadata=metadata))

    edges: list[GraphEdge] = []
    for raw_edge in edges_raw:
        if not isinstance(raw_edge, dict):
            continue
        edge_map = cast(Mapping[str, object], raw_edge)
        source = edge_map.get("source")
        target = edge_map.get("target")
        if not isinstance(source, str) or not isinstance(target, str):
            continue
        relation = edge_map.get("relation")
        relation_text = relation.strip() if isinstance(relation, str) and relation.strip() else None
        metadata_raw = edge_map.get("metadata")
        metadata = cast(dict[str, Any], metadata_raw) if isinstance(metadata_raw, dict) else None
        edges.append(
            GraphEdge(
                source=source.strip(),
                target=target.strip(),
                relation=relation_text,
                metadata=metadata,
            )
        )

    if not nodes or not edges:
        return None

    # Deduplicate nodes by identifier preserving insertion order.
    seen: dict[str, GraphNode] = OrderedDict()
    for node in nodes:
        if node.id not in seen:
            seen[node.id] = node

    return GraphPayload(nodes=list(seen.values()), edges=edges)


__all__ = ["summarize_clip_metrics"]
