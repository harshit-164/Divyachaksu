import { useEffect, useState } from "react";
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
import ChartCard from "../components/ChartCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { RISK_COLORS } from "../utils/constants";
import { useLive } from "../context/LiveContext";

export default function Analytics() {
  const { connection, statsTick } = useLive();
  const [data, setData] = useState({
    events: { events_over_time: [], event_type_distribution: [] },
    anomalies: { anomalies_over_time: [], failed_login_trend: [], transaction_amount_anomalies: [] },
    risk: { risk_distribution: [], top_risky_users: [], top_risky_ips: [] },
    alerts: { alerts_by_severity: [] },
  });
  const [failedSources, setFailedSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const sources = [
        ["events", api.analyticsEvents],
        ["anomalies", api.analyticsAnomalies],
        ["risk", api.analyticsRisk],
        ["alerts", api.analyticsAlerts],
      ];
      const results = await Promise.allSettled(sources.map(([, request]) => request()));
      if (!active) return;

      const empty = {
        events: { events_over_time: [], event_type_distribution: [] },
        anomalies: { anomalies_over_time: [], failed_login_trend: [], transaction_amount_anomalies: [] },
        risk: { risk_distribution: [], top_risky_users: [], top_risky_ips: [] },
        alerts: { alerts_by_severity: [] },
      };
      const nextData = { ...empty };
      const failed = [];
      results.forEach((result, index) => {
        const [name] = sources[index];
        if (result.status === "fulfilled" && result.value?.data) {
          nextData[name] = { ...empty[name], ...result.value.data };
        } else {
          failed.push(name);
        }
      });

      setData(nextData);
      setFailedSources(failed);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [statsTick, retryCount]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <Topbar title="Analytics" subtitle="Trends across events, risk, and alerts" connection={connection} />
      <div className="p-4 md:p-6 grid lg:grid-cols-2 gap-4">
        {failedSources.length > 0 ? (
          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text" role="status">
            <span>
              Some analytics data is temporarily unavailable. The other charts are still shown.
            </span>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="font-medium text-accent underline underline-offset-4"
            >
              Retry loading
            </button>
          </div>
        ) : null}
        <ChartCard title="Events over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.events.events_over_time || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="#06B6D433" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Anomalies over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.anomalies.anomalies_over_time || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#DC2626" fill="#DC262633" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Risk level distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.risk.risk_distribution || []} dataKey="value" nameKey="name" outerRadius={80}>
                {(data.risk.risk_distribution || []).map((d) => (
                  <Cell key={d.name} fill={RISK_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Alerts by severity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.alerts.alerts_by_severity || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Event type distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.events.event_type_distribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Failed login trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.anomalies.failed_login_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#F59E0B" fill="#F59E0B33" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top risky users">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data.risk.top_risky_users || []).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="user_id" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average_risk" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top risky IPs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data.risk.top_risky_ips || []).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="ip_address" tick={{ fontSize: 9 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average_risk" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Transaction amount anomalies" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.anomalies.transaction_amount_anomalies || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="label" hide />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#DC2626" fill="#DC262633" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 text-sm text-muted">
          Model evaluation tip: use the Model Monitoring page to retrain Isolation Forest, tune the anomaly
          threshold, and track analyst false-positive outcomes from the alert workflow.
        </div>
      </div>
    </div>
  );
}
