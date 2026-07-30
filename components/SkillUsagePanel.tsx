"use client";

import { useState } from "react";
import { SkillBody } from "@/components/SkillBody";
import { PILLARS, pillarRank } from "@/lib/pillars";
import { bucketByDay, skillMatches } from "@/lib/sieve-repo";
import type { HistoryEvent, SieveSkill } from "@/lib/types";

const SPARK_DAYS = 14;

function formatTime(ts: string) {
  return `${new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" })} · ${new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function SkillUsagePanel({
  owner,
  repo,
  skills,
  history,
}: {
  owner: string;
  repo: string;
  skills: SieveSkill[];
  history: HistoryEvent[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...skills].sort((a, b) => pillarRank(a.category) - pillarRank(b.category));

  const rows = sorted.map((skill) => {
    const matches = skillMatches(skill, history);
    const spark = bucketByDay(matches, SPARK_DAYS);
    return { skill, matches, spark };
  });
  const maxMentions = Math.max(1, ...rows.map((r) => r.matches.length));
  const maxSparkDay = Math.max(1, ...rows.flatMap((r) => r.spark.map((b) => b.count)));

  return (
    <section className="panel">
      <h2 className="panel-eyebrow">
        Skill usage{" "}
        <span className="count">
          &mdash; real mentions in HISTORY.jsonl, {SPARK_DAYS}-day trend, click a skill for the actual instructions
          and evidence
        </span>
      </h2>
      <div className="cat-legend">
        {PILLARS.map((p) => (
          <span key={p.id}>
            <i style={{ background: p.colorVar }} />
            {p.id}
          </span>
        ))}
      </div>
      <ul className="skill-rows">
        {rows.map(({ skill, matches, spark }) => {
          const isGuardrail = skill.tier === "guardrail";
          const isOpen = expanded === skill.name;
          const lastMention = matches.at(-1)?.ts ?? null;
          const detailId = `skill-detail-${skill.name}`;

          return (
            <li key={skill.name} className={`skill-row cat-${skill.category}`}>
              <button
                type="button"
                className="skill-row-toggle"
                aria-expanded={isOpen}
                aria-controls={detailId}
                onClick={() => setExpanded(isOpen ? null : skill.name)}
              >
                <div className="skill-name-block">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-meta">
                    <span className={`tier-chip ${skill.tier}`}>{skill.tier}</span>
                    {skill.category}
                  </span>
                </div>

                <div className="spark" aria-hidden="true">
                  {!isGuardrail &&
                    spark.map((b) => (
                      <span
                        key={b.date}
                        className={`spark-bar${b.count > 0 ? " has-events" : ""}`}
                        style={{ height: `${Math.max(8, (b.count / maxSparkDay) * 100)}%` }}
                      />
                    ))}
                </div>

                <div className="usage-col">
                  <div className="usage-track">
                    <div
                      className={`usage-fill${isGuardrail ? " always" : ""}`}
                      style={isGuardrail ? undefined : { width: `${Math.max(6, (matches.length / maxMentions) * 100)}%` }}
                    />
                  </div>
                  <span className="usage-figure mono">
                    {isGuardrail ? (
                      <>
                        <span className="dot good" aria-hidden="true" style={{ marginRight: 5 }} />
                        always active
                      </>
                    ) : (
                      `${matches.length} mention${matches.length === 1 ? "" : "s"}`
                    )}
                  </span>
                </div>
                <span className="last-used mono">
                  {isGuardrail ? "—" : lastMention ? new Date(lastMention).toLocaleDateString() : "—"}
                </span>
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
              </button>

              {isOpen && (
                <div id={detailId} className="skill-detail">
                  <SkillBody owner={owner} repo={repo} skill={skill} />

                  <span className="skill-body-title skill-detail-evidence-title">Evidence in HISTORY.jsonl</span>
                  {matches.length === 0 ? (
                    <p className="skill-detail-empty">No HISTORY.jsonl event mentions this skill yet.</p>
                  ) : (
                    <ul className="skill-detail-list">
                      {matches
                        .slice()
                        .reverse()
                        .map((e, i) => (
                          <li key={i}>
                            <span className="log-time mono">{formatTime(e.ts)}</span>
                            <span className="log-event">{e.event}</span>
                            <span className="log-note">{typeof e.note === "string" ? e.note : ""}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
