export function EmptyState({ owner, repo }: { owner: string; repo: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border p-12 text-center"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="text-sm font-medium" style={{ color: "var(--ink-primary)" }}>
        {`${owner}/${repo} isn’t running Sieve`}
      </div>
      <p className="max-w-md text-sm" style={{ color: "var(--ink-secondary)" }}>
        No <code>AGENTS.md</code>{" "}
        found on the default branch. This is an honest empty state, not a
        placeholder — nothing here is fabricated when a repo isn&rsquo;t connected.
      </p>
      <code
        className="mt-2 rounded px-3 py-2 text-xs"
        style={{ background: "var(--page)", color: "var(--ink-secondary)" }}
      >
        npx sievekit init
      </code>
    </div>
  );
}
