import type { HistoryEvent } from "@/lib/types";

export function HistoryTail({ history }: { history: HistoryEvent[] }) {
  const tail = history.slice(-8).reverse();

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="text-sm font-medium">HISTORY.jsonl (latest)</div>
      {tail.length === 0 ? (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          No events logged yet.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {tail.map((e, i) => (
            <li key={i} className="text-xs" style={{ color: "var(--ink-secondary)" }}>
              <span className="font-mono" style={{ color: "var(--ink-muted)" }}>
                {new Date(e.ts).toLocaleString()}
              </span>{" "}
              <span className="font-medium" style={{ color: "var(--ink-primary)" }}>
                {e.event}
              </span>
              {typeof e.note === "string" && <span> — {e.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
