import { Link } from "react-router-dom";
import { Activity, ArrowRight, BellRing, BrainCircuit, Orbit, ShieldCheck, Sparkles } from "lucide-react";
import Button from "../components/Button";

const FEATURES = [
  {
    icon: Activity,
    title: "Live anomaly streaming",
    body: "WebSocket feeds surface suspicious transactions, logins, payments, and API spikes as they happen.",
  },
  {
    icon: BrainCircuit,
    title: "ML + rules risk scoring",
    body: "Isolation Forest signals blend with defensive business rules into clear 1–100 risk scores.",
  },
  {
    icon: BellRing,
    title: "Analyst-ready alerts",
    body: "Investigate, annotate, resolve, or mark false positives without leaving the operations console.",
  },
  {
    icon: Sparkles,
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
  { t: "Ingest events", d: "Transactions, logins, payments, API calls, and account changes stream in." },
  { t: "Score risk", d: "Feature engineering, Isolation Forest, and rule triggers produce risk levels." },
  { t: "Alert & explain", d: "High-risk events open alerts with recommended actions and AI briefs." },
  { t: "Investigate", d: "Timelines, user risk profiles, and reports support faster response." },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-primary text-text">
      <header className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_82%_8%,rgba(176,112,173,0.22),transparent_44%),radial-gradient(ellipse_at_15%_52%,rgba(98,209,168,0.09),transparent_35%)]" />
        <div className="relative mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <nav className="flex items-center justify-between gap-4 py-6 md:py-8">
            <Link to="/" className="group flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent transition group-hover:scale-105">
                <Orbit className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <div>
                <div className="font-display text-xl leading-none">Divyachaksu</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted">Risk intelligence</div>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/app/dashboard" className="hidden text-sm text-muted transition hover:text-text sm:block">
                Open console
              </Link>
              <Link to="/app/live">
                <Button variant="accent" className="!px-3 !py-2 sm:!px-4 sm:!py-2.5">Start monitoring</Button>
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-12 py-12 pb-20 lg:grid-cols-[minmax(0,0.93fr)_minmax(500px,1.07fr)] lg:py-20 lg:pb-28">
            <div className="max-w-2xl fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full bg-success live-dot" />
                Continuous risk visibility
              </div>
              <h1 className="mt-6 text-[clamp(3.15rem,7vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white">
                See danger
                <span className="block text-accent">before it spreads.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted md:text-lg md:leading-8">
                Divyachaksu brings suspicious transactions, failed login spikes, API bursts, and abnormal behavior into one live command view—scored, explained, and ready to investigate.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/app/dashboard">
                  <Button variant="accent" className="!px-5">
                    Launch dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/app/live">
                  <Button variant="ghost" className="!px-5">View live monitor</Button>
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-3 text-sm text-muted">
                <ShieldCheck className="h-5 w-5 text-success" strokeWidth={1.7} />
                Defensive monitoring for teams that move fast.
              </div>
            </div>

            <CommandPreview />
          </div>
        </div>
      </header>

      <main>
        <section className="border-y border-white/[0.08] bg-white/[0.018]">
          <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-7 sm:grid-cols-3 sm:px-8 lg:px-12">
            <Proof label="Signal coverage" value="Always on" />
            <Proof label="Risk decisions" value="ML + rules" />
            <Proof label="Investigation mode" value="Human-ready" />
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <h2 className="max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-5xl">
                The full story behind every signal.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-muted">
                A focused workspace for detection, triage, investigation, and reporting—without turning a critical moment into another tab hunt.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-[20px] border border-white/10 bg-white/10 sm:grid-cols-2">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="bg-[#100e12] p-6 transition hover:bg-[#171219] md:p-7">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-8 text-lg font-semibold tracking-[-0.025em] text-text">{feature.title}</h3>
                    <p className="mt-2.5 text-sm leading-6 text-muted">{feature.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <div className="dashboard-glow overflow-hidden rounded-[24px] border border-white/10 p-6 md:p-10 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-5xl">From raw event to clear next action.</h2>
              <p className="mt-5 max-w-md leading-7 text-white/65">
                Every stage keeps the analyst close to the evidence while the system does the heavy lifting in the background.
              </p>
            </div>
            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:mt-1">
              {STEPS.map((step, index) => (
                <div key={step.t} className="border-t border-white/15 pt-4">
                  <div className="text-sm font-medium text-accent">0{index + 1}</div>
                  <h3 className="mt-3 text-base font-semibold text-white">{step.t}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] bg-[#0d0b0f]">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <h2 className="max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-5xl">Built for the teams holding the line.</h2>
            <div className="mt-10 flex flex-wrap gap-2.5">
              {USE_CASES.map((useCase) => (
                <div key={useCase} className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-text">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-primary">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8 lg:px-12">
          <div className="font-display text-lg text-text">Divyachaksu</div>
          <div>Defensive fraud & anomaly detection case study</div>
        </div>
      </footer>
    </div>
  );
}

function Proof({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 sm:block">
      <div className="text-xs uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-0.5 text-base font-semibold tracking-[-0.02em] text-text sm:mt-2">{value}</div>
    </div>
  );
}

function CommandPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[650px] fade-up [animation-delay:120ms]">
      <div className="absolute -inset-5 rounded-[32px] bg-accent/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-[#100e12]/90 p-3 shadow-[0_35px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-2 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent"><Orbit className="h-4 w-4" /></span>
            Command view
          </div>
          <div className="flex items-center gap-2 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" /> Live
          </div>
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-[1.18fr_0.82fr]">
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-[11px] uppercase tracking-[0.13em] text-muted">Anomaly trend</p><p className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-white">+24.8%</p></div>
              <span className="rounded-full bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger">Elevated</span>
            </div>
            <div className="relative mt-7 h-28 overflow-hidden">
              <div className="absolute inset-x-0 top-2 border-t border-white/[0.06]" />
              <div className="absolute inset-x-0 top-1/2 border-t border-white/[0.06]" />
              <div className="absolute inset-x-0 bottom-2 border-t border-white/[0.06]" />
              <svg viewBox="0 0 400 110" className="absolute inset-0 h-full w-full" role="img" aria-label="Illustrative anomaly trend rising over time">
                <defs><linearGradient id="preview-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#D9A7D7" stopOpacity="0.35" /><stop offset="1" stopColor="#D9A7D7" stopOpacity="0" /></linearGradient></defs>
                <path d="M0,89 C30,86 44,72 64,76 S97,98 119,75 S145,65 165,73 S200,94 219,63 S251,50 273,59 S306,34 327,47 S356,73 400,10 L400,110 L0,110 Z" fill="url(#preview-fill)" />
                <path d="M0,89 C30,86 44,72 64,76 S97,98 119,75 S145,65 165,73 S200,94 219,63 S251,50 273,59 S306,34 327,47 S356,73 400,10" fill="none" stroke="#D9A7D7" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <MiniAlert title="Payment anomaly" meta="Score 93 · just now" level="critical" />
            <MiniAlert title="Login spike" meta="Score 81 · 2m ago" level="high" />
            <MiniAlert title="API burst" meta="Score 68 · 4m ago" level="watch" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniAlert({ title, meta, level }) {
  const tone = level === "critical" ? "bg-danger" : level === "high" ? "bg-warning" : "bg-accent";
  return (
    <div className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-3">
      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${tone}`} /><span className="text-xs font-medium text-text">{title}</span></div>
      <p className="mt-1.5 text-[11px] text-muted">{meta}</p>
    </div>
  );
}
