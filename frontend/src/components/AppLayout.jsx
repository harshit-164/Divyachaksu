import { useState } from "react";
import { Outlet, Link, NavLink } from "react-router-dom";
import { Menu, X, Radio } from "lucide-react";
import Sidebar from "./Sidebar";
import { useLive } from "../context/LiveContext";
import { NAV_ITEMS } from "../utils/constants";

export default function AppLayout() {
  const { connection } = useLive();
  const [open, setOpen] = useState(false);

  const statusColor =
    connection === "Connected"
      ? "bg-success"
      : connection === "Reconnecting"
        ? "bg-warning"
        : "bg-muted";

  return (
    <div className="min-h-screen flex bg-primary text-text">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3 bg-secondary text-text border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" />
            <span className="font-display text-lg text-accent">Risk Radar</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span className={`h-2 w-2 rounded-full live-dot ${statusColor}`} />
              {connection}
            </span>
            <button
              type="button"
              aria-label="Toggle menu"
              className="rounded-md border border-border px-2 py-1.5 text-text"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-primary/70"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute left-0 top-0 bottom-0 w-72 bg-primary text-text p-4 space-y-1 shadow-xl border-r border-border">
              <div className="font-display text-xl text-accent mb-4 px-2">Risk Radar</div>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2.5 text-sm ${
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
          </div>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}
