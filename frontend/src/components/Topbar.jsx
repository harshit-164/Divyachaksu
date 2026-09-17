export default function Topbar({ title, subtitle, connection, actions }) {
  const statusColor =
    connection === "Connected"
      ? "bg-success"
      : connection === "Reconnecting"
        ? "bg-warning"
        : "bg-muted";

  return (
    <header className="sticky top-0 z-20 bg-primary/82 backdrop-blur-xl border-b border-white/8">
      <div className="px-4 md:px-7 py-4 md:py-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-[26px] font-semibold tracking-[-0.035em] text-text">{title}</h1>
          {subtitle ? <p className="text-sm text-muted mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {connection ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-card/90 px-3 py-1.5 text-xs text-muted">
              <span className={`h-2 w-2 rounded-full live-dot ${statusColor} ${connection === "Connected" ? "text-success" : ""}`} />
              {connection}
            </div>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
