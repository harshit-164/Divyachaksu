export default function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-3">
        <h3 className="font-semibold text-text">{title}</h3>
        {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}
