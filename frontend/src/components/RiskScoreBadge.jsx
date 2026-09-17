import { riskColor } from "../utils/formatRisk";
import { formatDate } from "../utils/formatDate";
import { formatAmount } from "../utils/formatRisk";
import { RiskBadge } from "./Badge";

export default function RiskScoreBadge({ score, level }) {
  const color = riskColor(level);
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1"
      style={{ borderColor: `${color}66`, background: `${color}14` }}
    >
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>
        {score}
      </span>
      <RiskBadge level={level} />
    </div>
  );
}

export function LiveEventCard({ event, onClick }) {
  const isCritical = event.risk_level === "Critical" || event.risk_score >= 90;
  const isHigh = event.risk_level === "High" || event.risk_score >= 70;
  const alertTone = isCritical
    ? "bg-danger"
    : isHigh
      ? "bg-warning"
      : event.is_anomaly
        ? "bg-accent"
        : "bg-success";

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className="w-full text-left rounded-2xl border border-white/10 bg-card/90 px-4 py-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:border-accent/35 transition duration-200 fade-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text truncate">
            <span className={`h-2 w-2 shrink-0 rounded-full ${alertTone}`} />
            {event.event_type}
            <span className="text-muted font-medium"> · {event.user_id}</span>
          </div>
          <div className="text-xs text-muted mt-1 truncate">
            {event.ip_address} · {event.location} · {event.device}
          </div>
          {event.amount != null ? (
            <div className="text-xs font-medium text-text mt-1">{formatAmount(event.amount)}</div>
          ) : null}
        </div>
        <RiskScoreBadge score={event.risk_score} level={event.risk_level} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5 text-[11px]">
        <span className="text-muted">{formatDate(event.timestamp)}</span>
        <span
          className={`font-semibold uppercase tracking-wide ${
            isCritical ? "text-danger" : event.is_anomaly ? "text-accent" : "text-success"
          }`}
        >
          {isCritical ? "Critical" : event.is_anomaly ? "Anomaly" : event.status}
        </span>
      </div>
    </button>
  );
}
