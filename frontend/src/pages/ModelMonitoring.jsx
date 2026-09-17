import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import Table from "../components/Table";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../utils/formatDate";
import { useLive } from "../context/LiveContext";

export default function ModelMonitoring() {
  const { connection, statsTick } = useLive();
  const [status, setStatus] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [threshold, setThreshold] = useState("0.55");
  const [savingThreshold, setSavingThreshold] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.modelStatus(), api.modelPredictions()]);
      setStatus(s.data);
      setThreshold(String(s.data.model_threshold ?? 0.55));
      setPredictions(p.data || []);
    } catch {
      toast.error("Failed to load model status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!status) return;
    api.modelPredictions()
      .then((res) => setPredictions(res.data || []))
      .catch(() => null);
  }, [statsTick]);

  const retrain = async () => {
    setTraining(true);
    try {
      const res = await api.trainModel();
      setStatus(res.data);
      toast.success("Isolation Forest retrained on synthetic data");
      load();
    } catch {
      toast.error("Training failed");
    } finally {
      setTraining(false);
    }
  };

  const saveThreshold = async () => {
    setSavingThreshold(true);
    try {
      const res = await api.updateModelThreshold(Number(threshold));
      setStatus(res.data);
      toast.success("Model threshold updated");
    } catch {
      toast.error("Could not update threshold");
    } finally {
      setSavingThreshold(false);
    }
  };

  if (loading || !status) return <LoadingSpinner label="Loading model monitor…" />;

  const columns = [
    { key: "id", label: "ID" },
    { key: "model_type", label: "Model" },
    {
      key: "anomaly_score",
      label: "Anomaly",
      render: (r) => Number(r.anomaly_score).toFixed(3),
    },
    { key: "risk_score", label: "Risk" },
    {
      key: "is_anomaly",
      label: "Flag",
      render: (r) => (
        <span className={r.is_anomaly ? "text-danger font-semibold" : "text-success"}>
          {r.is_anomaly ? "Anomaly" : "Normal"}
        </span>
      ),
    },
    { key: "created_at", label: "Time", render: (r) => formatDate(r.created_at) },
  ];

  return (
    <div>
      <Topbar
        title="Model Monitoring"
        subtitle="Isolation Forest health, thresholds, and recent predictions"
        connection={connection}
        actions={
          <Button variant="accent" onClick={retrain} disabled={training}>
            {training ? "Training…" : "Retrain model"}
          </Button>
        }
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Model type" value={status.model_type} accent="plum" />
          <StatCard label="Training size" value={status.training_data_size} accent="sky" />
          <StatCard label="Avg anomaly score" value={status.average_anomaly_score} accent="amber" />
          <StatCard label="Decision threshold" value={status.model_threshold} accent="mint" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Last trained" value={formatDate(status.last_trained)} />
          <StatCard
            label="False positives (analyst)"
            value={status.false_positive_count}
            accent="crimson"
            hint="From alerts marked False Positive"
          />
          <StatCard
            label="Resolved investigations"
            value={status.true_positive_placeholder}
            hint="Alerts marked Resolved"
          />
          <StatCard label="Model ready" value={status.is_trained ? "Yes" : "No"} accent="mint" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <Input
            label="Anomaly score threshold (0.3–0.9)"
            type="number"
            step="0.01"
            min="0.3"
            max="0.9"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="min-w-[220px]"
          />
          <Button variant="ghost" onClick={saveThreshold} disabled={savingThreshold}>
            {savingThreshold ? "Saving…" : "Update threshold"}
          </Button>
          <p className="text-xs text-muted max-w-md">
            Higher thresholds reduce anomaly flags; lower thresholds increase sensitivity.
          </p>
        </div>

        <ChartCard title="Feature importance" subtitle="Relative contribution heuristics for portfolio visibility">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={status.feature_importance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div>
          <h3 className="font-semibold text-text mb-3">Recent predictions</h3>
          {predictions.length === 0 ? (
            <EmptyState
              title="No predictions yet"
              description="Start the live simulator to generate scored events and model predictions."
            />
          ) : (
            <Table columns={columns} rows={predictions} />
          )}
        </div>
      </div>
    </div>
  );
}
