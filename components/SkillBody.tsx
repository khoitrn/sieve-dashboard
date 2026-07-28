"use client";

import { useEffect, useState } from "react";
import { fetchSkillBody } from "@/lib/sieve-repo";
import type { SieveSkill } from "@/lib/types";

type BodyState = "loading" | string | null;

export function SkillBody({ owner, repo, skill }: { owner: string; repo: string; skill: SieveSkill }) {
  const [body, setBody] = useState<BodyState>("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSkillBody(owner, repo, skill).then((result) => {
      if (!cancelled) setBody(result);
    });
    return () => {
      cancelled = true;
    };
  }, [owner, repo, skill]);

  return (
    <div className="skill-body-block">
      <div className="skill-body-head">
        <span className="skill-body-title">Instructions{skill.url ? <span className="dim"> — {skill.url}</span> : null}</span>
        {typeof body === "string" && body && (
          <button
            type="button"
            className="skill-body-copy"
            onClick={() => {
              navigator.clipboard?.writeText(body).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {body === "loading" ? (
        <p className="skill-detail-empty">Loading the real file from GitHub&hellip;</p>
      ) : body === null ? (
        <p className="skill-detail-empty">Couldn&rsquo;t fetch this skill&rsquo;s file from GitHub.</p>
      ) : (
        <pre className="skill-body mono">{body}</pre>
      )}
    </div>
  );
}
