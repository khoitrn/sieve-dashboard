"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { EmptyState } from "@/components/EmptyState";
import { GuardrailsTile } from "@/components/GuardrailsTile";
import { HistoryTail } from "@/components/HistoryTail";
import { RepoPicker } from "@/components/RepoPicker";
import { SkillUsagePanel } from "@/components/SkillUsagePanel";
import { parseOwnerRepo } from "@/lib/github";
import { getRepoSnapshot } from "@/lib/sieve-repo";
import type { RepoSnapshot } from "@/lib/types";

export function Dashboard() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "khoitrn/sieve";
  const parsed = parseOwnerRepo(repoParam) ?? { owner: "khoitrn", repo: "sieve" };

  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const loading = !snapshot || snapshot.owner !== parsed.owner || snapshot.repo !== parsed.repo;

  useEffect(() => {
    let cancelled = false;
    getRepoSnapshot(parsed.owner, parsed.repo).then((result) => {
      if (!cancelled) setSnapshot(result);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed.owner, parsed.repo]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Sieve dashboard</h1>
        <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          A read-only view of any public repo running the Sieve protocol.
        </p>
      </header>

      <RepoPicker current={`${parsed.owner}/${parsed.repo}`} />

      <div
        className="w-fit rounded-full border px-3 py-1 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
      >
        Public GitHub &middot; reads files in your browser, no account
      </div>

      {loading || !snapshot ? (
        <div className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading {parsed.owner}/{parsed.repo}&hellip;
        </div>
      ) : !snapshot.connected ? (
        <EmptyState owner={snapshot.owner} repo={snapshot.repo} />
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
        Sieve is file-based by design &mdash; this dashboard fetches a repo&rsquo;s own{" "}
        <code>AGENTS.md</code>, <code>sieve.index.json</code>, and{" "}
        <code>HISTORY.jsonl</code> straight from GitHub, in your browser, on every
        load. Nothing runs server-side; there is nothing to store.
      </footer>
    </div>
  );
}
