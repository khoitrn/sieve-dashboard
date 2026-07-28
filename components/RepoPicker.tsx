"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchRaw, parseOwnerRepo } from "@/lib/github";

const QUICK_PICKS = ["khoitrn/sieve", "khoitrn/khoitrn-web", "khoitrn/japan-journal"];
const RECENTS_KEY = "sieve-dashboard:recent";
const MAX_RECENTS = 8;

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberRepo(repo: string) {
  if (typeof window === "undefined") return;
  const existing = readRecents().filter((r) => r !== repo);
  const next = [repo, ...existing].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode, quota) — recents just won't persist
  }
}

export function RepoPicker({ current }: { current: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>(() => readRecents());
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = Array.from(new Set([...recents, ...QUICK_PICKS]));

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`repo-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    options.forEach((repo) => {
      if (statuses[repo] !== undefined) return;
      const [owner, name] = repo.split("/");
      fetchRaw(owner, name, "AGENTS.md").then((content) => {
        setStatuses((prev) => ({ ...prev, [repo]: content !== null }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setError(null);
    setActiveIndex(-1);
  }

  function select(repo: string) {
    rememberRepo(repo);
    setRecents(readRecents());
    window.history.pushState(null, "", `${pathname}?repo=${encodeURIComponent(repo)}`);
    close();
  }

  function submitQuery() {
    if (!query.trim()) return;
    const parsed = parseOwnerRepo(query);
    if (!parsed) {
      setError("Enter owner/repo or a github.com URL");
      return;
    }
    select(`${parsed.owner}/${parsed.repo}`);
  }

  // Standard combobox pattern: DOM focus stays on the input the whole time.
  // Arrow keys move a virtual highlight (activeIndex / aria-activedescendant)
  // over the listbox options rather than moving real focus into the list.
  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) select(options[activeIndex]);
      else submitQuery();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="repo-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        className="repo-trigger mono"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <circle cx="4.5" cy="3.5" r="2" />
          <circle cx="4.5" cy="12.5" r="2" />
          <circle cx="12" cy="8" r="2" />
          <path d="M4.5 5.5v5" />
          <path d="M4.5 8h5.5a2 2 0 0 0 2-2" />
        </svg>
        <span>{current}</span>
        <svg className="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="repo-dropdown">
          <div className="repo-search">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="owner/repo or github.com/owner/repo"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
                setActiveIndex(-1);
              }}
              onKeyDown={onInputKeyDown}
              role="combobox"
              aria-expanded={open}
              aria-controls="repo-picker-list"
              aria-activedescendant={activeIndex >= 0 ? `repo-option-${activeIndex}` : undefined}
              aria-label="Enter any public GitHub repo"
            />
            <button type="button" className="repo-search-go" onClick={submitQuery} aria-label="Go to repo">
              Go
            </button>
          </div>
          {error && (
            <p className="repo-error" role="alert">
              {error}
            </p>
          )}
          <ul id="repo-picker-list" className="repo-list" role="listbox" aria-label="Recently viewed repos">
            {options.map((repo, i) => {
              const status = statuses[repo];
              return (
                <li
                  key={repo}
                  id={`repo-option-${i}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={repo === current}
                  className={i === activeIndex ? "active" : undefined}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(repo)}
                >
                  <span>{repo}</span>
                  <span className="dim">{status === undefined ? "…" : status ? "connected" : "no AGENTS.md"}</span>
                </li>
              );
            })}
          </ul>
          <p className="repo-hint">Repos you view are remembered only in this browser. Nothing is sent anywhere.</p>
        </div>
      )}
    </div>
  );
}
