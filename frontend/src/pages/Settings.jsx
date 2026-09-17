import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import Input from "../components/Input";
import LoadingSpinner from "../components/LoadingSpinner";
import { useLive } from "../context/LiveContext";

export default function Settings() {
  const { connection } = useLive();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.settings();
      setForm(res.data);
    })();
  }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateSettings({
        business_name: form.business_name,
        risk_threshold: Number(form.risk_threshold),
        critical_alert_threshold: Number(form.critical_alert_threshold),
        event_simulation_speed: Number(form.event_simulation_speed),
        anomaly_injection_rate: Number(form.anomaly_injection_rate),
        ai_provider: form.ai_provider,
        api_key_placeholder: form.api_key_placeholder,
        chat_model: form.chat_model,
        alert_notifications_enabled: Boolean(form.alert_notifications_enabled),
      });
      setForm(res.data);
      toast.success("Settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <LoadingSpinner />;

  return (
    <div>
      <Topbar title="Settings" subtitle="Risk thresholds, simulation, and AI provider" connection={connection} />
      <div className="p-4 md:p-6 max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 grid sm:grid-cols-2 gap-4">
          <Input label="Business name" value={form.business_name || ""} onChange={(e) => update("business_name", e.target.value)} />
          <Input label="Chat model" value={form.chat_model || ""} onChange={(e) => update("chat_model", e.target.value)} />
          <Input
            label="Risk threshold"
            type="number"
            value={form.risk_threshold}
            onChange={(e) => update("risk_threshold", e.target.value)}
          />
          <Input
            label="Critical alert threshold"
            type="number"
            value={form.critical_alert_threshold}
            onChange={(e) => update("critical_alert_threshold", e.target.value)}
          />
          <Input
            label="Simulation speed (ms)"
            type="number"
            value={form.event_simulation_speed}
            onChange={(e) => update("event_simulation_speed", e.target.value)}
          />
          <Input
            label="Anomaly injection rate (0–1)"
            type="number"
            step="0.01"
            value={form.anomaly_injection_rate}
            onChange={(e) => update("anomaly_injection_rate", e.target.value)}
          />
          <Input label="AI provider" value={form.ai_provider || "gemini"} onChange={(e) => update("ai_provider", e.target.value)} />
          <Input
            label="API key placeholder"
            type="password"
            value={form.api_key_placeholder || ""}
            onChange={(e) => update("api_key_placeholder", e.target.value)}
            placeholder="Stored as placeholder only — use GEMINI_API_KEY env for live calls"
          />
          <label className="flex items-center gap-2 text-sm text-text sm:col-span-2">
            <input
              type="checkbox"
              checked={!!form.alert_notifications_enabled}
              onChange={(e) => update("alert_notifications_enabled", e.target.checked)}
            />
            Alert notification placeholder enabled
          </label>
        </div>
        <Button variant="accent" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
