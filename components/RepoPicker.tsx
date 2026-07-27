"use client";

import { useState } from "react";

const QUICK_PICKS = ["khoitrn/sieve", "khoitrn/khoitrn-web", "khoitrn/japan-journal"];

export function RepoPicker({ current }: { current: string }) {
  const [value, setValue] = useState(current);

  function go(repo: string) {
    // Plain history.pushState, not router.push: this is a fully static export
    // with no server to resolve an RSC navigation against, so search-param
    // changes stay client-only per Next's documented SPA pattern.
    window.history.pushState(null, "", `/?repo=${encodeURIComponent(repo)}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) go(value.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="owner/repo"
          className="w-64 rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--domain-planning)]"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-primary)" }}
        />
        <button
          type="submit"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: "var(--domain-planning)" }}
        >
          Load
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((r) => (
          <button
            key={r}
            onClick={() => go(r)}
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: "var(--border)",
              color: r === current ? "var(--ink-primary)" : "var(--ink-secondary)",
              background: r === current ? "var(--surface)" : "transparent",
              fontWeight: r === current ? 600 : 400,
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
