import { formatDate } from "../utils/formatDate";
import RiskScoreBadge from "./RiskScoreBadge";

export default function EventTimeline({ events = [], onSelect }) {
  return (
    <div className="relative space-y-0">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
      {events.map((e) => (
        <button
          key={e.id || e.event_id}
          type="button"
          onClick={() => onSelect?.(e)}
          className="relative w-full text-left pl-8 pr-2 py-3 hover:bg-secondary/50 rounded-md"
        >
          <span
            className={`absolute left-1.5 top-5 h-3 w-3 rounded-full border-2 border-primary ${
              e.is_anomaly ? "bg-danger" : "bg-success"
            }`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-text">
                {e.event_type} — {e.user_id}
              </div>
              <div className="text-xs text-muted">
                {formatDate(e.timestamp)} · {e.location}
              </div>
            </div>
            <RiskScoreBadge score={e.risk_score} level={e.risk_level} />
          </div>
        </button>
      ))}
    </div>
  );
}
