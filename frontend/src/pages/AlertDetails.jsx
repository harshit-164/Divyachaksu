import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import Input from "../components/Input";
import { RiskBadge } from "../components/Badge";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate } from "../utils/formatDate";
import { useLive } from "../context/LiveContext";

export default function AlertDetails() {
  const { id } = useParams();
  const { connection } = useLive();
  const [alert, setAlert] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.alert(id);
      setAlert(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setStatus = async (status) => {
    try {
      const res = await api.updateAlert(id, { status, assigned_to: alert.assigned_to || "Analyst Desk" });
      setAlert(res.data);
      toast.success(`Marked ${status}`);
    } catch {
      toast.error("Update failed");
    }
  };

  const resolve = async () => {
    const res = await api.resolveAlert(id);
    setAlert(res.data);
    toast.success("Resolved");
  };

  const falsePositive = async () => {
    const res = await api.falsePositiveAlert(id);
    setAlert(res.data);
    toast.success("Marked false positive");
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.addAlertNote(id, { note, author_name: "Portfolio Analyst" });
    setNote("");
    toast.success("Note added");
    load();
  };

  if (loading || !alert) return <LoadingSpinner />;

  return (
    <div>
      <Topbar title={alert.alert_id} subtitle={alert.title} connection={connection} />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <RiskBadge level={alert.severity} />
            <span className="text-sm text-muted">{alert.status}</span>
            <span className="text-sm text-muted">Score {alert.risk_score}</span>
          </div>
          <p className="text-sm text-text leading-relaxed">{alert.description}</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted">Assigned to</div>
              <div>{alert.assigned_to || "Unassigned"}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Created</div>
              <div>{formatDate(alert.created_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Resolved</div>
              <div>{formatDate(alert.resolved_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Recommended action</div>
              <div>{alert.recommended_action}</div>
            </div>
          </div>
          {alert.event_id ? (
            <Link to={`/app/events/${alert.event_id}`} className="text-sm text-accent hover:underline">
              Open linked event →
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStatus("Investigating")}>
              Mark investigating
            </Button>
            <Button variant="success" onClick={resolve}>
              Resolve
            </Button>
            <Button variant="danger" onClick={falsePositive}>
              False positive
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-text">Analyst notes</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(alert.notes || []).length === 0 ? (
              <p className="text-sm text-muted">No notes yet.</p>
            ) : (
              alert.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-card border border-border p-3 text-sm">
                  <div className="text-xs text-muted">
                    {n.author_name} · {formatDate(n.created_at)}
                  </div>
                  <div className="mt-1 text-text">{n.note}</div>
                </div>
              ))
            )}
          </div>
          <Input label="Add note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Investigation update…" />
          <Button onClick={addNote}>Save note</Button>
        </div>
      </div>
    </div>
  );
}
