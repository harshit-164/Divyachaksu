export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8800";
export const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://127.0.0.1:8800";

export const EVENT_TYPES = [
  "Transaction",
  "Login Attempt",
  "Payment",
  "API Request",
  "Account Update",
  "Password Reset",
  "System Event",
];

export const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

export const ALERT_STATUSES = ["Open", "Investigating", "Resolved", "False Positive"];

export const RISK_COLORS = {
  Low: "#22C55E",
  Medium: "#FBBF24",
  High: "#F59E0B",
  Critical: "#DC2626",
};

export const NAV_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/live", label: "Live Monitor" },
  { to: "/app/events", label: "Events" },
  { to: "/app/alerts", label: "Alerts" },
  { to: "/app/users", label: "User Risk" },
  { to: "/app/analytics", label: "Analytics" },
  { to: "/app/reports", label: "Reports" },
  { to: "/app/model", label: "Model" },
  { to: "/app/settings", label: "Settings" },
];
