export default function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`panel-card rounded-2xl p-4 md:p-5 transition duration-200 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold tracking-[-0.02em] text-text">{title}</h3>
        {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}
