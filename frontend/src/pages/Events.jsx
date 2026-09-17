import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Input from "../components/Input";
import Select from "../components/Select";
import Table from "../components/Table";
import { RiskBadge } from "../components/Badge";
import LoadingSpinner from "../components/LoadingSpinner";
import { EVENT_TYPES, RISK_LEVELS } from "../utils/constants";
import { formatDate } from "../utils/formatDate";
import { formatAmount } from "../utils/formatRisk";
import { useLive } from "../context/LiveContext";

export default function Events() {
  const navigate = useNavigate();
  const { connection } = useLive();
  const [filters, setFilters] = useState({
    search: "",
    event_type: "",
    risk_level: "",
    user_id: "",
    ip: "",
    location: "",
  });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v != null)
      );
      const res = await api.events({ ...params, page_size: 50 });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [filters]);

  const columns = [
    { key: "event_id", label: "Event", render: (r) => <span className="font-mono text-xs">{r.event_id}</span> },
    { key: "event_type", label: "Type" },
    { key: "user_id", label: "User" },
    { key: "ip_address", label: "IP" },
    { key: "location", label: "Location" },
    { key: "amount", label: "Amount", render: (r) => formatAmount(r.amount) },
    {
      key: "risk",
      label: "Risk",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{r.risk_score}</span>
          <RiskBadge level={r.risk_level} />
        </div>
      ),
    },
    { key: "timestamp", label: "Time", render: (r) => formatDate(r.timestamp) },
  ];

  return (
    <div>
      <Topbar
        title="Event Timeline"
        subtitle={`${data.total} events · filter, search, and inspect`}
        connection={connection}
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 rounded-xl border border-border bg-card p-4">
          <Input
            label="Search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Event, user, IP…"
          />
          <Select
            label="Event type"
            value={filters.event_type}
            onChange={(e) => setFilters((f) => ({ ...f, event_type: e.target.value }))}
            options={[{ value: "", label: "All types" }, ...EVENT_TYPES.map((t) => ({ value: t, label: t }))]}
          />
          <Select
            label="Risk level"
            value={filters.risk_level}
            onChange={(e) => setFilters((f) => ({ ...f, risk_level: e.target.value }))}
            options={[{ value: "", label: "All levels" }, ...RISK_LEVELS.map((t) => ({ value: t, label: t }))]}
          />
          <Input
            label="User ID"
            value={filters.user_id}
            onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
          />
          <Input
            label="IP"
            value={filters.ip}
            onChange={(e) => setFilters((f) => ({ ...f, ip: e.target.value }))}
          />
          <Input
            label="Location"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          />
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Table columns={columns} rows={data.items} onRowClick={(r) => navigate(`/app/events/${r.id}`)} />
        )}
      </div>
    </div>
  );
}
