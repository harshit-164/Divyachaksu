import { Link } from "react-router-dom";
import Button from "../components/Button";

const FEATURES = [
  {
    title: "Live anomaly streaming",
    body: "WebSocket feeds surface suspicious transactions, logins, payments, and API spikes as they happen.",
  },
  {
    title: "ML + rules risk scoring",
    body: "Isolation Forest signals blend with defensive business rules into clear 1–100 risk scores.",
  },
  {
    title: "Analyst-ready alerts",
    body: "Investigate, annotate, resolve, or mark false positives without leaving the operations console.",
  },
  {
    title: "AI investigation briefs",
    body: "Plain-English explanations help non-technical stakeholders understand what to do next.",
  },
];

const USE_CASES = [
  "Fintech fraud teams",
  "SaaS trust & safety",
  "Ecommerce payments",
  "Cybersecurity SOC",
  "Payment operations",
  "Platform reliability",
];

const STEPS = [
  { n: "01", t: "Ingest events", d: "Transactions, logins, payments, API calls, and account changes stream in." },
  { n: "02", t: "Score risk", d: "Feature engineering, Isolation Forest, and rule triggers produce risk levels." },
  { n: "03", t: "Alert & explain", d: "High-risk events open alerts with recommended actions and AI briefs." },
  { n: "04", t: "Investigate", d: "Timelines, user risk profiles, and reports support faster response." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-primary text-text">
      <header className="relative overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 radar-grid opacity-40" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-danger via-accent to-success" />
        <div className="absolute right-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-danger/30 blur-3xl" />
        <div className="absolute left-[-5%] bottom-[-30%] h-[380px] w-[380px] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 scan-line bg-gradient-to-b from-accent/30 to-transparent" />
          <div className="mx-auto max-w-6xl px-6 pt-6 pb-20">
            <nav className="flex items-center justify-between gap-4">
              <div className="font-display text-3xl text-accent">Risk Radar</div>
              <div className="flex items-center gap-3">
                <Link to="/app/dashboard" className="text-sm text-white/70 hover:text-white">
                  Open console
                </Link>
                <Link to="/app/live">
                  <Button variant="accent">Start monitoring</Button>
                </Link>
              </div>
            </nav>

            <div className="mt-16 max-w-3xl fade-up">
              <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-white">
                Real-time fraud and anomaly detection for risk operations.
              </h1>
              <p className="mt-5 text-lg text-white/70 max-w-2xl">
                Detect suspicious transactions, failed login spikes, unusual payments, API traffic bursts,
                and abnormal user behavior — with live WebSocket updates, ML scoring, and AI explanations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/app/dashboard">
                  <Button variant="accent">Launch dashboard</Button>
                </Link>
                <Link to="/app/live">
                  <Button variant="ghost" className="!bg-transparent !text-white !border-white/20">
                    View live monitor
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl text-accent">Built for continuous risk visibility</h2>
        <p className="mt-3 text-muted max-w-2xl">
          Manual monitoring is slow. Risk Radar automatically scores events, opens alerts, and explains
          anomalies so teams can respond before losses compound.
        </p>
        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-semibold text-text">{f.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-display text-4xl text-accent">Use cases</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {USE_CASES.map((u) => (
              <div
                key={u}
                className="rounded-lg border border-border bg-card px-4 py-4 text-sm font-medium text-text"
              >
                {u}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl text-accent">Risk monitoring workflow</h2>
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card p-4">
              <div className="text-accent font-semibold">{s.n}</div>
              <div className="mt-2 font-semibold text-text">{s.t}</div>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-4xl text-accent">Pricing for portfolio demos</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { name: "Monitor", price: "$0", items: ["Live event stream", "Rule + ML scoring", "Alert inbox"] },
              {
                name: "Investigate",
                price: "$99",
                items: ["AI explanations", "User risk profiles", "CSV/JSON reports"],
              },
              {
                name: "Command",
                price: "$299",
                items: ["Model monitoring", "Simulation controls", "Ops analytics suite"],
              },
            ].map((plan) => (
              <div key={plan.name} className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm text-muted">{plan.name}</div>
                <div className="mt-2 font-display text-4xl text-text">{plan.price}</div>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {plan.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
                <Link to="/app/dashboard" className="mt-6 inline-block">
                  <Button variant="accent">Get started</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <div className="font-display text-xl text-accent">Risk Radar</div>
          <div>Defensive fraud & anomaly detection case study</div>
        </div>
      </footer>
    </div>
  );
}
