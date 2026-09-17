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
      } else if (ok < results.length) {
        toast.error("Some dashboard panels failed to load", { id: "dash-partial" });
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
      <div className="p-4 md:p-6 space-y-6">
        <div className="rounded-2xl bg-secondary text-white p-5 radar-grid relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-16 scan-line bg-gradient-to-b from-accent/25 to-transparent pointer-events-none" />
          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} hide={riskTrend.length > 18} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1F2937", color: "#E5E7EB" }}
                />
                <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="url(#anom)" />
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
                  contentStyle={{ background: "#111827", border: "1px solid #1F2937", color: "#E5E7EB" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <ChartCard title="Event type distribution" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={types}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text">Live / recent high-risk activity</h3>
              <Link to="/app/events" className="text-sm text-accent hover:underline">
                View all events
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {stream.length === 0 ? (
                <div className="md:col-span-2 rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
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
            <h3 className="font-semibold text-text">Recent alerts</h3>
            <Link to="/app/alerts" className="text-sm text-accent hover:underline">
              Investigate
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentAlerts.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
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
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${colors[accent] || colors.white}`}>{value}</div>
    </div>
  );
}
