import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import RiskScoreBadge from "../components/RiskScoreBadge";
import ExplanationPanel from "../components/ExplanationPanel";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import EventTimeline from "../components/EventTimeline";
import { formatDate } from "../utils/formatDate";
import { formatAmount } from "../utils/formatRisk";
import { useLive } from "../context/LiveContext";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connection, statsTick } = useLive();
  const [event, setEvent] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [relatedAlerts, setRelatedAlerts] = useState([]);
  const [relatedUser, setRelatedUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [explainLoading, setExplainLoading] = useState(true);
  const [error, setError] = useState("");
  const [explainError, setExplainError] = useState("");

  const loadExplanation = async (eventId) => {
    setExplainLoading(true);
    setExplainError("");
    try {
      const expl = await api.eventExplanation(eventId);
      setExplanation(expl.data);
    } catch {
      setExplainError("Failed to generate investigation brief.");
    } finally {
      setExplainLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.event(id);
      setEvent(res.data);
      const [alerts, userEvents] = await Promise.all([
        api.eventRelatedAlerts(id),
        api.eventsByUser(res.data.user_id),
      ]);
      setRelatedAlerts(alerts.data || []);
      setRelatedUser(userEvents.data || []);
      loadExplanation(id);
    } catch {
      setError("Event not found or failed to load.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!event) return;
    api.eventRelatedAlerts(id).then((res) => setRelatedAlerts(res.data || [])).catch(() => null);
  }, [statsTick, id, event]);

  if (loading) return <LoadingSpinner label="Loading event details…" />;

  if (error || !event) {
    return (
      <div className="p-6">
        <EmptyState
          title="Event unavailable"
          description={error || "We could not find this event."}
          action={
            <Button variant="ghost" onClick={() => navigate("/app/events")}>
              Back to events
            </Button>
          }
        />
      </div>
    );
  }

  const critical = event.risk_level === "Critical";

  return (
    <div>
      <Topbar
        title={event.event_id}
        subtitle={`${event.event_type} · ${event.user_id}`}
        connection={connection}
        actions={
          <Button variant="ghost" onClick={() => navigate("/app/events")}>
            ← Events
          </Button>
        }
      />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div
            className={`rounded-xl border bg-card p-5 shadow-sm ${
              critical ? "border-danger/40 ring-1 ring-danger/20" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">Risk assessment</div>
                <div className="mt-2">
                  <RiskScoreBadge score={event.risk_score} level={event.risk_level} />
                </div>
              </div>
              {event.is_anomaly ? (
                <span className="rounded-md bg-danger/10 border border-danger/20 px-2 py-1 text-xs font-semibold text-danger">
                  ANOMALY DETECTED
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
              <Field label="Status" value={event.status} />
              <Field label="Timestamp" value={formatDate(event.timestamp)} />
              <Field label="IP address" value={event.ip_address} />
              <Field label="Location" value={event.location} />
              <Field label="Device" value={event.device} />
              <Field label="Amount" value={formatAmount(event.amount)} />
              <Field label="Anomaly score" value={Number(event.anomaly_score).toFixed(3)} />
              <Field label="Recommended action" value={event.recommended_action} />
            </div>

            <p className="mt-4 text-sm text-text leading-relaxed border-t border-border pt-4">
              {event.explanation_summary}
            </p>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-muted mb-2">Risk factors</div>
              <div className="flex flex-wrap gap-2">
                {(event.risk_factors || []).length === 0 ? (
                  <span className="text-sm text-muted">No rule factors — ML signal only.</span>
                ) : (
                  (event.risk_factors || []).map((f, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-card border border-border px-2.5 py-1 text-xs text-text"
                      title={f.detail || ""}
                    >
                      {f.name || f}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-text mb-2">Related user activity</h3>
            {relatedUser.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">No related timeline events.</p>
            ) : (
              <EventTimeline events={relatedUser.slice(0, 12)} onSelect={(e) => navigate(`/app/events/${e.id}`)} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ExplanationPanel
            explanation={explanation}
            loading={explainLoading}
            error={explainError}
            onRetry={() => loadExplanation(id)}
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-text">Related alerts</h3>
            <div className="mt-3 space-y-2">
              {relatedAlerts.length === 0 ? (
                <p className="text-sm text-muted">No alert linked to this event.</p>
              ) : (
                relatedAlerts.map((a) => (
                  <Link
                    key={a.id}
                    to={`/app/alerts/${a.id}`}
                    className="block rounded-lg border border-border px-3 py-2 hover:bg-card text-sm"
                  >
                    <div className="font-medium text-text">{a.title}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {a.severity} · {a.status}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg bg-secondary/70 border border-border/80 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-text text-sm break-words">{value ?? "—"}</div>
    </div>
  );
}
