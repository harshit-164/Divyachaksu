import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../utils/constants";
import { Radio } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-primary text-text min-h-screen border-r border-border">
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
            <Radio className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="font-display text-xl leading-none text-accent">Risk Radar</div>
            <div className="text-[11px] text-muted mt-1 uppercase tracking-wider">Ops Console</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-secondary text-accent border border-accent/30"
                  : "text-muted hover:bg-card hover:text-text"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 text-[11px] text-muted border-t border-border">
        Defensive monitoring only
      </div>
    </aside>
  );
}
