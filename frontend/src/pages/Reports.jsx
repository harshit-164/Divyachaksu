import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";
import Topbar from "../components/Topbar";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../utils/formatDate";
import { useLive } from "../context/LiveContext";

export default function Reports() {
  const { connection } = useLive();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.reports();
      setReports(res.data || []);
      if (res.data?.[0]) {
        const detail = await api.report(res.data[0].id);
        setSelected(detail.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateReport({
        report_type: "daily_summary",
        title: `Ops Anomaly Report ${new Date().toLocaleString()}`,
      });
      toast.success("Report generated");
      await load();
      setSelected(res.data);
    } catch {
      toast.error("Report generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <Topbar
        title="Reports"
        subtitle="Executive summaries with CSV/JSON export"
        connection={connection}
        actions={
          <Button variant="accent" onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "Generate report"}
          </Button>
        }
      />
      <div className="p-4 md:p-6 grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 max-h-[75vh] overflow-y-auto">
          {reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Generate a daily anomaly summary to get started." />
          ) : (
            reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={async () => {
                  const res = await api.report(r.id);
                  setSelected(res.data);
                }}
                className={`w-full text-left rounded-lg border px-3 py-3 ${
                  selected?.id === r.id ? "border-accent bg-accent/5" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="text-sm font-medium text-text">{r.title}</div>
                <div className="text-xs text-muted mt-1">{formatDate(r.created_at)}</div>
              </button>
            ))
          )}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          {!selected ? (
            <EmptyState title="Select a report" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-text">{selected.title}</h2>
                  <p className="text-sm text-muted mt-1">{selected.summary}</p>
                </div>
                <div className="flex gap-2">
                  <a href={api.exportReportCsv(selected.id)} target="_blank" rel="noreferrer">
                    <Button variant="ghost">Export CSV</Button>
                  </a>
                  <a href={api.exportReportJson(selected.id)} target="_blank" rel="noreferrer">
                    <Button variant="ghost">Export JSON</Button>
                  </a>
                  <Button variant="ghost" disabled title="PDF export placeholder">
                    PDF (soon)
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-card border border-border p-4 text-sm leading-relaxed text-text">
                <div className="text-xs uppercase tracking-wide text-muted mb-2">AI executive summary</div>
                {selected.executive_summary}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(selected.data?.totals || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted capitalize">{k.replaceAll("_", " ")}</div>
                    <div className="text-lg font-semibold mt-1">{v}</div>
                  </div>
                ))}
              </div>
              <pre className="text-xs bg-secondary text-success rounded-lg p-4 overflow-auto max-h-80">
                {JSON.stringify(
                  {
                    top_risky_users: selected.data?.top_risky_users?.slice(0, 5),
                    critical_alerts_summary: selected.data?.critical_alerts_summary?.slice(0, 5),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
