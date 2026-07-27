import type { SieveSkill } from "@/lib/types";

export function GuardrailsTile({ skills }: { skills: SieveSkill[] }) {
  const guardrails = skills.filter((s) => s.tier === "guardrail");
  const active = guardrails.filter((s) => s.status === "active");
  const intact = active.length === guardrails.length && guardrails.length > 0;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
        Guardrails intact
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold"
          style={{ color: intact ? "var(--good)" : "var(--domain-testing)" }}
        >
          {active.length}/{guardrails.length}
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-0.5 text-xs" style={{ color: "var(--ink-secondary)" }}>
        {guardrails.map((g) => (
          <li key={g.name}>{g.name}</li>
        ))}
      </ul>
    </div>
  );
}
