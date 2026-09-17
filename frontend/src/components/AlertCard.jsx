import { RiskBadge } from "./Badge";
import { formatDate } from "../utils/formatDate";
import { Link } from "react-router-dom";

export default function AlertCard({ alert }) {
  const critical = alert.severity === "Critical";
  return (
    <Link
      to={`/app/alerts/${alert.id}`}
      className={`block rounded-xl border bg-card p-4 shadow-sm hover:border-accent/40 transition ${
        critical ? "border-danger/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-text">{alert.title}</div>
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
