import type { GraphPayload } from "../../types/reasoning";

interface GraphVisualizerProps {
  graph?: GraphPayload | null;
}

function renderMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-1 text-xs text-text-secondary/75">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-2">
          <dt className="font-medium text-text-primary">{key}</dt>
          <dd className="text-right text-text-secondary/75">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function GraphVisualizer({ graph }: GraphVisualizerProps) {
  if (!graph || graph.nodes.length === 0 || graph.edges.length === 0) {
    return (
      <p className="text-sm text-text-secondary/75" role="status">
        Object interaction graph not available for this analysis.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border-glass/85 bg-surface-panel/95 p-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-accent-primary/80">Object graph</p>
        <h3 className="text-sm font-semibold text-text-primary">Key entities and relationships</h3>
        <p className="text-xs text-text-secondary/75">Keyboard-friendly summaries of nodes and how they connect.</p>
      </header>

      <section className="space-y-2" aria-labelledby="graph-visualizer-nodes">
        <h4 id="graph-visualizer-nodes" className="text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
          Nodes
        </h4>
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {graph.nodes.map((node) => (
            <li
              key={node.id}
              className="space-y-1 rounded-lg border border-border-glass/85 bg-surface-panel/90 p-3 focus-within:ring-2 focus-within:ring-accent-primary/60"
            >
              <div className="text-sm font-semibold text-text-primary">{node.label}</div>
              <p className="text-xs text-text-secondary/75">Identifier: {node.id}</p>
              {renderMetadata(node.metadata)}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2" aria-labelledby="graph-visualizer-edges">
        <h4 id="graph-visualizer-edges" className="text-xs font-semibold uppercase tracking-wide text-text-secondary/80">
          Relationships
        </h4>
        <ol className="space-y-2" role="list">
          {graph.edges.map((edge, index) => (
            <li
              key={`${edge.source}-${edge.target}-${index}`}
              className="rounded-lg border border-border-glass/85 bg-surface-panel/90 p-3"
            >
              <p className="text-sm text-text-primary">
                <span className="font-semibold text-accent-primary/90">{edge.source}</span>
                <span className="text-text-secondary/70"> ⟶ </span>
                <span className="font-semibold text-accent-primary/90">{edge.target}</span>
              </p>
              {edge.relation ? (
                <p className="text-xs text-text-secondary/75">Relation: {edge.relation}</p>
              ) : null}
              {renderMetadata(edge.metadata)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default GraphVisualizer;
