import { skillSignal } from "@/lib/sieve-repo";
import type { HistoryEvent, SieveSkill } from "@/lib/types";

const DOMAIN_ORDER = ["planning", "testing", "review", "debugging", "verification"] as const;

const DOMAIN_VAR: Record<string, string> = {
  planning: "var(--domain-planning)",
  testing: "var(--domain-testing)",
  review: "var(--domain-review)",
  debugging: "var(--domain-debugging)",
  verification: "var(--domain-verification)",
};

export function SkillUsagePanel({
  skills,
  history,
}: {
  skills: SieveSkill[];
  history: HistoryEvent[];
}) {
  const sorted = [...skills].sort(
    (a, b) => DOMAIN_ORDER.indexOf(a.category as (typeof DOMAIN_ORDER)[number]) -
      DOMAIN_ORDER.indexOf(b.category as (typeof DOMAIN_ORDER)[number])
  );

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--gridline)" }}>
        <span className="text-sm font-medium">Skills catalog</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--ink-muted)" }}>
          {DOMAIN_ORDER.map((d) => (
            <span key={d} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: DOMAIN_VAR[d] }}
              />
              {d}
            </span>
          ))}
        </div>
      </div>
      <ul>
        {sorted.map((skill) => {
          const { mentionCount, lastMention } = skillSignal(skill, history);
          return (
            <li
              key={skill.name}
              className="flex items-center gap-3 border-l-4 px-4 py-3"
              style={{ borderLeftColor: DOMAIN_VAR[skill.category] ?? "var(--ink-muted)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <TierChip tier={skill.tier} />
                </div>
                <p className="truncate text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {skill.description}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs" style={{ color: "var(--ink-muted)" }}>
                <div title="Count of HISTORY.jsonl lines mentioning this skill's name — not an instrumented usage count, sieve doesn't log per-skill firing yet">
                  {mentionCount} mention{mentionCount === 1 ? "" : "s"}
                </div>
                <div>{lastMention ? new Date(lastMention).toLocaleDateString() : "—"}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TierChip({ tier }: { tier: SieveSkill["tier"] }) {
  if (tier === "guardrail") {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ background: "var(--good)", color: "#fff" }}
      >
        guardrail
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: "var(--page)", color: "var(--ink-secondary)", border: "1px solid var(--border)" }}
    >
      catalog
    </span>
  );
}
