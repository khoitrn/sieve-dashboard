"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkillBody } from "@/components/SkillBody";
import { parseOwnerRepo } from "@/lib/github";
import { getRepoSnapshot } from "@/lib/sieve-repo";
import type { RepoSnapshot, SkillTier } from "@/lib/types";

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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tier, setTier] = useState<SkillTier | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
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
      <AppHeader active="library" current={`${parsed.owner}/${parsed.repo}`} />

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
                &mdash; the full catalog {parsed.owner}/{parsed.repo} ships, browsed apart from usage
              </span>
            </h2>

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
          </section>
        )}
      </main>
    </div>
  );
}
