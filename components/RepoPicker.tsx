"use client";

import { useEffect, useRef, useState } from "react";
import { fetchRaw } from "@/lib/github";

const QUICK_PICKS = ["khoitrn/sieve", "khoitrn/khoitrn-web", "khoitrn/japan-journal"];

function go(repo: string) {
  window.history.pushState(null, "", `/?repo=${encodeURIComponent(repo)}`);
}

export function RepoPicker({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    QUICK_PICKS.forEach((repo) => {
      if (statuses[repo] !== undefined) return;
      const [owner, name] = repo.split("/");
      fetchRaw(owner, name, "AGENTS.md").then((content) => {
        setStatuses((prev) => ({ ...prev, [repo]: content !== null }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="repo-picker" ref={rootRef}>
      <button
        className="repo-trigger mono"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="4.5" cy="3.5" r="2" />
          <circle cx="4.5" cy="12.5" r="2" />
          <circle cx="12" cy="8" r="2" />
          <path d="M4.5 5.5v5" />
          <path d="M4.5 8h5.5a2 2 0 0 0 2-2" />
        </svg>
        <span>{current}</span>
        <svg className="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <ul className="repo-list" role="listbox">
          {QUICK_PICKS.map((repo) => {
            const status = statuses[repo];
            return (
              <li
                key={repo}
                role="option"
                aria-selected={repo === current}
                onClick={() => {
                  go(repo);
                  setOpen(false);
                }}
              >
                <span>{repo}</span>
                <span className="dim">{status === undefined ? "…" : status ? "connected" : "no AGENTS.md"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
