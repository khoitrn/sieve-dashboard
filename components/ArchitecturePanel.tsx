import type { Bridge } from "@/lib/types";

const FLOW = ["AGENTS.md", "guardrails / catalog", "agent session", "PROGRESS.md + HISTORY.jsonl"];

export function ArchitecturePanel({ bridges }: { bridges: Bridge[] }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="text-sm font-medium">Protocol flow</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {FLOW.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className="rounded-md border px-2 py-1"
              style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
            >
              {step}
            </span>
            {i < FLOW.length - 1 && <span style={{ color: "var(--ink-muted)" }}>&rarr;</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        Bridged agents ({bridges.length})
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {bridges.map((b) => (
          <span
            key={b.agent}
            title={b.file}
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: "var(--page)", color: "var(--ink-secondary)", border: "1px solid var(--border)" }}
          >
            {b.agent}
          </span>
        ))}
        {bridges.length === 0 && (
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            none detected
          </span>
        )}
      </div>
    </div>
  );
}
