import { useEffect, useState } from "react";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Table from "../components/Table";
import LoadingSpinner from "../components/LoadingSpinner";
import EventTimeline from "../components/EventTimeline";
import StatCard from "../components/StatCard";
import { formatDate } from "../utils/formatDate";
import { useLive } from "../context/LiveContext";
import { useNavigate } from "react-router-dom";

export default function UserRiskProfiles() {
  const { connection } = useLive();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.riskProfiles();
        setProfiles(res.data || []);
        if (res.data?.[0]) setSelected(res.data[0].user_id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const res = await api.riskProfile(selected);
      setDetail(res.data);
    })();
  }, [selected]);

  if (loading) return <LoadingSpinner />;

  const columns = [
    { key: "user_id", label: "User" },
    { key: "total_events", label: "Events" },
    { key: "failed_logins", label: "Failed logins" },
    { key: "transactions", label: "Transactions" },
    { key: "average_risk_score", label: "Avg risk" },
    { key: "highest_risk_score", label: "Highest" },
    { key: "last_active", label: "Last active", render: (r) => formatDate(r.last_active) },
  ];

  const profile = detail?.profile;

  return (
    <div>
      <Topbar title="User Risk Profiles" subtitle="Behavioral baselines and anomaly history" connection={connection} />
      <div className="p-4 md:p-6 space-y-4">
        <Table columns={columns} rows={profiles} onRowClick={(r) => setSelected(r.user_id)} />
        {profile ? (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-3">
              <StatCard label="User" value={profile.user_id} accent="plum" />
              <StatCard label="Average risk" value={profile.average_risk_score} accent="amber" />
              <StatCard label="Highest risk" value={profile.highest_risk_score} accent="crimson" />
              <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
                <div>
                  <div className="text-xs text-muted">Common locations</div>
                  <div>{(profile.common_locations || []).join(" · ") || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Common devices</div>
                  <div>{(profile.common_devices || []).join(" · ") || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Recent anomalies</div>
                  <ul className="mt-1 space-y-1">
                    {(profile.recent_anomalies || []).slice(0, 5).map((a) => (
                      <li key={a.event_id} className="text-xs text-text">
                        {a.event_type} · score {a.risk_score}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-text mb-2">Activity timeline</h3>
              <EventTimeline
                events={detail?.timeline || []}
                onSelect={(e) => navigate(`/app/events/${e.id}`)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
