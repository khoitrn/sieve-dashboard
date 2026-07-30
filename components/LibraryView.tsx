"use client";

import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import { AppHeader } from "@/components/AppHeader";
import { getSession, type AuthSession } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { stripFrontmatter } from "@/lib/sieve-repo";
import { listBundles, listSkills } from "@/lib/sieve-registry";
import { OTHER_PILLAR_ID, PILLARS, pillarRank } from "@/lib/pillars";
import type { RegistryBundle, RegistrySkill, SkillTier } from "@/lib/types";

const TIERS: SkillTier[] = ["catalog", "guardrail"];

/** "github:obra/superpowers" -> "obra/superpowers", "custom:khoitrn" -> "your custom skills". */
function sourceLabel(sourceId: string): string {
  if (sourceId.startsWith("github:")) return sourceId.slice("github:".length);
  if (sourceId.startsWith("custom:")) return "your custom skills";
  return sourceId;
}

export function LibraryView() {
  const [session] = useState<AuthSession | null>(() => getSession());
  const [skills, setSkills] = useState<RegistrySkill[] | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tier, setTier] = useState<SkillTier | null>(null);
  const [trust, setTrust] = useState<"validated" | "unverified" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bundles, setBundles] = useState<RegistryBundle[]>([]);
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  function applyResult(result: RegistrySkill[]) {
    setSkills(result);
    setChecking(false);
    setLastChecked(new Date());
  }

  // User-triggered refresh (button click, not an effect) — fine to setState directly.
  function reload() {
    setChecking(true);
    listSkills(session).then(applyResult);
  }

  useEffect(() => {
    let cancelled = false;
    listSkills(session).then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listBundles().then((result) => {
      if (!cancelled) setBundles(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set((skills ?? []).map((s) => s.category))).sort((a, b) => pillarRank(a) - pillarRank(b)),
    [skills],
  );

  const filtered = (skills ?? [])
    .filter((s) => (category ? s.category === category : true))
    .filter((s) => (tier ? s.tier === tier : true))
    .filter((s) => (trust ? (trust === "validated") === s.validated : true))
    .filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        sourceLabel(s.source_id).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => pillarRank(a.category) - pillarRank(b.category) || a.name.localeCompare(b.name));

  // Group into established pillars, in pillar order, plus a final "Other"
  // bucket for anything outside the six (personal skills, whatever a
  // connected source's own directory structure produces) — visibly
  // separated rather than silently interleaved.
  const groups: { id: string; label: string; skills: RegistrySkill[] }[] = [];
  for (const p of PILLARS) {
    const inPillar = filtered.filter((s) => s.category === p.id);
    if (inPillar.length) groups.push({ id: p.id, label: p.label, skills: inPillar });
  }
  const other = filtered.filter((s) => !PILLARS.some((p) => p.id === s.category));
  if (other.length) groups.push({ id: OTHER_PILLAR_ID, label: "Other", skills: other });

  return (
    <div className="app">
      <AppHeader active="library">
        {skills && (
          <span className="live-status mono" role="status">
            <span className={`dot ${checking ? "info" : "good"}`} aria-hidden="true" />
            {checking ? "checking…" : timeAgo(lastChecked)}
            <button type="button" className="refresh-btn" onClick={reload} aria-label="Reload the skill library">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        )}
      </AppHeader>

      <main>
        {bundles.length > 0 && (
          <section className="panel" style={{ marginBottom: 16 }}>
            <h2 className="panel-eyebrow">
              Bundles <span className="count">&mdash; curated groups of skills that work well together</span>
            </h2>
            <ul className="skill-rows">
              {bundles.map((b) => {
                const isOpen = expandedBundle === b.id;
                const detailId = `bundle-detail-${b.id}`;
                const presentCount = skills ? b.skill_names.filter((n) => skills.some((s) => s.name === n)).length : 0;
                return (
                  <li key={b.id} className="skill-row">
                    <button
                      type="button"
                      className="skill-row-toggle lib-row-toggle"
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      onClick={() => setExpandedBundle(isOpen ? null : b.id)}
                    >
                      <div className="lib-row-head">
                        <div className="skill-name-block">
                          <span className="skill-name">{b.name}</span>
                          <span className="skill-meta">
                            {presentCount}/{b.skill_names.length} skill{b.skill_names.length === 1 ? "" : "s"} in your
                            library
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
                      <p className="lib-description">{b.description}</p>
                    </button>
                    {isOpen && (
                      <div id={detailId} className="skill-detail">
                        <ul className="skill-detail-list">
                          {b.skill_names.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!skills ? (
          <p style={{ color: "var(--ink-faint-text)", fontSize: 13 }}>Loading your skill library&hellip;</p>
        ) : (
          <section className="panel">
            <h2 className="panel-eyebrow">
              Skill library{" "}
              <span className="count">
                &mdash; {skills.length} skill{skills.length === 1 ? "" : "s"} available to you: curated sources
                {session ? ", your connected sources, and your custom skills" : ""}
              </span>
            </h2>

            <div className="lib-toolbar">
              <input
                type="text"
                className="lib-search mono"
                placeholder="Search name, description, tags, source…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search the skill library"
              />
              <div className="lib-tier-toggle" role="group" aria-label="Filter by tier">
                <button type="button" className={`lib-tier-btn${tier === null ? " active" : ""}`} onClick={() => setTier(null)}>
                  all
                </button>
                {TIERS.map((t) => (
                  <button key={t} type="button" className={`lib-tier-btn${tier === t ? " active" : ""}`} onClick={() => setTier(tier === t ? null : t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="lib-tier-toggle" role="group" aria-label="Filter by trust">
                <button type="button" className={`lib-tier-btn${trust === null ? " active" : ""}`} onClick={() => setTrust(null)}>
                  all
                </button>
                <button type="button" className={`lib-tier-btn${trust === "validated" ? " active" : ""}`} onClick={() => setTrust(trust === "validated" ? null : "validated")}>
                  validated
                </button>
                <button type="button" className={`lib-tier-btn${trust === "unverified" ? " active" : ""}`} onClick={() => setTrust(trust === "unverified" ? null : "unverified")}>
                  unverified
                </button>
              </div>
              <div className="lib-filters">
                <button type="button" className={`lib-chip${category === null ? " active" : ""}`} onClick={() => setCategory(null)}>
                  all &middot; {skills.length}
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" className={`lib-chip${category === c ? " active" : ""}`} onClick={() => setCategory(category === c ? null : c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="skill-detail-empty">No skills match this filter.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id}>
                  <h3 className="panel-subhead">
                    {group.label} <span className="count">&mdash; {group.skills.length} skill{group.skills.length === 1 ? "" : "s"}</span>
                  </h3>
                  <ul className="skill-rows">
                    {group.skills.map((skill) => {
                      const rowKey = `${skill.source_id}:${skill.name}`;
                      const isOpen = expanded === rowKey;
                      const detailId = `lib-detail-${rowKey}`;
                      return (
                        <li key={rowKey} className={`skill-row cat-${skill.category}`}>
                          <button
                            type="button"
                            className="skill-row-toggle lib-row-toggle"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            onClick={() => setExpanded(isOpen ? null : rowKey)}
                          >
                            <div className="lib-row-head">
                              <div className="skill-name-block">
                                <span className="skill-name">{skill.name}</span>
                                <span className="skill-meta">
                                  <span className={`tier-chip ${skill.tier}`}>{skill.tier}</span>
                                  <span className={`trust-chip ${skill.validated ? "validated" : "unverified"}`}>
                                    {skill.validated ? "validated" : "unverified"}
                                  </span>
                                  {skill.category}
                                  <span className="skill-source-note">from {sourceLabel(skill.source_id)}</span>
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
                              <div className="skill-body-block">
                                <span className="skill-body-title">
                                  Instructions <span className="dim">— from {sourceLabel(skill.source_id)}</span>
                                </span>
                                <pre className="skill-body mono">{stripFrontmatter(skill.body)}</pre>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
