import { RISK_COLORS } from "./constants";

export function riskLevelFromScore(score) {
  const s = Number(score) || 0;
  if (s >= 90) return "Critical";
  if (s >= 70) return "High";
  if (s >= 40) return "Medium";
  return "Low";
}

export function riskColor(level) {
  return RISK_COLORS[level] || "#9CA3AF";
}

export function formatAmount(amount) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
