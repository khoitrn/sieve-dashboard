import type { Bridge } from "@/lib/types";

export function ArchitecturePanel({ owner, repo, bridges }: { owner: string; repo: string; bridges: Bridge[] }) {
  return (
    <section className="panel">
      <h2 className="panel-eyebrow">Architecture</h2>
      <div className="diagram">
        <div className="node accent">
          GitHub
          <span className="sub">
            {owner}/{repo}
          </span>
        </div>
        <div className="connector" />
        <div className="node">
          AGENTS.md
          <span className="sub">protocol &middot; source of truth</span>
        </div>
        <div className="branch-bar">
          <svg viewBox="0 0 480 16" preserveAspectRatio="none">
            <path d="M240 0 V8 M120 8 H360 M120 8 V16 M360 8 V16" />
          </svg>
        </div>
        <div className="branch-row">
          <div className="branch-col">
            <div className="node" style={{ fontSize: 11.5 }}>
              Guardrails
              <span className="sub">always active</span>
            </div>
          </div>
          <div className="branch-col">
            <div className="node" style={{ fontSize: 11.5 }}>
              Skill catalog
              <span className="sub">shortlisted per task</span>
            </div>
          </div>
        </div>
        <div className="branch-bar">
          <svg viewBox="0 0 480 16" preserveAspectRatio="none">
            <path d="M120 0 V8 M360 0 V8 M120 8 H360 M240 8 V16" />
          </svg>
        </div>
        <div className="loop-wrap">
          <div className="node accent">
            Agent session
            <span className="sub">this run</span>
          </div>
          <div className="connector" />
          <div className="node">
            PROGRESS.md + HISTORY.jsonl
            <span className="sub">continuity, read next session</span>
          </div>
          <div className="loop-svg" aria-hidden="true">
            <svg viewBox="0 0 34 148" preserveAspectRatio="none">
              <path d="M2 4 H20 a8 8 0 0 1 8 8 V136 a8 8 0 0 1 -8 8 H2" />
            </svg>
          </div>
          <div className="loop-label">loops back to&nbsp;AGENTS.md next session</div>
        </div>
      </div>

      <div className="agent-badges">
        <span className="agent-badges-title">Agent bridges</span>
        {bridges.map((b) => (
          <span key={b.agent} className={`badge${b.active ? " on" : ""}`} title={b.file}>
            <span className={`dot ${b.active ? "good" : "dim"}`} />
            {b.agent}
          </span>
        ))}
        {bridges.length === 0 && <span className="badge">no bridge.mjs found</span>}
      </div>
    </section>
  );
}
