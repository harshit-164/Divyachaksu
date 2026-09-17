import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Select from "../components/Select";
import Input from "../components/Input";
import Table from "../components/Table";
import { RiskBadge } from "../components/Badge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { ALERT_STATUSES, EVENT_TYPES, RISK_LEVELS } from "../utils/constants";
import { formatDate } from "../utils/formatDate";
import { useLive } from "../context/LiveContext";

export default function Alerts() {
  const navigate = useNavigate();
  const { connection, statsTick, liveAlerts } = useLive();
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    alert_type: "",
    created_after: "",
  });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await api.alerts({ ...params, page_size: 50 });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters, statsTick]);

  const columns = [
    {
      key: "alert_id",
      label: "Alert",
      render: (r) => <span className="font-mono text-xs">{r.alert_id}</span>,
    },
    {
      key: "title",
      label: "Title",
      render: (r) => (
        <div className="max-w-sm">
          <div className="font-medium truncate">{r.title}</div>
          {r.severity === "Critical" ? (
            <div className="text-[10px] uppercase tracking-wide text-danger font-semibold mt-0.5">
              Needs immediate review
            </div>
          ) : null}
        </div>
      ),
    },
    { key: "severity", label: "Severity", render: (r) => <RiskBadge level={r.severity} /> },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`text-xs font-medium ${
            r.status === "Open"
              ? "text-danger"
              : r.status === "Investigating"
                ? "text-warning"
                : r.status === "False Positive"
                  ? "text-muted"
                  : "text-success"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "risk_score", label: "Score" },
    { key: "alert_type", label: "Type" },
    { key: "created_at", label: "Created", render: (r) => formatDate(r.created_at) },
  ];

  return (
    <div>
      <Topbar
        title="Alert Queue"
        subtitle={`${data.total} alerts · investigate, resolve, or mark false positive`}
        connection={connection}
      />
      <div className="p-4 md:p-6 space-y-4">
        {liveAlerts.length > 0 ? (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text">
            <span className="font-semibold text-accent">{liveAlerts.length} live alert(s)</span> arrived
            this session — newest: {liveAlerts[0]?.title}
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 rounded-xl border border-border bg-card p-4">
          <Select
            label="Severity"
            value={filters.severity}
            onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
            options={[{ value: "", label: "All" }, ...RISK_LEVELS.map((x) => ({ value: x, label: x }))]}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            options={[{ value: "", label: "All" }, ...ALERT_STATUSES.map((x) => ({ value: x, label: x }))]}
          />
          <Select
            label="Event type"
            value={filters.alert_type}
            onChange={(e) => setFilters((f) => ({ ...f, alert_type: e.target.value }))}
            options={[{ value: "", label: "All" }, ...EVENT_TYPES.map((x) => ({ value: x, label: x }))]}
          />
          <Input
            label="Created after"
            type="datetime-local"
            value={filters.created_after}
            onChange={(e) => setFilters((f) => ({ ...f, created_after: e.target.value }))}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : data.items.length === 0 ? (
          <EmptyState
            title="No alerts match these filters"
            description="Start the simulator or clear filters to see the investigation queue."
          />
        ) : (
          <Table columns={columns} rows={data.items} onRowClick={(r) => navigate(`/app/alerts/${r.id}`)} />
        )}
      </div>
    </div>
  );
}
