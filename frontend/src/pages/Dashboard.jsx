import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import Button from "../components/Button";
import ChartCard from "../components/ChartCard";
import AlertCard from "../components/AlertCard";
import { LiveEventCard } from "../components/RiskScoreBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { useLive } from "../context/LiveContext";
import { RISK_COLORS } from "../utils/constants";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { connection, liveEvents, statsTick, simStatus, setSimStatus, simulatorRunning } = useLive();
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [riskTrend, setRiskTrend] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const results = await Promise.allSettled([
        api.dashboardStats(),
        api.recentEvents(12),
        api.recentAlerts(6),
        api.analyticsAnomalies(),
        api.analyticsAlerts(),
        api.analyticsEvents(),
      ]);

      const [s, e, a, an, al, ev] = results;
      let ok = 0;

      if (s.status === "fulfilled") {
        setStats(s.value.data);
        ok += 1;
      }
      if (e.status === "fulfilled") {
        setRecentEvents(e.value.data);
        ok += 1;
      }
      if (a.status === "fulfilled") {
        setRecentAlerts(a.value.data);
        ok += 1;
      }
      if (an.status === "fulfilled") {
        setRiskTrend(an.value.data.anomalies_over_time || []);
        ok += 1;
      }
      if (al.status === "fulfilled") {
        setSeverity(al.value.data.alerts_by_severity || []);
        ok += 1;
      }
      if (ev.status === "fulfilled") {
        setTypes(ev.value.data.event_type_distribution || []);
        ok += 1;
      }

      if (ok === 0) {
        toast.error("Failed to load dashboard — check API connection");
      }
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, statsTick === 0 ? 0 : 400);
    return () => clearTimeout(timer);
  }, [statsTick]);

  const toggleSim = async () => {
    try {
      const running = simulatorRunning || stats?.simulator_running;
      const res = running ? await api.stopSimulator() : await api.startSimulator();
      setSimStatus(res.data);
      toast.success(running ? "Simulator stopped" : "Simulator started");
      load();
    } catch {
      toast.error("Simulator control failed");
    }
  };

  if (loading && !stats) return <LoadingSpinner label="Loading risk console…" />;

  const stream = liveEvents.length ? liveEvents.slice(0, 8) : recentEvents;
  const simOn = simulatorRunning || stats?.simulator_running;

  return (
    <div>
      <Topbar
        title="Operations Dashboard"
        subtitle="Real-time risk posture across events, anomalies, and alerts"
        connection={connection}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/app/live")}>
              Live monitor
            </Button>
            <Button variant={simOn ? "danger" : "accent"} onClick={toggleSim}>
              {simOn ? "Stop simulator" : "Start simulator"}
            </Button>
          </div>
        }
      />
      <div className="p-4 md:p-7 space-y-5 md:space-y-6">
        <div className="dashboard-glow rounded-[22px] text-white p-5 md:p-6 relative overflow-hidden border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border border-white/10 opacity-70" />
          <div className="absolute -right-2 -top-5 h-28 w-28 rounded-full border border-accent/20" />
          <div className="relative mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">System pulse</p>
              <p className="mt-1 text-sm text-white/65">Your risk posture, updating as events arrive.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-success live-dot" />
              Streaming live
            </div>
          </div>
          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DarkStat label="Events processed" value={stats?.total_events ?? 0} />
            <DarkStat label="Anomalies detected" value={stats?.anomalies_detected ?? 0} accent="cyan" />
            <DarkStat label="Critical alerts" value={stats?.critical_alerts ?? 0} accent="crimson" />
            <DarkStat label="Avg risk score" value={stats?.average_risk_score ?? 0} accent="success" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Failed login spikes" value={stats?.failed_login_spikes ?? 0} accent="crimson" />
          <StatCard label="Suspicious transactions" value={stats?.suspicious_transactions ?? 0} accent="amber" />
          <StatCard label="API traffic anomalies" value={stats?.api_traffic_anomalies ?? 0} accent="sky" />
          <StatCard label="Open alerts" value={stats?.open_alerts ?? 0} accent="plum" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ChartCard title="Anomaly trend" subtitle="Events flagged over time" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrend}>
                <defs>
                  <linearGradient id="anom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D9A7D7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#D9A7D7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#302932" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#A79FA8" }} hide={riskTrend.length > 18} />
                <YAxis tick={{ fontSize: 11, fill: "#A79FA8" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#171219", border: "1px solid #4B404C", borderRadius: "12px", color: "#F6F1F5" }}
                />
                <Area type="monotone" dataKey="value" stroke="#D9A7D7" strokeWidth={2} fill="url(#anom)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Alerts by severity">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {severity.map((d) => (
                    <Cell key={d.name} fill={RISK_COLORS[d.name] || "#9CA3AF"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#171219", border: "1px solid #4B404C", borderRadius: "12px", color: "#F6F1F5" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ChartCard title="Event type distribution" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={types}>
                <CartesianGrid strokeDasharray="3 3" stroke="#302932" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#D9A7D7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold tracking-[-0.02em] text-text">Live / recent high-risk activity</h3>
              <Link to="/app/events" className="text-sm text-accent underline-offset-4 hover:underline">
                View all events
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {stream.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-white/15 bg-card/70 px-4 py-10 text-center text-sm text-muted">
                  No activity yet. Start the simulator to stream live risk events.
                </div>
              ) : (
                stream.map((e) => (
                  <LiveEventCard key={e.id || e.event_id} event={e} onClick={(ev) => navigate(`/app/events/${ev.id}`)} />
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold tracking-[-0.02em] text-text">Recent alerts</h3>
            <Link to="/app/alerts" className="text-sm text-accent underline-offset-4 hover:underline">
              Investigate
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentAlerts.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-white/15 bg-card/70 px-4 py-10 text-center text-sm text-muted">
                No alerts yet. High and critical events will open investigation tickets automatically.
              </div>
            ) : (
              recentAlerts.map((a) => <AlertCard key={a.id} alert={a} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkStat({ label, value, accent = "white" }) {
  const colors = {
    white: "text-text",
    cyan: "text-accent",
    amber: "text-warning",
    crimson: "text-danger",
    success: "text-success",
    mint: "text-success",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/55">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-[-0.045em] ${colors[accent] || colors.white}`}>{value}</div>
    </div>
  );
}
