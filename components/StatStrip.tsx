import type { HistoryEvent, SieveSkill } from "@/lib/types";

function formatTime(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function StatStrip({
  skills,
  history,
  staleCount,
  proposedCount,
}: {
  skills: SieveSkill[];
  history: HistoryEvent[];
  staleCount: number;
  proposedCount: number;
}) {
  const catalogCount = skills.filter((s) => s.tier === "catalog").length;
  const guardrails = skills.filter((s) => s.tier === "guardrail");
  const activeGuardrails = guardrails.filter((s) => s.status === "active");
  const healthy = staleCount === 0 && proposedCount === 0;
  const lastEvent = history.at(-1);

  return (
    <section className="stat-strip">
      <div className="stat">
        <span className="stat-label">Skills</span>
        <span className="stat-value mono">{String(skills.length).padStart(2, "0")}</span>
        <span className="stat-sub">
          {catalogCount} catalog &middot; {guardrails.length} guardrail
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Catalog health</span>
        <span className="stat-value">
          <span className={`dot ${healthy ? "good" : "dim"}`} aria-hidden="true" />
          {healthy ? "Healthy" : "Needs triage"}
        </span>
        <span className="stat-sub">
          {staleCount} stale &middot; {proposedCount} proposed
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Guardrails intact</span>
        <span className="stat-value mono">
          <span
            className={`dot ${activeGuardrails.length === guardrails.length ? "good" : "dim"}`}
            aria-hidden="true"
          />
          {activeGuardrails.length} / {guardrails.length}
        </span>
        <span className="stat-sub">{guardrails.map((g) => g.name).join(" · ")}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Last event</span>
        <span className="stat-value mono" style={{ fontSize: 15 }}>
          {lastEvent?.event ?? "—"}
        </span>
        <span className="stat-sub">{lastEvent ? formatTime(lastEvent.ts) : "no events yet"}</span>
      </div>
    </section>
  );
}
