import type { HistoryEvent } from "@/lib/types";

function formatTime(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function HistoryTail({ history, newCount = 0 }: { history: HistoryEvent[]; newCount?: number }) {
  const tail = history.slice(-8).reverse();

  return (
    <section className="panel">
      <h2 className="panel-eyebrow">
        Recent activity <span className="count">&mdash; tail of HISTORY.jsonl</span>
      </h2>
      {tail.length === 0 ? (
        <p style={{ color: "var(--ink-faint-text)", fontSize: 13 }}>No events logged yet.</p>
      ) : (
        <ul className="log-list">
          {tail.map((e, i) => (
            <li key={i} className={`log-row${i < newCount ? " log-row-new" : ""}`}>
              {i < newCount && <span className="sr-only">New: </span>}
              <span className="log-time">{formatTime(e.ts)}</span>
              <span className="log-event">{e.event}</span>
              <span className="log-note">{typeof e.note === "string" ? e.note : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
