import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { EmptyState } from "@/components/EmptyState";
import { GuardrailsTile } from "@/components/GuardrailsTile";
import { HistoryTail } from "@/components/HistoryTail";
import { RepoPicker } from "@/components/RepoPicker";
import { SkillUsagePanel } from "@/components/SkillUsagePanel";
import { parseOwnerRepo } from "@/lib/github";
import { getRepoSnapshot } from "@/lib/sieve-repo";

export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const { repo: repoParam } = await searchParams;
  const parsed = parseOwnerRepo(repoParam ?? "khoitrn/sieve");
  const { owner, repo } = parsed ?? { owner: "khoitrn", repo: "sieve" };
  const snapshot = await getRepoSnapshot(owner, repo);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Sieve dashboard</h1>
        <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          A read-only view of any public repo running the Sieve protocol.
        </p>
      </header>

      <RepoPicker current={`${owner}/${repo}`} />

      <div
        className="w-fit rounded-full border px-3 py-1 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
      >
        Public GitHub &middot; reads files, no account
      </div>

      {!snapshot.connected ? (
        <EmptyState owner={owner} repo={repo} />
      ) : (
        <>
          {snapshot.progressSummary && (
            <div
              className="rounded-lg border p-4 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-secondary)" }}
            >
              <div className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                Current phase
              </div>
              {snapshot.progressSummary}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_260px]">
            <SkillUsagePanel skills={snapshot.index?.skills ?? []} history={snapshot.history} />
            <div className="flex flex-col gap-6">
              <GuardrailsTile skills={snapshot.index?.skills ?? []} />
              <ArchitecturePanel bridges={snapshot.bridges} />
            </div>
          </div>

          <HistoryTail history={snapshot.history} />
        </>
      )}

      <footer className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        Sieve is file-based by design &mdash; this dashboard reads a repo&rsquo;s own{" "}
        <code>AGENTS.md</code>, <code>sieve.index.json</code>, and{" "}
        <code>HISTORY.jsonl</code> straight from GitHub on every load. Nothing is
        stored here; there is nothing to store.
      </footer>
    </div>
  );
}
