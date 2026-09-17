export default function StatCard({ label, value, hint, accent = "cyan" }) {
  const accents = {
    cyan: "from-accent/15 to-transparent border-accent/25",
    crimson: "from-danger/15 to-transparent border-danger/25",
    mint: "from-success/15 to-transparent border-success/25",
    plum: "from-accent/10 to-transparent border-white/10",
    sky: "from-accent/10 to-transparent border-accent/20",
    amber: "from-warning/15 to-transparent border-warning/25",
  };
  return (
    <div
      className={`rounded-2xl border bg-card/90 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.12)] bg-gradient-to-br transition duration-200 hover:-translate-y-0.5 ${
        accents[accent] || accents.cyan
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-2.5 text-2xl font-semibold tracking-[-0.035em] text-text truncate">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
