"use client";

import Link from "next/link";
import { AuthMenu } from "@/components/AuthMenu";
import { RepoPicker } from "@/components/RepoPicker";

export function AppHeader({
  active,
  current,
  children,
}: {
  active: "dashboard" | "library" | "sources" | "custom";
  current?: string;
  children?: React.ReactNode;
}) {
  const repoQuery = current ? `?repo=${encodeURIComponent(current)}` : "";

  return (
    <header className="topbar">
      <div className="brand">
        <h1 className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="var(--accent)" />
            <path
              d="M15.8 8.0 C15.6 6.2 10.8 6.8 12 12 C13.2 17.2 8.4 17.8 8.2 16.0"
              fill="none"
              stroke="var(--surface-raised)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          SIEVE
        </h1>
        <span className="brand-tag">Project visibility</span>
      </div>

      <div className="topbar-right">
        <nav className="main-nav" aria-label="Sections">
          <Link href={`/${repoQuery}`} className={`nav-link${active === "dashboard" ? " active" : ""}`}>
            Dashboard
          </Link>
          <Link href="/library" className={`nav-link${active === "library" ? " active" : ""}`}>
            Library
          </Link>
          <Link href="/sources" className={`nav-link${active === "sources" ? " active" : ""}`}>
            Sources
          </Link>
          <Link href="/custom" className={`nav-link${active === "custom" ? " active" : ""}`}>
            Custom
          </Link>
        </nav>
        <AuthMenu />
        {active === "dashboard" && current && (
          <>
            <RepoPicker current={current} />
            <span className="local-badge">
              <span className="dot good" />
              Public GitHub &middot; reads files in your browser, no account
            </span>
          </>
        )}
        {children}
      </div>
    </header>
  );
}
