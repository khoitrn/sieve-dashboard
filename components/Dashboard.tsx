"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./dashboard.css";
import { ActivityTrend } from "@/components/ActivityTrend";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { EmptyState } from "@/components/EmptyState";
import { HistoryTail } from "@/components/HistoryTail";
import { RepoPicker } from "@/components/RepoPicker";
import { SkillUsagePanel } from "@/components/SkillUsagePanel";
import { StatStrip } from "@/components/StatStrip";
import { parseOwnerRepo } from "@/lib/github";
import { bucketByDay, fetchHistory, getRepoSnapshot } from "@/lib/sieve-repo";
import type { RepoSnapshot } from "@/lib/types";

const POLL_MS = 90_000;
const TICK_MS = 15_000;
const HIGHLIGHT_MS = 4_000;

function timeAgo(date: Date | null) {
  if (!date) return "not checked yet";
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "updated just now";
  if (secs < 60) return `checked ${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `checked ${mins}m ago`;
}

export function Dashboard() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "khoitrn/sieve";
  const parsed = parseOwnerRepo(repoParam) ?? { owner: "khoitrn", repo: "sieve" };

  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [, forceTick] = useState(0);
  const loading = !snapshot || snapshot.owner !== parsed.owner || snapshot.repo !== parsed.repo;
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let cancelled = false;
    getRepoSnapshot(parsed.owner, parsed.repo).then((result) => {
      if (!cancelled) {
        setSnapshot(result);
        setLastChecked(new Date());
        setNewCount(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [parsed.owner, parsed.repo]);

  async function poll() {
    const current = snapshotRef.current;
    if (!current || !current.connected) return;
    setChecking(true);
    const history = await fetchHistory(current.owner, current.repo);
    setChecking(false);
    setLastChecked(new Date());
    if (!history) return;
    const added = history.length - current.history.length;
    if (added > 0) {
      setSnapshot({ ...current, history });
      setNewCount(added);
      setTimeout(() => setNewCount(0), HIGHLIGHT_MS);
    }
  }

  // Poll HISTORY.jsonl on an interval, paused while the tab is hidden.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (interval) return;
      interval = setInterval(poll, POLL_MS);
    }
    function stop() {
      if (interval) clearInterval(interval);
      interval = null;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        poll();
        start();
      } else {
        stop();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "visible") start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [parsed.owner, parsed.repo]);

  // Cheap re-render tick so "checked Ns ago" stays roughly current between polls.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const trend = snapshot?.connected ? bucketByDay(snapshot.history, 30) : [];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-mark">
            [<span>&#9642;</span>] SIEVE
          </h1>
          <span className="brand-tag">Project visibility</span>
        </div>
        <div className="topbar-right">
          <span className="local-badge">
            <span className="dot good" />
            Public GitHub &middot; reads files in your browser, no account
          </span>
          {snapshot?.connected && (
            <span className="live-status mono" role="status">
              <span className={`dot ${checking ? "info" : "good"}`} aria-hidden="true" />
              {checking ? "checking…" : timeAgo(lastChecked)}
              <button type="button" className="refresh-btn" onClick={poll} aria-label="Refresh now">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          )}
          <RepoPicker current={`${parsed.owner}/${parsed.repo}`} />
        </div>
      </header>

      <main>
        {loading || !snapshot ? (
          <p style={{ color: "var(--ink-faint-text)", fontSize: 13 }}>
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

            <ActivityTrend buckets={trend} />

            <div className="grid-main">
              <SkillUsagePanel
                owner={snapshot.owner}
                repo={snapshot.repo}
                skills={snapshot.index?.skills ?? []}
                history={snapshot.history}
              />
              <ArchitecturePanel
                owner={snapshot.owner}
                repo={snapshot.repo}
                bridges={snapshot.bridges}
                files={snapshot.files}
                skills={snapshot.index?.skills ?? []}
              />
            </div>

            <HistoryTail history={snapshot.history} newCount={newCount} />
          </>
        )}

        <p className="meta-footer">
          Live &mdash; nothing is fabricated or wired to a static mock. This dashboard fetches{" "}
          <strong>
            {parsed.owner}/{parsed.repo}
          </strong>
          &rsquo;s own <code className="mono">AGENTS.md</code>, <code className="mono">sieve.index.json</code>, and{" "}
          <code className="mono">HISTORY.jsonl</code> straight from GitHub, in your browser, on every load, and rechecks{" "}
          <code className="mono">HISTORY.jsonl</code> every 90s while this tab is open. Public repos only for now; no
          backend, nothing stored beyond the repos you&rsquo;ve viewed, kept in this browser only.
        </p>
      </main>
    </div>
  );
}
