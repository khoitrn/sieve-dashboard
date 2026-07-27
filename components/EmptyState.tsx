"use client";

import { useState } from "react";

export function EmptyState({ owner, repo }: { owner: string; repo: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <section className="panel empty-state">
      <span className="empty-glyph">[ ]</span>
      <h2>{`${owner}/${repo} isn’t running Sieve`}</h2>
      <p>
        No <code className="mono">AGENTS.md</code>{" "}
        found at the root of this repository, so there is no protocol, skill catalog, or
        history to show. This is an honest empty state, not a placeholder — nothing here
        is fabricated when a repo isn&rsquo;t connected.
      </p>
      <div className="cmd-box mono">
        <span>$ npx sievekit init</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText("npx sievekit init").then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
