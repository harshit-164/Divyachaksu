import { riskColor } from "../utils/formatRisk";

export default function Badge({ children, tone = "default", className = "" }) {
  const tones = {
    default: "bg-card text-muted border-border",
    info: "bg-accent/10 text-accent border-accent/25",
    mint: "bg-success/15 text-success border-success/30",
    amber: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        tones[tone] || tones.default
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ level }) {
  const color = riskColor(level);
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold"
      style={{ color, borderColor: `${color}55`, background: `${color}18` }}
    >
      {level}
    </span>
  );
}
