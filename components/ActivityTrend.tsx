export function ActivityTrend({ buckets }: { buckets: { date: string; count: number }[] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const activeDays = buckets.filter((b) => b.count > 0).length;

  return (
    <section className="panel activity-trend">
      <h2 className="panel-eyebrow">
        Activity <span className="count">&mdash; HISTORY.jsonl events per day, last {buckets.length} days</span>
      </h2>
      {total === 0 ? (
        <p style={{ color: "var(--ink-faint-text)", fontSize: 13 }}>No events in this window.</p>
      ) : (
        <>
          <div className="trend-bars" role="img" aria-label={`${total} events across ${activeDays} of the last ${buckets.length} days`}>
            {buckets.map((b) => (
              <span
                key={b.date}
                className={`trend-bar${b.count > 0 ? " has-events" : ""}`}
                style={{ height: `${Math.max(6, (b.count / max) * 100)}%` }}
                title={`${b.date}: ${b.count} event${b.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
          <p className="trend-summary">
            {total} event{total === 1 ? "" : "s"} across {activeDays} of the last {buckets.length} days
          </p>
        </>
      )}
    </section>
  );
}
