import { skillSignal } from "@/lib/sieve-repo";
import type { HistoryEvent, SieveSkill } from "@/lib/types";

const DOMAIN_ORDER = ["planning", "testing", "review", "debugging", "verification"] as const;

const DOMAIN_VAR: Record<(typeof DOMAIN_ORDER)[number], string> = {
  planning: "var(--cat-planning)",
  testing: "var(--cat-testing)",
  review: "var(--info)",
  debugging: "var(--cat-debugging)",
  verification: "var(--cat-verification)",
};

export function SkillUsagePanel({
  skills,
  history,
}: {
  skills: SieveSkill[];
  history: HistoryEvent[];
}) {
  const sorted = [...skills].sort(
    (a, b) =>
      DOMAIN_ORDER.indexOf(a.category as (typeof DOMAIN_ORDER)[number]) -
      DOMAIN_ORDER.indexOf(b.category as (typeof DOMAIN_ORDER)[number])
  );

  const signals = sorted.map((skill) => ({ skill, ...skillSignal(skill, history) }));
  const maxMentions = Math.max(1, ...signals.map((s) => s.mentionCount));

  return (
    <section className="panel">
      <h2 className="panel-eyebrow">
        Skill usage <span className="count">&mdash; real mentions in HISTORY.jsonl, not instrumented telemetry</span>
      </h2>
      <div className="cat-legend">
        {DOMAIN_ORDER.map((d) => (
          <span key={d}>
            <i style={{ background: DOMAIN_VAR[d] }} />
            {d}
          </span>
        ))}
      </div>
      <ul className="skill-rows">
        {signals.map(({ skill, mentionCount, lastMention }) => {
          const isGuardrail = skill.tier === "guardrail";
          return (
            <li key={skill.name} className={`skill-row cat-${skill.category}`}>
              <div className="skill-name-block">
                <span className="skill-name">{skill.name}</span>
                <span className="skill-meta">
                  <span className={`tier-chip ${skill.tier}`}>{skill.tier}</span>
                  {skill.category}
                </span>
              </div>
              <div className="usage-col">
                <div className="usage-track">
                  <div
                    className={`usage-fill${isGuardrail ? " always" : ""}`}
                    style={isGuardrail ? undefined : { width: `${Math.max(6, (mentionCount / maxMentions) * 100)}%` }}
                  />
                </div>
                <span className="usage-figure mono">
                  {isGuardrail ? (
                    <>
                      <span className="dot good" style={{ marginRight: 5 }} />
                      always active
                    </>
                  ) : (
                    `${mentionCount} mention${mentionCount === 1 ? "" : "s"}`
                  )}
                </span>
              </div>
              <span className="last-used mono">
                {isGuardrail ? "—" : lastMention ? new Date(lastMention).toLocaleDateString() : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
