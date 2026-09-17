export default function StatCard({ label, value, hint, accent = "cyan" }) {
  const accents = {
    cyan: "from-accent/15 to-transparent border-accent/25",
    crimson: "from-danger/15 to-transparent border-danger/25",
    mint: "from-success/15 to-transparent border-success/25",
    plum: "from-secondary/40 to-transparent border-border",
    sky: "from-accent/10 to-transparent border-accent/20",
    amber: "from-warning/15 to-transparent border-warning/25",
  };
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm bg-gradient-to-br ${
        accents[accent] || accents.cyan
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-text truncate">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
