export default function ExplanationPanel({ explanation, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="h-4 w-40 rounded bg-secondary animate-pulse" />
        <div className="h-3 w-full rounded bg-secondary animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-secondary animate-pulse" />
        <div className="h-3 w-4/6 rounded bg-secondary animate-pulse" />
        <div className="text-xs text-muted">Building investigation brief…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
        <div className="font-semibold text-danger">Could not load explanation</div>
        <p className="text-muted mt-1">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-accent underline"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted">
        No investigation brief available for this event yet.
      </div>
    );
  }

  const sourceLabel =
    explanation.source === "gemini"
      ? "LLM-assisted"
      : explanation.source === "risk-radar-engine"
        ? "Risk engine"
        : "Generated";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-secondary px-4 py-3 flex items-center justify-between border-b border-border">
        <h3 className="font-semibold text-text">Investigation Brief</h3>
        <span className="text-[10px] uppercase tracking-wider text-accent">{sourceLabel}</span>
      </div>
      <div className="p-4 space-y-4">
        <Section title="What happened" body={explanation.what_happened} />
        <Section title="Why it looks suspicious" body={explanation.why_suspicious} />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-2">Risk factors</div>
          <div className="flex flex-wrap gap-2">
            {(explanation.risk_factors || []).map((f) => (
              <span
                key={f}
                className="rounded-md border border-danger/25 bg-danger/10 px-2 py-1 text-xs text-danger"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
        <Section title="Business impact" body={explanation.business_impact} />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-2">Investigation steps</div>
          <ol className="space-y-2">
            {(explanation.investigation_steps || []).map((s, i) => (
              <li key={s} className="flex gap-2 text-sm text-text">
                <span className="shrink-0 h-5 w-5 rounded-full bg-accent text-primary text-[11px] flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3">
          <div className="text-[11px] uppercase tracking-wide text-accent mb-1">Recommended response</div>
          <p className="text-sm text-text leading-relaxed">{explanation.suggested_response}</p>
        </div>
        <div className="rounded-lg bg-secondary border border-border p-3 text-sm text-text leading-relaxed">
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Plain English</div>
          {explanation.plain_english_summary}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{title}</div>
      <p className="text-sm text-text leading-relaxed">{body}</p>
    </div>
  );
}
