"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import "./dashboard.css";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkillBody } from "@/components/SkillBody";
import { timeAgo } from "@/lib/format";
import { parseOwnerRepo } from "@/lib/github";
import { fetchIndex, getRepoSnapshot } from "@/lib/sieve-repo";
import type { RepoSnapshot, SkillTier } from "@/lib/types";

const POLL_MS = 90_000;
const TICK_MS = 15_000;

const TIERS: SkillTier[] = ["catalog", "guardrail"];

const DOMAIN_ORDER = ["planning", "testing", "review", "debugging", "verification", "maintenance"] as const;

function categoryRank(category: string) {
  const i = DOMAIN_ORDER.indexOf(category as (typeof DOMAIN_ORDER)[number]);
  return i === -1 ? DOMAIN_ORDER.length : i;
}

export function LibraryView() {
  const searchParams = useSearchParams();
  const repoParam = searchParams.get("repo") ?? "khoitrn/sieve";
  const parsed = parseOwnerRepo(repoParam) ?? { owner: "khoitrn", repo: "sieve" };

  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tier, setTier] = useState<SkillTier | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
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
    const index = await fetchIndex(current.owner, current.repo);
    setChecking(false);
    setLastChecked(new Date());
    setSnapshot({ ...current, index });
  }

  // Recheck sieve.index.json on an interval, paused while the tab is hidden —
  // same cadence and pause-on-hide behavior as the Dashboard's HISTORY.jsonl poll.
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

  const skills = useMemo(() => snapshot?.index?.skills ?? [], [snapshot]);
  const categories = useMemo(
    () =>
      Array.from(new Set(skills.map((s) => s.category))).sort((a, b) => categoryRank(a) - categoryRank(b)),
    [skills]
  );

  const filtered = skills
    .filter((s) => (category ? s.category === category : true))
    .filter((s) => (tier ? s.tier === tier : true))
    .filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name));

  return (
    <div className="app">
      <AppHeader active="library" current={`${parsed.owner}/${parsed.repo}`}>
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
      </AppHeader>

      <main>
        {loading || !snapshot ? (
          <p style={{ color: "var(--ink-faint-text)", fontSize: 13 }}>
            Loading {parsed.owner}/{parsed.repo}&hellip;
          </p>
        ) : !snapshot.connected ? (
          <EmptyState owner={snapshot.owner} repo={snapshot.repo} />
        ) : (
          <section className="panel">
            <h2 className="panel-eyebrow">
              Skill library{" "}
              <span className="count">
                &mdash; the full catalog {parsed.owner}/{parsed.repo} ships, browsed apart from usage, rechecked
                every 90s
              </span>
            </h2>

            {skills.length === 0 ? (
              <p className="skill-detail-empty">
                No <code className="mono">sieve.index.json</code> found (or it failed to parse) for {parsed.owner}/
                {parsed.repo} &mdash; there is no catalog here to browse, even though{" "}
                <code className="mono">AGENTS.md</code> exists.
              </p>
            ) : (
              <>
                <div className="lib-toolbar">
                  <input
                    type="text"
                    className="lib-search mono"
                    placeholder="Search name, description, tags…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search the skill library"
                  />
                  <div className="lib-tier-toggle" role="group" aria-label="Filter by tier">
                    <button
                      type="button"
                      className={`lib-tier-btn${tier === null ? " active" : ""}`}
                      onClick={() => setTier(null)}
                    >
                      all
                    </button>
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`lib-tier-btn${tier === t ? " active" : ""}`}
                        onClick={() => setTier(tier === t ? null : t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="lib-filters">
                    <button
                      type="button"
                      className={`lib-chip${category === null ? " active" : ""}`}
                      onClick={() => setCategory(null)}
                    >
                      all &middot; {skills.length}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`lib-chip${category === c ? " active" : ""}`}
                        onClick={() => setCategory(category === c ? null : c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="skill-detail-empty">No skills match this filter.</p>
                ) : (
                  <ul className="skill-rows">
                    {filtered.map((skill) => {
                      const isOpen = expanded === skill.name;
                      const detailId = `lib-detail-${skill.name}`;
                      return (
                        <li key={skill.name} className={`skill-row cat-${skill.category}`}>
                          <button
                            type="button"
                            className="skill-row-toggle lib-row-toggle"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            onClick={() => setExpanded(isOpen ? null : skill.name)}
                          >
                            <div className="lib-row-head">
                              <div className="skill-name-block">
                                <span className="skill-name">{skill.name}</span>
                                <span className="skill-meta">
                                  <span className={`tier-chip ${skill.tier}`}>{skill.tier}</span>
                                  {skill.category}
                                </span>
                              </div>
                              <svg
                                className={`row-chev${isOpen ? " open" : ""}`}
                                width="10"
                                height="10"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                aria-hidden="true"
                              >
                                <path d="M4 6l4 4 4-4" />
                              </svg>
                            </div>
                            <p className="lib-description">{skill.description}</p>
                          </button>

                          {isOpen && (
                            <div id={detailId} className="skill-detail">
                              <SkillBody owner={parsed.owner} repo={parsed.repo} skill={skill} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
