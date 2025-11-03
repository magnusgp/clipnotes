from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from backend.app.reasoning.transformers import summarize_clip_metrics
from backend.app.store.base import AnalysisRecord, Moment


def _analysis_record(*, moments: list[Moment], raw: dict[str, object] | None = None) -> AnalysisRecord:
    clip_id = uuid4()
    return AnalysisRecord(
        clip_id=clip_id,
        summary="",
        moments=moments,
        raw=raw or {},
        created_at=datetime.now(timezone.utc),
        latency_ms=1234,
        prompt=None,
        error_code=None,
        error_message=None,
    )


def test_summarize_clip_metrics_computes_counts_and_ratios():
    moments = [
        Moment(start_s=0.0, end_s=5.0, label="collision", severity="high"),
        Moment(start_s=12.0, end_s=20.0, label="congestion", severity="medium"),
        Moment(start_s=21.0, end_s=25.0, label="collision", severity="high"),
    ]
    graph_payload = {
        "structured_summary": {
            "object_graph": {
                "nodes": [
                    {"id": "vessel-a", "label": "Vessel A", "metadata": {"type": "tanker"}},
                    {"id": "dock-1", "label": "Dock 1"},
                ],
                "edges": [
                    {
                        "source": "vessel-a",
                        "target": "dock-1",
                        "relation": "moored",
                        "metadata": {"confidence": 0.82},
                    }
                ],
            }
        }
    }
    analysis = _analysis_record(moments=moments, raw=graph_payload)

    metrics = summarize_clip_metrics(analysis)

    assert metrics.clip_id == analysis.clip_id
    assert metrics.counts_by_label == {"collision": 2, "congestion": 1}
    assert metrics.durations_by_label == {"collision": 9.0, "congestion": 8.0}

    severity = metrics.severity_distribution
    assert severity.keys() == {"high", "medium"}
    assert severity["high"] == pytest.approx(9.0 / 17.0, rel=1e-3)
    assert severity["medium"] == pytest.approx(8.0 / 17.0, rel=1e-3)

    graph = metrics.object_graph
    assert graph is not None
    node_ids = {node.id for node in graph.nodes}
    assert node_ids == {"vessel-a", "dock-1"}
    assert graph.edges[0].relation == "moored"
    assert graph.edges[0].metadata == {"confidence": 0.82}


def test_summarize_clip_metrics_handles_missing_data():
    analysis = _analysis_record(moments=[], raw={"object_graph": {"nodes": [], "edges": []}})

    metrics = summarize_clip_metrics(analysis)

    assert metrics.counts_by_label == {}
    assert metrics.durations_by_label == {}
    assert metrics.severity_distribution == {}
    assert metrics.object_graph is None
