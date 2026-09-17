import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../utils/constants";
import {
  Activity,
  BarChart3,
  BellRing,
  FileText,
  Gauge,
  MonitorDot,
  Orbit,
  Settings2,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

const NAV_ICONS = [Gauge, MonitorDot, Activity, ShieldAlert, UsersRound, BarChart3, FileText, BellRing, Settings2];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[264px] shrink-0 flex-col self-start sticky top-5 h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[24px] border border-white/10 bg-[#100d12]/90 text-text shadow-2xl backdrop-blur-xl">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Orbit className="h-5 w-5 text-accent" strokeWidth={1.7} />
          </div>
          <div>
            <div className="font-display text-[19px] leading-none">Divyachaksu</div>
            <div className="text-[10px] text-muted mt-1.5 uppercase tracking-[0.18em]">Risk intelligence</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV_ITEMS.map((item, index) => {
          const Icon = NAV_ICONS[index] || Activity;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition duration-200 ${
                isActive
                  ? "bg-accent/15 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "text-muted hover:bg-white/[0.045] hover:text-text"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
            {item.label}
          </NavLink>
          );
        })}
      </nav>
      <div className="m-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-3.5">
        <div className="flex items-center gap-2 text-xs text-text">
          <span className="h-2 w-2 rounded-full bg-success live-dot" />
          System monitoring active
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">Defensive anomaly detection</p>
      </div>
    </aside>
  );
}
