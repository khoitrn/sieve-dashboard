"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import "./dashboard.css";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { EmptyState } from "@/components/EmptyState";
import { HistoryTail } from "@/components/HistoryTail";
import { RepoPicker } from "@/components/RepoPicker";
import { SkillUsagePanel } from "@/components/SkillUsagePanel";
import { StatStrip } from "@/components/StatStrip";
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
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            [<span>&#9642;</span>] SIEVE
          </span>
          <span className="brand-tag">Project visibility</span>
        </div>
        <div className="topbar-right">
          <span className="local-badge">
            <span className="dot good" />
            Public GitHub &middot; reads files in your browser, no account
          </span>
          <RepoPicker current={`${parsed.owner}/${parsed.repo}`} />
        </div>
      </header>

      {loading || !snapshot ? (
        <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          Loading {parsed.owner}/{parsed.repo}&hellip;
        </p>
      ) : !snapshot.connected ? (
        <EmptyState owner={snapshot.owner} repo={snapshot.repo} />
      ) : (
        <>
          <StatStrip
            skills={snapshot.index?.skills ?? []}
            history={snapshot.history}
            staleCount={snapshot.staleCount}
            proposedCount={snapshot.proposedCount}
          />

          <div className="grid-main">
            <SkillUsagePanel skills={snapshot.index?.skills ?? []} history={snapshot.history} />
            <ArchitecturePanel owner={snapshot.owner} repo={snapshot.repo} bridges={snapshot.bridges} />
          </div>

          <HistoryTail history={snapshot.history} />
        </>
      )}

      <p className="meta-footer">
        Live &mdash; nothing is fabricated or wired to a static mock. This dashboard fetches{" "}
        <strong>
          {parsed.owner}/{parsed.repo}
        </strong>
        &rsquo;s own <code className="mono">AGENTS.md</code>, <code className="mono">sieve.index.json</code>, and{" "}
        <code className="mono">HISTORY.jsonl</code> straight from GitHub, in your browser, on every load. Public
        repos only for now; no backend, nothing stored.
      </p>
    </div>
  );
}
