import { RiskBadge } from "./Badge";
import { formatDate } from "../utils/formatDate";
import { Link } from "react-router-dom";

export default function AlertCard({ alert }) {
  const critical = alert.severity === "Critical";
  return (
    <Link
      to={`/app/alerts/${alert.id}`}
      className={`block rounded-2xl border bg-card/90 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:border-accent/40 transition duration-200 ${
        critical ? "border-danger/45" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold tracking-[-0.015em] text-text">{alert.title}</div>
          <p className="text-sm text-muted mt-1 line-clamp-2">{alert.description}</p>
        </div>
        <RiskBadge level={alert.severity} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span>{alert.status}</span>
        <span>Score {alert.risk_score}</span>
        <span>{formatDate(alert.created_at)}</span>
      </div>
    </Link>
  );
}
