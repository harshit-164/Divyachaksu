import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import { LiveEventCard } from "../components/RiskScoreBadge";
import EmptyState from "../components/EmptyState";
import { useLive } from "../context/LiveContext";

export default function LiveMonitor() {
  const navigate = useNavigate();
  const { connection, liveEvents, liveAlerts, simStatus, setSimStatus } = useLive();

  const toggle = async () => {
    try {
      const running = simStatus?.is_running;
      const res = running ? await api.stopSimulator() : await api.startSimulator();
      setSimStatus(res.data);
      toast.success(running ? "Simulator stopped" : "Simulator streaming");
    } catch {
      toast.error("Could not toggle simulator");
    }
  };

  return (
    <div>
      <Topbar
        title="Live Monitor"
        subtitle="WebSocket event stream with reconnect-aware connection status"
        connection={connection}
        actions={
          <Button variant={simStatus?.is_running ? "danger" : "accent"} onClick={toggle}>
            {simStatus?.is_running ? "Stop stream" : "Start stream"}
          </Button>
        }
      />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-secondary text-white overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="font-semibold">Event console</div>
              <div className="text-xs text-white/50">
                Generated {simStatus?.events_generated ?? 0} · Anomalies {simStatus?.anomalies_injected ?? 0}
              </div>
            </div>
            <div className="text-xs text-accent uppercase tracking-wide">{connection}</div>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto radar-grid">
            {liveEvents.length === 0 ? (
              <EmptyState
                title="Waiting for live events"
                description="Start the simulator to stream realistic normal and anomalous activity."
                action={
                  <Button variant="accent" onClick={toggle}>
                    Start simulator
                  </Button>
                }
              />
            ) : (
              liveEvents.map((e) => (
                <LiveEventCard
                  key={`${e.event_id}-${e.timestamp}`}
                  event={e}
                  onClick={(ev) => navigate(`/app/events/${ev.id}`)}
                />
              ))
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-text">Live alerts</h3>
            <p className="text-xs text-muted mt-1">High-risk toast notifications also appear globally.</p>
            <div className="mt-3 space-y-2 max-h-[65vh] overflow-y-auto">
              {liveAlerts.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No live alerts yet.</p>
              ) : (
                liveAlerts.map((a) => (
                  <button
                    key={a.alert_id || a.id}
                    type="button"
                    onClick={() => navigate(`/app/alerts/${a.id}`)}
                    className="w-full text-left rounded-lg border border-border px-3 py-2 hover:bg-secondary"
                  >
                    <div className="text-sm font-medium text-text">{a.title}</div>
                    <div className="text-xs text-muted mt-1">
                      {a.severity} · score {a.risk_score}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
